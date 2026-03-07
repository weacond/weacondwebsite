"use client"

import { useState } from "react"

export default function Navbar() {

  const [lang,setLang] = useState("zh")

  return (
    <div className="w-full border-b border-slate-700 p-4 flex justify-end">

      <button
        className="mr-3"
        onClick={()=>setLang("zh")}
      >
        中文
      </button>

      <button
        onClick={()=>setLang("en")}
      >
        English
      </button>

    </div>
  )
}
