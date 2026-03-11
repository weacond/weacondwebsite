"use client";

import Navbar from "../components/Navbar";
import Sidebar from "../components/Sidebar";
import { useState } from "react";

export default function RootLayout({ children }: { children: React.ReactNode }) {
  const [lang, setLang] = useState<"cn" | "en">("cn");

  const toggleLang = () => setLang(lang === "cn" ? "en" : "cn");

  return (
    <html lang={lang}>
      <body className="flex">
        <Sidebar />
        <div className="flex-1">
          <Navbar toggleLang={toggleLang} lang={lang} />
          <main>{children}</main>
        </div>
      </body>
    </html>
  );
}
