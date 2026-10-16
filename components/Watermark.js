/**
 * Watermark — 半透明水印，防止截图/爬虫
 * 显示用户标识（邮箱或 session ID），旋转 30 度，平铺覆盖
 */
import { useEffect, useState } from "react";

export default function Watermark({ text, className = "" }) {
  const [sessionText, setSessionText] = useState("");

  useEffect(() => {
    // 尝试获取用户邮箱（Supabase session）
    let id = sessionText;
    try {
      const email = localStorage.getItem("weacond_email");
      if (email) {
        id = email;
      } else {
        // 生成 session ID
        let sid = localStorage.getItem("weacond_session_id");
        if (!sid) {
          sid = Math.random().toString(36).slice(2, 10).toUpperCase();
          localStorage.setItem("weacond_session_id", sid);
        }
        id = `ID: ${sid}`;
      }
      setSessionText(id);
    } catch {
      setSessionText("weacond.com");
    }
  }, [sessionText]);

  if (!sessionText) return null;

  // 生成平铺水印
  const tiles = [];
  for (let row = 0; row < 12; row++) {
    for (let col = 0; col < 6; col++) {
      tiles.push(
        <span
          key={`${row}-${col}`}
          className="absolute text-xs text-black/5 font-mono whitespace-nowrap select-none"
          style={{
            top: `${row * 120 + 20}px`,
            left: `${col * 200 + (row % 2 === 0 ? 0 : 100)}px`,
            transform: "rotate(-30deg)",
          }}
        >
          {sessionText} · weacond.com
        </span>
      );
    }
  }

  return (
    <div
      aria-hidden="true"
      className={`pointer-events-none fixed inset-0 z-[9997] overflow-hidden ${className}`}
    >
      {tiles}
    </div>
  );
}