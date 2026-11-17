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

// ---------------------------------------------------------------------------
// readJsonBody(req) — 跨环境读取并解析 JSON 请求体
// ---------------------------------------------------------------------------
// 问题：Cloudflare Edge 的 Request.body 是 ReadableStream（Web 标准），
//   而老路由按 Node/Next 风格直接 `const { x } = req.body` 解构，在 Edge 下
//   解构出一个流 → 全 undefined → 误判「缺参」→ 400/错响应（功能不可用）。
//   测试里传入的 req 又是「已解析对象」(req.body === {...})。
// 本助手同时兼容两种环境，返回解析后的对象；解析失败返回 {}（由各路由自身校验兜底）：
//   - Web 标准（Cloudflare / 浏览器 fetch）：req.json() 存在 → 用之（流只能读一次）。
//   - Node / Next / 测试 mock：req.body 已是对象或字符串 → 直接用 / parse。
//
// 用法（5 个 Node 风格路由各改 1 行）：
//   - const { a, b } = req.body;                 →  const { a, b } = await readJsonBody(req);
//   - const body = req.body || {};              →  const body = await readJsonBody(req);
//   - body = typeof req.body==="string" ? JSON.parse(req.body) : req.body || {}  →  const body = await readJsonBody(req);
// 注意：ai/errors/mcp 已用 `await req.json()` 并靠其抛错检测「非法 JSON」，
//   故保持不动（不要换成 readJsonBody，否则会吞掉非法 JSON 的 400 分支）。
export async function readJsonBody(req) {
  if (!req) return {};
  // Web 标准 Request（Cloudflare / 浏览器）：有 .json() 方法 → 用之解析流
  if (typeof req.json === "function") {
    try {
      const j = await req.json();
      return j && typeof j === "object" ? j : {};
    } catch {
      return {};
    }
  }
  // Node / Next / 测试 mock：req.body 是已解析对象或原始字符串
  const b = req.body;
  if (b === undefined || b === null) return {};
  if (typeof b === "string") {
    try {
      return JSON.parse(b);
    } catch {
      return {};
    }
  }
  if (typeof b === "object") return b;
  return {};
}