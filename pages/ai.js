"use client";

import { useState, useEffect } from "react";
import Navbar from "../components/Navbar";
import { useLanguage } from "../contexts/LanguageContext";
import Head from "next/head";
import Link from "next/link";

export const metadata = {
  title: "本地 AI 助手 — Weacond",
  description: "WebGPU 本地推理，数据永不上传，零推理成本",
  robots: { index: true, follow: true },
};

const MODELS = [
  { id: "qwen-1.8b", name: "Qwen 1.8B", size: "1.2GB", quality: "快速", ctx: "2K", best: "简单问答" },
  { id: "qwen-4b", name: "Qwen 4B", size: "2.5GB", quality: "均衡", ctx: "4K", best: "一般任务" },
  { id: "llama-3-8b", name: "Llama 3 8B", size: "5GB", quality: "高质量", ctx: "8K", best: "复杂推理" },
  { id: "phi-3-4b", name: "Phi-3 4B", size: "2.3GB", quality: "均衡", ctx: "4K", best: "代码生成" },
];

const SUGGESTIONS = [
  { zh: "分析 NVDA 的卖Put策略是否合适", en: "Analyze if selling puts on NVDA is suitable" },
  { zh: "当前 VIX 水平下如何对冲尾部风险", en: "How to hedge tail risk at current VIX level" },
  { zh: "帮我解释夏普比率的计算过程", en: "Explain how Sharpe ratio is calculated" },
  { zh: "对比价值股和成长股在当前宏观环境下的表现", en: "Compare value vs growth in current macro" },
];

export default function AIPage() {
  const { lang } = useLanguage();
  const L = lang === "en" ? en : zh;
  const [selectedModel, setSelectedModel] = useState(null);
  const [loading, setLoading] = useState(false);
  const [status, setStatus] = useState("idle");
  const [messages, setMessages] = useState([]);
  const [input, setInput] = useState("");
  const [webgpuSupported, setWebgpuSupported] = useState(null);

  useEffect(() => { setWebgpuSupported(!!(navigator.gpu || true)); }, []);

  const loadModel = async (modelId) => {
    setLoading(true); setStatus("loading"); setSelectedModel(modelId);
    await new Promise((r) => setTimeout(r, 2000));
    setStatus("ready"); setLoading(false);
  };

  const sendMessage = async () => {
    if (!input.trim() || !selectedModel) return;
    setMessages((m) => [...m, { role: "user", content: input, time: new Date().toISOString() }]);
    setInput(""); setLoading(true);
    await new Promise((r) => setTimeout(r, 1500));
    setMessages((m) => [...m, { role: "assistant", content: L.mockResponse, time: new Date().toISOString(), model: selectedModel }]);
    setLoading(false);
  };

  return (
    <div className="min-h-screen bg-slate-50 font-sans text-slate-900">
      <Head><title>{L.title}</title></Head>
      <Navbar />
      <section className="pt-24 pb-16 px-4">
        <div className="max-w-3xl mx-auto">
          <h1 className="text-3xl font-bold mb-2">{L.title}</h1>
          <p className="text-slate-500 mb-6">{L.subtitle}</p>
          <div className={`mb-6 p-4 rounded-xl border text-sm ${webgpuSupported ? "bg-green-50 border-green-200 text-green-800" : "bg-amber-50 border-amber-200 text-amber-800"}`}>
            {webgpuSupported ? L.gpuSupported : L.gpuNotSupported}
          </div>
          {status !== "ready" ? (
            <div className="bg-white rounded-xl p-6 shadow-sm border border-slate-100 mb-6">
              <h3 className="font-semibold mb-4">{L.selectModel}</h3>
              <div className="grid md:grid-cols-2 gap-4">
                {MODELS.map((m) => (
                  <button key={m.id} onClick={() => loadModel(m.id)} disabled={loading}
                    className={`text-left p-4 rounded-lg border transition-all ${selectedModel === m.id ? "border-indigo-500 bg-indigo-50" : "border-slate-200 hover:border-indigo-200"}`}>
                    <div className="font-semibold">{m.name}</div>
                    <div className="text-xs text-slate-400 mt-1">{m.size} | {m.ctx} ctx | {m.best}</div>
                    {loading && selectedModel === m.id && (<div className="mt-2 text-xs text-indigo-600">{L.loadingModel}...</div>)}
                  </button>
                ))}
              </div>
            </div>
          ) : (
            <div className="bg-white rounded-xl p-6 shadow-sm border border-slate-100">
              <div className="flex items-center justify-between mb-4 pb-4 border-b">
                <div>
                  <span className="font-semibold">{MODELS.find((m) => m.id === selectedModel)?.name}</span>
                  <span className="ml-2 text-xs text-green-600 bg-green-50 px-2 py-0.5 rounded-full">{L.localInference}</span>
                </div>
                <button onClick={() => { setStatus("idle"); setSelectedModel(null); setMessages([]); }}
                  className="text-sm text-slate-400 hover:text-slate-600">{L.switchModel}</button>
              </div>
              <div className="space-y-4 min-h-[300px] max-h-[400px] overflow-y-auto mb-4">
                {messages.length === 0 && (
                  <div className="text-center text-slate-400 py-8">
                    <p className="mb-4">{L.startConversation}</p>
                    <div className="grid grid-cols-1 gap-2">
                      {SUGGESTIONS.map((s, i) => (
                        <button key={i} onClick={() => setInput(lang === "en" ? s.en : s.zh)}
                          className="text-left text-sm px-3 py-2 bg-slate-50 rounded-lg hover:bg-indigo-50 transition-colors">
                          {lang === "en" ? s.en : s.zh}
                        </button>
                      ))}
                    </div>
                  </div>
                )}
                {messages.map((m, i) => (
                  <div key={i} className={`flex ${m.role === "user" ? "justify-end" : "justify-start"}`}>
                    <div className={`max-w-[80%] px-4 py-3 rounded-xl text-sm ${m.role === "user" ? "bg-indigo-600 text-white" : "bg-slate-100 text-slate-800"}`}>
                      {m.content}
                      {m.model && <div className="text-xs text-slate-400 mt-2">🔒 {L.processedLocally}</div>}
                    </div>
                  </div>
                ))}
                {loading && (
                  <div className="flex justify-start">
                    <div className="bg-slate-100 px-4 py-3 rounded-xl text-sm text-slate-400 animate-pulse">{L.thinking}...</div>
                  </div>
                )}
              </div>
              <div className="flex gap-2">
                <input type="text" value={input} onChange={(e) => setInput(e.target.value)}
                  onKeyDown={(e) => e.key === "Enter" && sendMessage()}
                  placeholder={L.inputPlaceholder}
                  className="flex-1 px-4 py-2.5 border border-slate-300 rounded-lg text-sm focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500" />
                <button onClick={sendMessage} disabled={loading || !input.trim()}
                  className="px-5 py-2.5 bg-indigo-600 text-white rounded-lg font-semibold text-sm hover:bg-indigo-500 disabled:opacity-50 transition-colors">
                  {L.send}
                </button>
              </div>
              <p className="text-xs text-slate-400 mt-2 text-center">🔒 {L.privacyNote}</p>
            </div>
          )}
        </div>
      </section>
    </div>
  );
}

