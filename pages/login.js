import { getSupabaseClient } from "../lib/supabase";

/**
 * 登录页面 — 使用 Supabase Auth
 * 邮箱 + 密码（简单模式），未来可加 OAuth
 */
import Navbar from "../components/Navbar";
import { useLanguage } from "../contexts/LanguageContext";
import { useState } from "react";
import Head from "next/head";
import { useRouter } from "next/router";

export const metadata = {
  title: "登录 — Weacond",
  robots: { index: false },
};

export default function LoginPage() {
  const { lang } = useLanguage();
  const L = lang === "en" ? en : zh;
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  const handleLogin = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError("");

    const client = getSupabaseClient();
    if (!client) {
      // Supabase 未配置时的降级：localStorage 模拟登录
      localStorage.setItem("weacond_user", JSON.stringify({
        email,
        name: email.split("@")[0],
        plan: "free",
      }));
      router.push("/dashboard");
      return;
    }

    try {
      const { data, error: supaErr } = await client.auth.signInWithPassword({
        email,
        password,
      });
      if (supaErr) throw supaErr;
      router.push("/dashboard");
    } catch (err) {
      setError(err.message || L.loginFailed);
    } finally {
      setLoading(false);
    }
  };

  const handleSignup = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError("");

    const client = getSupabaseClient();
    if (!client) {
      localStorage.setItem("weacond_user", JSON.stringify({
        email,
        name: email.split("@")[0],
        plan: "free",
        trialStart: new Date().toISOString(),
        trialEnd: new Date(Date.now() + 3 * 86400000).toISOString(),
      }));
      router.push("/dashboard");
      return;
    }

    try {
      const { data, error: supaErr } = await client.auth.signUp({
        email,
        password,
        options: {
          data: { name: email.split("@")[0] },
        },
      });
      if (supaErr) throw supaErr;
      router.push("/dashboard");
    } catch (err) {
      setError(err.message || L.signupFailed);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-slate-50 flex items-center justify-center px-4">
      <Head>
        <title>{L.title}</title>
      </Head>
      <Navbar />
      <div className="w-full max-w-md mt-24">
        <div className="bg-white rounded-2xl shadow-lg border border-slate-100 p-8">
          <h1 className="text-2xl font-bold text-center mb-2">{L.title}</h1>
          <p className="text-center text-slate-500 text-sm mb-6">{L.subtitle}</p>

          {error && (
            <div className="bg-red-50 text-red-700 text-sm px-4 py-3 rounded-lg mb-4">
              {error}
            </div>
          )}

          <form onSubmit={handleLogin} className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">
                {L.email}
              </label>
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
                className="w-full px-4 py-2.5 border border-slate-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 text-sm"
                placeholder="you@example.com"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">
                {L.password}
              </label>
              <input
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
                className="w-full px-4 py-2.5 border border-slate-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 text-sm"
                placeholder="••••••••"
              />
            </div>
            <button
              type="submit"
              disabled={loading}
              className="w-full bg-indigo-600 hover:bg-indigo-500 text-white font-semibold py-2.5 rounded-lg transition-colors disabled:opacity-50"
            >
              {loading ? L.loading : L.login}
            </button>
          </form>

          <div className="my-4 flex items-center">
            <div className="flex-1 border-t border-slate-200" />
            <span className="px-3 text-xs text-slate-400">{L.or}</span>
            <div className="flex-1 border-t border-slate-200" />
          </div>

          <form onSubmit={handleSignup} className="space-y-4">
            <button
              type="submit"
              disabled={loading}
              className="w-full bg-white hover:bg-slate-50 text-indigo-600 font-semibold py-2.5 rounded-lg border border-indigo-200 transition-colors disabled:opacity-50"
            >
              {L.signup}
            </button>
          </form>

          <p className="mt-6 text-center text-xs text-slate-400">
            {L.trialNote}
          </p>
        </div>
      </div>
    </div>
  );
}

const zh = {
  title: "登录 Weacond",
  subtitle: "登录后获取 3 天高级体验",
  email: "邮箱",
  password: "密码",
  login: "登录",
  signup: "注册新账户",
  or: "或",
  trialNote: "注册即享 3 天免费体验高级功能",
  loginFailed: "登录失败，请检查邮箱和密码",
  signupFailed: "注册失败，邮箱可能已注册",
  loading: "处理中...",
};

const en = {
  title: "Sign In to Weacond",
  subtitle: "Sign in to get 3 days of premium trial",
  email: "Email",
  password: "Password",
  login: "Sign In",
  signup: "Create Account",
  or: "or",
  trialNote: "New users get 3 days free premium trial",
  loginFailed: "Login failed. Check your email and password.",
  signupFailed: "Sign up failed. Email may already be registered.",
  loading: "Processing...",
};