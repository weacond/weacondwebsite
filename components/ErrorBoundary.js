import { Component } from "react";
import Link from "next/link";

// 客户端错误上报（fire-and-forget）
// 设计要点：
//   - 节流：5s 内同一会话最多 1 条，避免异常风暴刷屏 / 打爆 /api/errors 限流。
//   - 防循环：在 componentDidCatch 内调用，只发 fetch、不触发重渲染，故不会再次抛错。
//   - 失败静默：上报本身出错不影响用户（catch 吞掉）。
//   - 无敏感信息：只发 message/stack/url/ua，不发 cookie/token。
let lastReport = 0;
function reportClientError(error, componentStack) {
  if (typeof fetch === "undefined") return; // 仅浏览器（componentDidCatch 本就只在客户端触发）
  const now = Date.now();
  if (now - lastReport < 5000) return;
  lastReport = now;
  const payload = {
    message: error && error.message ? error.message : String(error),
    stack: error && error.stack ? error.stack : "",
    componentStack: componentStack || "",
    url: typeof location !== "undefined" ? location.href : "",
    ua: typeof navigator !== "undefined" ? navigator.userAgent : "",
  };
  fetch("/api/errors", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload),
    keepalive: true, // 允许在页面卸载/导航后完成发送
  }).catch(() => {
    /* 上报失败忽略，绝不影响用户体验 */
  });
}

// 全局错误边界 — 捕获任意子树的渲染/生命周期异常，避免整站白屏。
// 放在 LanguageProvider 内层、Component 外层；语言用 navigator 探测，避免与 Context 耦合。
export default class ErrorBoundary extends Component {
  constructor(props) {
    super(props);
    this.state = { hasError: false, error: null };
  }

  static getDerivedStateFromError(error) {
    return { hasError: true, error };
  }

  componentDidCatch(error, info) {
    // 开发环境打印堆栈；生产环境 fire-and-forget 上报到 /api/errors（Cloudflare Logs / 外部监控）
    console.error("[ErrorBoundary] 捕获到渲染异常:", error, info && info.componentStack);
    reportClientError(error, info && info.componentStack);
  }

  render() {
    if (!this.state.hasError) return this.props.children;
    const en = typeof navigator !== "undefined" && navigator.language.startsWith("en");
    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center px-4 py-12">
        <div className="max-w-md w-full text-center bg-white rounded-2xl p-8 shadow-sm border border-slate-100">
          <div className="text-4xl mb-4">⚠️</div>
          <h1 className="text-lg font-bold mb-2">{en ? "Something went wrong" : "出了点问题"}</h1>
          <p className="text-sm text-slate-500 mb-6">
            {en
              ? "An unexpected error occurred. Your data is safe — reload to continue."
              : "发生了一个意外错误。你的数据是安全的，重载即可继续。"}
          </p>
          <div className="flex gap-3 justify-center">
            <button
              onClick={() => window.location.reload()}
              className="px-4 py-2 bg-indigo-600 text-white rounded-lg text-sm hover:bg-indigo-700 transition-colors"
            >
              {en ? "Reload" : "重新加载"}
            </button>
            <Link
              href="/"
              className="px-4 py-2 border border-slate-200 text-slate-600 rounded-lg text-sm hover:bg-slate-50 transition-colors"
            >
              {en ? "Home" : "返回首页"}
            </Link>
          </div>
        </div>
      </div>
    );
  }
}