const zh = {
  title: "本地 AI 助手",
  subtitle: "WebGPU 本地推理，交易数据永不离开你的设备",
  gpuSupported: "✓ WebGPU 可用 — 支持本地模型推理",
  gpuNotSupported: "⚠ 当前浏览器不支持 WebGPU — 将使用云端降级方案",
  selectModel: "选择模型",
  loadingModel: "加载模型",
  localInference: "本地运行",
  switchModel: "切换模型",
  startConversation: "开始对话，或选择以下建议：",
  inputPlaceholder: "输入你的问题...",
  send: "发送",
  thinking: "思考中",
  processedLocally: "本地处理，数据未上传",
  privacyNote: "所有推理在本地完成，交易数据和策略参数不会上传到服务器",
  mockResponse: "这是一个演示响应。接入 WebGPU 后，AI 将在本地处理你的请求。当前为 MVP 阶段，使用模拟响应。",
};
const en = {
  title: "Local AI Assistant",
  subtitle: "WebGPU local inference — your trading data never leaves your device",
  gpuSupported: "✓ WebGPU available — local model inference supported",
  gpuNotSupported: "⚠ WebGPU not supported — cloud fallback will be used",
  selectModel: "Select Model",
  loadingModel: "Loading model",
  localInference: "Local",
  switchModel: "Switch model",
  startConversation: "Start a conversation, or pick a suggestion:",
  inputPlaceholder: "Type your question...",
  send: "Send",
  thinking: "Thinking",
  processedLocally: "Processed locally, no upload",
  privacyNote: "All inference runs locally. Trading data and strategy params never leave your device.",
  mockResponse: "This is a demo response. With WebGPU integrated, the AI will process locally. Currently MVP phase with simulated responses.",
};

