// lib/edge-res.js — 把"Node 风格 res.status().json() / .send() / .setHeader() / .redirect()"
// 的 Next.js API handler，包装成 Cloudflare Edge 可运行、返回 Web 标准 new Response 的 handler。
//
// 为什么需要它：
//   next-on-pages 把路由部署到 Cloudflare Workers 时，handler 实际收到的 res 不可靠（可能为
//   undefined 或 Cloudflare 自有对象，调用 .status().json() 会抛错）→ 整站 API 路由 500。
//   项目内能跑通的路由（signals.js / sitemap.js）用的是 `return new Response(...)`。
//   本包装器让现有路由【业务逻辑一行不改】，仅在导出处包一层 toEdge：
//   用内部 fake res 累积 status/headers/body，最终转成 new Response 返回。
//
// 关键设计（让既有测试无需改动即继续通过）：
//   fake res 在累积结果的同时，把 status/body/headers「镜像」回 handler 传入的那个 res
//   （生产 Cloudflare 下真实 res 不支持这些写入，用 safe() try/catch 静默忽略，不影响返回值；
//    测试里传入的是 makeRes mock，镜像成功 → 既有 res.statusCode / res.body / res.headers
//    断言照常成立）。同时仍返回 new Response（这才是 Cloudflare 真正使用的响应）。
//
// 用法（每个需要修复的路由改 2 行）：
//   1) 顶部把  export const runtime = "edge";
//      换成    export const config = { runtime: "edge" };
//              import { toEdge } from "../../lib/edge-res.js";
//              export default toEdge(handler);
//   2) 把      export default async function handler(req, res) {
//      改成     async function handler(req, res) {   （去掉 export default，函数声明被提升）
//   handler 内部仍可继续用 res.status().json() / res.setHeader() / res.redirect() 等旧写法。

// 安全执行：镜像到传入 res 时，生产 Cloudflare 下可能抛错，静默忽略，绝不影响返回的 new Response。
function safe(fn) {
  try {
    fn();
  } catch (_e) {
    /* 镜像失败不影响最终响应（Cloudflare 用返回的 new Response，不用传入的 res）*/
  }
}

export function toEdge(handler) {
  return async (req, passedRes) => {
    // 内部 fake res：在 Cloudflare edge 下用（真实 res 不可靠）。
    // 累积 _status / _body / _headers，并镜像回 passedRes（若是 Node 风格 mock，如测试）。
    const fake = {
      _status: 200,
      _body: null,
      _isText: false,
      _headers: {},
      setHeader(k, v) {
        fake._headers[k] = v;
        safe(() => {
          passedRes.headers[k] = v;
        });
        return fake;
      },
      setHeaders(o) {
        Object.assign(fake._headers, o || {});
        safe(() => {
          Object.assign(passedRes.headers, o || {});
        });
        return fake;
      },
      status(c) {
        fake._status = c;
        safe(() => {
          passedRes.statusCode = c;
        });
        return fake;
      },
      json(o) {
        fake._body = o;
        fake._isText = false;
        if (!fake._headers["Content-Type"] && !fake._headers["content-type"]) {
          fake._headers["Content-Type"] = "application/json; charset=utf-8";
        }
        safe(() => {
          passedRes.body = o;
          passedRes.headers["Content-Type"] = "application/json; charset=utf-8";
        });
        return fake;
      },
      send(t) {
        fake._body = t;
        fake._isText = true;
        safe(() => {
          passedRes.body = t;
        });
        return fake;
      },
      redirect(code, loc) {
        fake._status = code;
        fake._headers["Location"] = loc;
        safe(() => {
          passedRes.statusCode = code;
          passedRes.redirectLocation = loc;
        });
        return fake;
      },
      end(t) {
        if (t !== undefined && t !== null) {
          fake._body = t;
          fake._isText = true;
        }
        safe(() => {
          if (typeof passedRes.end === "function") passedRes.end(t);
        });
        return fake;
      },
      get statusCode() {
        return fake._status;
      },
      set statusCode(v) {
        fake._status = v;
      },
    };

    const ret = await handler(req, fake);

    // handler 已自行返回 Web 标准 Response（新写法，如 health/signals/sitemap）则直接采用。
    if (ret instanceof Response) return ret;

    // 用 fake 累积的状态构建 new Response（Cloudflare 实际使用的响应）。
    const status = fake._status;
    const headers = { ...fake._headers };
    // 无体状态码（204/205/304）：Cloudflare 对带 body 会报错，强制不带 body。
    if (status === 204 || status === 205 || status === 304) {
      return new Response(null, { status, headers });
    }
    const bodyStr =
      fake._body === null || fake._body === undefined
        ? null
        : fake._isText
        ? fake._body
        : JSON.stringify(fake._body);
    return new Response(bodyStr, { status, headers });
  };
}

export default toEdge;