import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/router";
import Link from "next/link";
import { getSupabaseClient } from "../../lib/supabase";

/**
 * OAuth 回调页：第三方登录（Google/GitHub/Apple）授权后回到此页。
 * supabase-js 在创建 client 时会自动用 URL 上的 ?code=&state= 换取 session
 * （见 lib/supabase.js 的 getSupabaseClient）。本页只需读取会话并跳转。
 *
 * 优雅降级：未配置 Supabase（getSupabaseClient 返回 null）时直接回登录页，
 * 不在未配置环境产生错误。
 */
export default function AuthCallback() {
  const router = useRouter();
  const [error, setError] = useState("");
  const started = useRef(false);

  useEffect(() => {
    if (started.current) return; // 严格模式下防重复执行
    started.current = true;
    const client = getSupabaseClient();
    if (!client) {
      // 未配置 Supabase：无法完成 OAuth，回登录页
      router.replace("/login");
      return;
    }
    const q = new URLSearchParams(window.location.search);
    if (q.get("error_description")) {
      setError(q.get("error_description"));
      return;
    }
    client
      .getSession()
      .then(({ data, error: sessErr }) => {
        if (started.current === false) return;
        if (sessErr) {
          setError(sessErr.message || "session exchange failed");
          return;
        }
        // 清掉 URL 上的 code/state，避免刷新时重复换取
        window.history.replaceState({}, document.title, "/auth/callback");
        if (data?.session) router.replace("/dashboard");
      })
      .catch((e) => setError(e.message || "unknown error"));
    // 兜底：8s 内没拿到 session（异常/超时）则回登录页
    const timer = setTimeout(() => router.replace("/login"), 8000);
    return () => {
      started.current = false;
      clearTimeout(timer);
    };
  }, [router]);

  return (
    <div className="min-h-screen flex items-center justify-center bg-slate-50 px-4">
      <div className="text-center max-w-sm">
        <div className="text-2xl font-bold text-slate-800 mb-4">Weacond</div>
        {error ? (
          <>
            <div className="text-red-600 text-sm font-medium mb-4">
              登录未完成：{error}
            </div>
            <Link href="/login" className="text-indigo-600 underline text-sm">
              返回登录
            </Link>
          </>
        ) : (
          <div className="text-slate-600 text-sm flex items-center justify-center gap-2">
            <span className="inline-block w-4 h-4 border-2 border-slate-300 border-t-indigo-600 rounded-full animate-spin" />
            正在完成登录，请稍候…
          </div>
        )}
      </div>
    </div>
  );
}