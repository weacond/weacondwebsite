import "../styles/globals.css";
import { LanguageProvider } from "../contexts/LanguageContext";
import ErrorBoundary from "../components/ErrorBoundary";
import { useRouter } from "next/router";
import { useEffect } from "react";
import Head from "next/head";
import { track } from "../lib/analytics";

export default function App({ Component, pageProps }) {
  const router = useRouter();

  // PWA + Web Push registration
  useEffect(() => {
    if (
      "serviceWorker" in navigator &&
      process.env.NEXT_PUBLIC_USE_WEB_PUSH === "true"
    ) {
      navigator.serviceWorker.register("/sw.js").catch(() => {});
    }
  }, []);

  // 轻量事件埋点：路由变化时上报 page_view（尊重 DNT，无采集器时静默）
  useEffect(() => {
    if (typeof window === "undefined") return;
    const dnt =
      navigator.doNotTrack === "1" ||
      navigator.doNotTrack === "yes";
    const payload = track("page_view", { path: router.pathname }, {
      dnt,
      url: router.asPath,
      now: () => Date.now(),
    });
    if (payload) {
      if (window.dataLayer) window.dataLayer.push(payload);
      if (process.env.NODE_ENV === "development") console.debug("[analytics]", payload.event);
    }
  }, [router.pathname, router.asPath]);


  return (
    <LanguageProvider>
      <Head>
        <link rel="manifest" href="/manifest.json" />
        <meta name="theme-color" content="#4f46e5" />
        <meta name="apple-mobile-web-app-capable" content="yes" />
        <meta name="apple-mobile-web-app-status-bar-style" content="black-translucent" />
        <meta name="apple-mobile-web-app-title" content="Weacond" />
        <link rel="apple-touch-icon" href="/icons/icon-192.png" />
      </Head>
      <ErrorBoundary>
        <Component {...pageProps} />
      </ErrorBoundary>
    </LanguageProvider>
  );
}
