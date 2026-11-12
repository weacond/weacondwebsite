"use client";

// components/LocaleAlias.js — 语言别名页：落地后设置语言并重定向到首页。
// 供 /zh、/en 等语言前缀路由复用；非法前缀也安全重定向到首页。
import { useEffect } from "react";
import { useRouter } from "next/router";
import { useLanguage } from "../contexts/LanguageContext";
import { normalizeLocale, aliasRedirectTarget } from "../lib/locales";

export default function LocaleAlias({ locale }) {
  const { setLang } = useLanguage();
  const router = useRouter();

  useEffect(() => {
    const l = normalizeLocale(locale);
    if (!l) {
      router.replace(aliasRedirectTarget());
      return;
    }
    // 直接写入持久化 key，避免与 Provider 的 effect 竞态
    if (typeof window !== "undefined") {
      try {
        window.localStorage.setItem("weacond_lang", l);
      } catch (e) {
        /* localStorage 不可用时忽略 */
      }
    }
    setLang(l);
    router.replace(aliasRedirectTarget());
  }, [locale, router, setLang]);

  return null;
}
