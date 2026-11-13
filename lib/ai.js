// lib/ai.js — 本地 AI 集成层 (@mlc-ai/web-llm, WebGPU)
//
// 设计目标：交易 / 策略数据永不离开设备。模型在浏览器内用 WebGPU 推理，
// 仅模型二进制经 HTTPS 从 MLC CDN (raw.githubusercontent.com/mlc-ai/...) 拉取。
// 浏览器不支持 WebGPU 时，降级到云端 /api/ai。
//
// 关键：用动态 import("@mlc-ai/web-llm")，使该 WASM/WebGPU 依赖仅在浏览器、
// 用户点击「加载模型」后才加载，避免 SSR / Node 构建期引用而报错。

// 幻觉控制 + RAG 接地层（纯函数，SSR 安全；见 lib/aiRag.js）
import { buildGroundedSystemPrompt } from "./aiRag.js";

/** UI 模型简写 -> web-llm 真实模型 ID（按体积/速度分级；均为 prebuiltAppConfig 常见项） */
export const MODEL_MAP = {
  "qwen-1.8b": "Qwen2.5-1.5B-Instruct-mlc",
  "qwen-4b": "Qwen2.5-3B-Instruct-mlc",
  "llama-3-8b": "Llama-3.2-3B-Instruct-mlc",
  "phi-3-4b": "Phi-3.5-mini-instruct-mlc",
};

// 兜底模型：最小最快，保证绝大多数 WebGPU 设备可加载
export const DEFAULT_MODEL = "Qwen2.5-0.5B-Instruct-mlc";

// 复用同一个 engine 实例（避免重复下载 / 加载模型）
let enginePromise = null;
let currentModelId = null;

/** 浏览器是否支持 WebGPU */
export function checkWebGPUSupport() {
  return typeof navigator !== "undefined" && !!navigator.gpu;
}

/** 把 UI 简写 id 解析成 web-llm 真实模型 ID */
export function resolveModelId(uiModelId) {
  if (!uiModelId) return DEFAULT_MODEL;
  return MODEL_MAP[uiModelId] || uiModelId;
}

/**
 * 运行时取 web-llm 真实可用模型列表（来自 prebuiltAppConfig.model_list）。
 * 失败时回退到 MODEL_MAP，保证 UI 始终有模型可选。
 */
export async function getAvailableModels() {
  try {
    const { prebuiltAppConfig } = await import("@mlc-ai/web-llm");
    const list = prebuiltAppConfig && prebuiltAppConfig.model_list;
    if (Array.isArray(list) && list.length) {
      return list
        .filter((m) => m && typeof m.model === "string")
        .map((m) => ({
          id: m.model,
          name: m.model,
          sizeMb: m.vram_usage_mb || m.model_size_mb || 0,
          context: m.context_window_size || "",
        }));
    }
  } catch (e) {
    console.warn("[ai] getAvailableModels 回退默认列表:", e && e.message);
  }
  return Object.keys(MODEL_MAP).map((k) => ({ id: k, name: MODEL_MAP[k], sizeMb: 0, context: "" }));
}

/**
 * 加载本地模型到 WebGPU（复用 engine 实例）。
 * @param {string} uiModelId - UI 模型 id（经 MODEL_MAP 解析为真实 id）
 * @param {(report:{progress:number,message:string,progressPercent:number})=>void} [onProgress]
 * @returns {Promise<{engine:object,modelId:string,device:string}>}
 */
export async function loadLocalModel(uiModelId = DEFAULT_MODEL, onProgress) {
  if (!checkWebGPUSupport()) {
    throw new Error("WebGPU not supported in this browser");
  }
  const modelId = resolveModelId(uiModelId);

  // 已加载同一模型 → 直接复用
  if (enginePromise && currentModelId === modelId) {
    const engine = await enginePromise;
    return { engine, modelId, device: "webgpu" };
  }

  try {
    const { CreateMLCEngine } = await import("@mlc-ai/web-llm");
    enginePromise = CreateMLCEngine(
      modelId,
      onProgress ? { initProgressCallback: onProgress } : undefined,
    );
    const engine = await enginePromise;
    currentModelId = modelId;
    return { engine, modelId, device: "webgpu" };
  } catch (e) {
    // 失败即重置，允许下次重试
    enginePromise = null;
    currentModelId = null;
    console.error("[ai] loadLocalModel 失败:", e && e.message);
    throw e;
  }
}

/** 把 messages 规整为 OpenAI 风格数组 */
function normalizeMessages(messages) {
  if (Array.isArray(messages)) return messages;
  return [{ role: "user", content: String(messages) }];
}

/**
 * 接地后的消息序列：在用户消息前注入「幻觉控制 + RAG 上下文」系统提示。
 * 默认开启（grounded!==false）；options.query 为最新用户问题，lang 决定系统提示语言。
 */
function groundedMessages(messages, options = {}) {
  const msgs = normalizeMessages(messages);
  if (options.grounded === false) return msgs;
  const { prompt } = buildGroundedSystemPrompt(options.query || "", {
    lang: options.lang || "zh",
    k: options.k,
  });
  return prompt ? [{ role: "system", content: prompt }, ...msgs] : msgs;
}

/** 本地推理（非流式） */
export async function localInference(engine, messages, options = {}) {
  const { maxTokens = 512, temperature = 0.7 } = options;
  const resp = await engine.chat.completions.create({
    model: currentModelId,
    messages: groundedMessages(messages, options),
    max_tokens: maxTokens,
    temperature,
    stream: false,
  });
  return (resp && resp.choices && resp.choices[0] && resp.choices[0].message && resp.choices[0].message.content) || "";
}

/**
 * 本地推理（流式）—— 异步生成器，逐 token 产出文本。
 * options.query 用于 RAG 检索接地；options.lang 决定系统提示语言。
 */
export async function* localInferenceStream(engine, messages, options = {}) {
  const { maxTokens = 512, temperature = 0.7 } = options;
  const stream = await engine.chat.completions.create({
    model: currentModelId,
    messages: groundedMessages(messages, options),
    max_tokens: maxTokens,
    temperature,
    stream: true,
  });
  for await (const chunk of stream) {
    const delta = chunk && chunk.choices && chunk.choices[0] && chunk.choices[0].delta;
    if (delta && delta.content) yield delta.content;
  }
}

/**
 * 云端降级（WebGPU 不可用或本地加载失败时）：调用 /api/ai。
 * 注意：此路径会把 prompt 发到服务端，仅在不支持本地推理时使用。
 */
export async function cloudFallback(prompt, system = "You are a helpful financial assistant.") {
  const res = await fetch("/api/ai", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ prompt, system }),
  });
  if (!res.ok) throw new Error(`cloud fallback failed: ${res.status}`);
  const data = await res.json();
  return (data && data.response) || "";
}

/** 模型元数据（UI 展示用；size/context 为近似值，真实值以 getAvailableModels 为准） */
export const MODEL_METADATA = {
  "qwen-1.8b": { name: "Qwen 2.5 1.5B", size: "≈1GB", context: "4K", quality: "快速", best: "简单问答 / 快速分析", license: "Apache 2.0" },
  "qwen-4b": { name: "Qwen 2.5 3B", size: "≈2GB", context: "4K", quality: "均衡", best: "一般任务", license: "Apache 2.0" },
  "llama-3-8b": { name: "Llama 3.2 3B", size: "≈3GB", context: "4K", quality: "高质量", best: "复杂推理", license: "Llama 3.2 Community License" },
  "phi-3-4b": { name: "Phi-3.5 mini", size: "≈2GB", context: "4K", quality: "均衡", best: "代码 / 推理", license: "MIT" },
};
