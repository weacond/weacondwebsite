"use client";

import { useState, useEffect } from "react";
import Navbar from "../components/Navbar";
import Footer from "../components/Footer";
import { useLanguage } from "../contexts/LanguageContext";
import Head from "next/head";
import {
  loadLocalModel,
  localInferenceStream,
  cloudFallback,
  checkWebGPUSupport,
  getAvailableModels,
  MODEL_METADATA,
  DEFAULT_MODEL,
} from "../lib/ai";
import { buildGroundedSystemPrompt, appendSources, looksUncertain } from "../lib/aiRag";

export const metadata = {
  title: "本地 AI 助手 — Weacond",
  description: "WebGPU 本地推理，数据永不上传，零推理成本",
  robots: { index: true, follow: true },
};

// 模型元数据：单一数据源 lib/ai.js MODEL_METADATA（UI 简写 id 经 MODEL_MAP 解析为 web-llm 真实 id）
const MODELS = Object.entries(MODEL_METADATA).map(([id, m]) => ({
  id,
  name: m.name,
  size: m.size,
  ctx: m.context,
  best: m.best,
  license: m.license,
}));

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
  const [engine, setEngine] = useState(null); // 已加载的 web-llm engine（本地推理用）
  const [loading, setLoading] = useState(false);
  const [status, setStatus] = useState("idle"); // idle | loading | ready
  const [progress, setProgress] = useState(0); // 0-100 模型下载/加载进度
  const [errorMsg, setErrorMsg] = useState("");
  const [messages, setMessages] = useState([]);
  const [input, setInput] = useState("");
  const [webgpuSupported, setWebgpuSupported] = useState(null);
  // 更多模型：拉取 web-llm 真实模型目录（高级用户自选）
  const [extraModels, setExtraModels] = useState([]);
  const [showExtra, setShowExtra] = useState(false);
  const [loadingExtra, setLoadingExtra] = useState(false);

  useEffect(() => {
    setWebgpuSupported(checkWebGPUSupport());
  }, []);

  // 首次展开：拉取 web-llm 真实可用模型列表（getAvailableModels，失败回退 MODEL_MAP）
  const loadMoreModels = async () => {
    if (extraModels.length) {
      setShowExtra((v) => !v);
      return;
    }
    setLoadingExtra(true);
    try {
      const list = await getAvailableModels();
      setExtraModels(
        list.filter((m) => !MODELS.some((x) => x.id === m.id || x.name === m.name)),
      );
      setShowExtra(true);
    } finally {
      setLoadingExtra(false);
    }
  };

  // 加载本地模型到 WebGPU（带进度；失败回退并提示用云端）
  const loadModel = async (uiId) => {
    setLoading(true);
    setStatus("loading");
    setSelectedModel(uiId);
    setProgress(0);
    setErrorMsg("");
    try {
      const { engine } = await loadLocalModel(uiId, (report) => {
        setProgress(report.progressPercent || 0);
      });
      setEngine(engine);
      setStatus("ready");
    } catch (e) {
      setEngine(null);
      setStatus("idle");
      setSelectedModel(null);
      setErrorMsg((e && e.message) || "Failed to load model");
      console.error("[ai] loadModel failed:", e);
    } finally {
      setLoading(false);
    }
  };

  // 发送：有 engine 走本地流式推理；否则降级到云端 /api/ai
  const sendMessage = async () => {
    const text = input.trim();
    if (!text || loading) return;
    const userMsg = { role: "user", content: text, time: new Date().toISOString() };
    const history = [...messages, userMsg];
    setMessages((m) => [...m, userMsg]);
    setInput("");
    setLoading(true);
    // 追加一个占位 assistant 消息，随后流式填充
    setMessages((m) => [...m, { role: "assistant", content: "", time: new Date().toISOString(), streaming: true }]);

    const updateLast = (patch) =>
      setMessages((m) => {
        const copy = [...m];
        copy[copy.length - 1] = { ...copy[copy.length - 1], ...patch };
        return copy;
      });

    try {
      // 幻觉控制 + RAG 接地：检索站点知识库，构造严格系统提示（仅依上下文/查不到说不知道/不编造）
      const grounding = buildGroundedSystemPrompt(text, { lang });
      if (engine) {
        const msgs = history.map((h) => ({ role: h.role, content: h.content }));
        let acc = "";
        for await (const token of localInferenceStream(engine, msgs, { maxTokens: 512, temperature: 0.7, query: text, lang })) {
          acc += token;
          updateLast({ content: acc });
        }
        const finalText = appendSources(acc || L.noOutput, grounding.sources, lang);
        updateLast({ content: finalText, streaming: false, model: "local", sources: grounding.sources, uncertain: looksUncertain(finalText) });
      } else {
        updateLast({ content: L.thinking });
        const resp = await cloudFallback(text, grounding.prompt);
        const finalText = appendSources(resp, grounding.sources, lang);
        updateLast({ content: finalText, streaming: false, model: "cloud", sources: grounding.sources, uncertain: looksUncertain(finalText) });
      }
    } catch (e) {
      updateLast({ content: L.error + " " + ((e && e.message) || ""), streaming: false });
    } finally {
      setLoading(false);
    }
  };

  return (    <div className="min-h-screen bg-slate-50 font-sans text-slate-900">
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
                    <div className="text-xs text-slate-400 mt-1">{m.size} | {m.ctx} ctx | {m.best} | {m.license}</div>
                    {loading && selectedModel === m.id && (
                      <div className="mt-2">
                        <div className="text-xs text-indigo-600">{L.loadingModel} {progress}%</div>
                        <div className="mt-1 h-1.5 bg-indigo-100 rounded-full overflow-hidden">
                          <div className="h-full bg-indigo-500 transition-all" style={{ width: `${progress}%` }} />
                        </div>
                      </div>
                    )}
                  </button>
                ))}
              </div>
              {/* 更多模型：高级用户拉取 web-llm 真实目录（getAvailableModels，失败回退） */}
              <button onClick={loadMoreModels} disabled={loadingExtra}
                className="mt-3 text-sm text-indigo-600 hover:text-indigo-500 disabled:opacity-50">
                {loadingExtra ? "…" : showExtra ? "− " + L.hideExtra : "+ " + L.moreModels}
              </button>
              {showExtra && extraModels.length > 0 && (
                <div className="mt-3">
                  <div className="text-xs text-slate-400 mb-2">{L.moreModelsHint}</div>
                  <div className="grid md:grid-cols-2 gap-2">
                    {extraModels.slice(0, 12).map((m) => (
                      <button key={m.id} onClick={() => loadModel(m.id)} disabled={loading}
                        className="text-left p-3 rounded-lg border border-slate-200 hover:border-indigo-200 text-xs">
                        <div className="font-medium truncate">{m.name}</div>
                        <div className="text-slate-400 mt-0.5">{m.sizeMb ? "≈" + Math.round(m.sizeMb / 1024) + "GB · " : ""}{m.context ? m.context + " ctx" : "—"}</div>
                      </button>
                    ))}
                  </div>
                </div>
              )}
              {errorMsg && (
                <div className="mt-4 p-3 rounded-lg bg-red-50 border border-red-200 text-sm text-red-700">
                  ⚠️ {errorMsg}
                  <div className="mt-2 text-xs text-slate-500">{L.loadFailedHint}</div>
                </div>
              )}
              {!webgpuSupported && (
                <p className="mt-3 text-xs text-amber-600">{L.cloudModeHint}</p>
              )}
            </div>
          ) : (
            <div className="bg-white rounded-xl p-6 shadow-sm border border-slate-100">
              <div className="flex items-center justify-between mb-4 pb-4 border-b">
                <div>
                  <span className="font-semibold">{MODELS.find((m) => m.id === selectedModel)?.name}</span>
                  <span className="ml-2 text-xs text-green-600 bg-green-50 px-2 py-0.5 rounded-full">{L.localInference}</span>
                </div>
                <button onClick={() => { setStatus("idle"); setSelectedModel(null); setEngine(null); setMessages([]); }}
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
                    <div className={`max-w-[80%] px-4 py-3 rounded-xl text-sm whitespace-pre-wrap ${m.role === "user" ? "bg-indigo-600 text-white" : "bg-slate-100 text-slate-800"}`}>
                      {m.content}
                      {m.model === "local" && <div className="text-xs text-slate-400 mt-2">🔒 {L.processedLocally}</div>}
                      {m.model === "cloud" && <div className="text-xs text-amber-500 mt-2">☁️ {L.processedCloud}</div>}
                      {m.uncertain && <div className="text-xs text-amber-600 mt-2">⚠️ {L.uncertain}</div>}
                      {m.sources && m.sources.length > 0 && <div className="text-xs text-indigo-500 mt-1">📎 {L.sourcesLabel} {m.sources.map((s) => `[${s}]`).join(", ")}</div>}
                    </div>
                  </div>
                ))}
                {loading && messages[messages.length - 1] && messages[messages.length - 1].streaming && !messages[messages.length - 1].content && (
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
      <Footer />
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
  loadFailedHint: "模型加载失败（可能是网络或显存不足）。可改选更小模型，或直接在下方用云端降级发送。",
  cloudModeHint: "无 WebGPU：发送消息时将自动走云端 /api/ai（数据会上行服务端）。",
  localInference: "本地运行",
  switchModel: "切换模型",
  moreModels: "更多模型（来自 web-llm 目录）",
  moreModelsHint: "以下为 web-llm 实时可用模型（按显存/上下文；体积较大者需更强 GPU）",
  hideExtra: "收起更多模型",
  startConversation: "开始对话，或选择以下建议：",
  inputPlaceholder: "输入你的问题...",
  send: "发送",
  thinking: "思考中",
  noOutput: "（模型未返回内容）",
  processedLocally: "本地处理，数据未上传",
  processedCloud: "云端处理（降级）",
  error: "推理出错：",
  privacyNote: "所有推理在本地完成，交易数据和策略参数不会上传到服务器",
  uncertain: "模型表示不确定或信息不足，请自行核实",
  sourcesLabel: "参考来源",
};
const en = {
  title: "Local AI Assistant",
  subtitle: "WebGPU local inference — your trading data never leaves your device",
  gpuSupported: "✓ WebGPU available — local model inference supported",
  gpuNotSupported: "⚠ WebGPU not supported — cloud fallback will be used",
  selectModel: "Select Model",
  loadingModel: "Loading model",
  loadFailedHint: "Model failed to load (network or insufficient VRAM). Pick a smaller model, or just send via the cloud fallback below.",
  cloudModeHint: "No WebGPU: messages will automatically use the cloud /api/ai (data is sent to the server).",
  localInference: "Local",
  switchModel: "Switch model",
  moreModels: "More models (from web-llm catalog)",
  moreModelsHint: "Live web-llm models (by VRAM/context; larger ones need a stronger GPU)",
  hideExtra: "Hide extra models",
  startConversation: "Start a conversation, or pick a suggestion:",
  inputPlaceholder: "Type your question...",
  send: "Send",
  thinking: "Thinking",
  noOutput: "(model returned no content)",
  processedLocally: "Processed locally, no upload",
  processedCloud: "Processed in cloud (fallback)",
  error: "Inference error: ",
  privacyNote: "All inference runs locally. Trading data and strategy params never leave your device.",
  uncertain: "The model is unsure or data is insufficient — please verify",
  sourcesLabel: "Sources",
};
