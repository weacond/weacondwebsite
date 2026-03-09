import Navbar from "../components/Navbar";
import Sidebar from "../components/Sidebar";
import { useState } from "react";

export default function Home() {
  const [lang, setLang] = useState<"CN" | "EN">("CN");

  return (
    <div className="flex min-h-screen">
      <Sidebar />
      <div className="flex-1">
        <Navbar toggleLang={() => setLang(lang === "CN" ? "EN" : "CN")} />
        <main className="flex flex-col items-center justify-center py-20 gap-8">
          <h1 className="text-5xl font-bold">Weacond</h1>
          <p className="text-xl text-center">{lang === "CN" ? "我们的理念" : "Our Philosophy"}</p>
          <p className="text-lg text-center">{lang === "CN" ? "我们是做什么的" : "What We Do"}</p>
          <p className="text-sm text-center">{lang === "CN" ? "联系方式: xxx" : "Contact: xxx"}</p>
          <a href="/library" className="bg-blue-500 text-white px-6 py-3 rounded">我的业务</a>
        </main>
      </div>
    </div>
  );
}
