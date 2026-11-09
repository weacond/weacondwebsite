import { Component } from "react";
import Link from "next/link";

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
    // 开发环境打印堆栈；生产环境可在此上报到错误监控（Sentry 等）
    console.error("[ErrorBoundary] 捕获到渲染异常:", error, info && info.componentStack);
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