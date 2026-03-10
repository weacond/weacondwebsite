"use client"

import { useState } from "react"

export default function Navbar() {

  const [lang,setLang] = useState("CN")

  function toggleLang(){
    setLang(lang === "CN" ? "EN" : "CN")
  }

  return (

    <nav className="flex justify-between items-center p-4 bg-slate-800">

      <div className="text-xl font-bold">
        Weacond
      </div>

      <button
        onClick={toggleLang}
        className="bg-gray-700 px-3 py-1 rounded"
      >
        {lang}
      </button>

    </nav>

  )
}
