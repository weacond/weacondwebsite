import "../styles/globals.css";
import { LanguageProvider } from "../contexts/LanguageContext";
import { useRouter } from "next/router";
import { useEffect } from "react";
import Head from "next/head";

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
      <Component {...pageProps} />
    </LanguageProvider>
  );
}
