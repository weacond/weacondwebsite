// 本地 AI 集成层
// 支持 WebGPU 本地推理 (MVP: 云端降级)
// 生产环境: 接入 @mlc-ai/web-llm 或 ollama

/**
 * 加载本地模型
 * @param {Object} options - { model: "qwen-1.8b" | "llama-3-8b", device: "webgpu" | "cpu" }
 * @returns {Promise<Object>} 返回模型实例
 */
export async function loadLocalModel(options = {}) {
  const { model = "qwen-1.8b", device = "webgpu" } = options;

  // MVP: 模拟加载（生产环境接入 @mlc-ai/web-llm）
  console.log(`Loading model ${model} on ${device}...`);

  // 检查 WebGPU 支持
  if (device === "webgpu" && typeof navigator !== "undefined" && !navigator.gpu) {
    console.warn("WebGPU not supported, falling back to CPU");
    return { model, device: "cpu", mock: true };
  }

  // 模拟模型加载时间
  await new Promise((resolve) => setTimeout(resolve, 2000));

  // 生产环境示例 (待实现):
  // import { Chat } from "@mlc-ai/web-llm";
  // const chat = await Chat.create({
  //   model: `Qwen1.5-1.8B-Chat`,
  //   device: "webgpu",
  // });
  // return { model: chat, device, mock: false };

  return { model, device, mock: true };
}

/**
 * 本地推理
 * @param {Object} model - 模型实例
 * @param {string} prompt - 输入文本
 * @param {Object} options - { maxTokens, temperature, streaming }
 * @returns {Promise<string>} 返回生成文本
 */
export async function localInference(model, prompt, options = {}) {
  const { maxTokens = 512, temperature = 0.7, streaming = false } = options;

  if (!model) {
    throw new Error("Model not loaded");
  }

  // MVP: 模拟推理
  console.log(`Local inference on ${model.device}: "${prompt.substring(0, 50)}..."`);

  if (streaming) {
    // 生产环境示例 (待实现):
    // for await (const chunk of model.chat.reply(prompt)) {
    //   yield chunk;
    // }
    // MVP: 模拟流式输出
    const mockResponse = "This is a simulated response. In production, this will run locally on your device using WebGPU.";
    for (let i = 0; i < mockResponse.length; i += 5) {
      await new Promise((r) => setTimeout(r, 50));
      // 生产环境: yield mockResponse.slice(0, i);
    }
    return mockResponse;
  }

  await new Promise((resolve) => setTimeout(resolve, 1000));

  // 生产环境示例 (待实现):
  // const response = await model.chat.reply(prompt, { maxTokens, temperature });
  // return response.text;

  return `Simulated response to: "${prompt.substring(0, 30)}..."\n\nIn production, this will run locally using WebGPU. No data leaves your device.`;
}

/**
 * 云端降级（WebGPU 不支持时）
 * @param {string} prompt
 * @returns {Promise<string>}
 */
export async function cloudFallback(prompt) {
  console.log("Cloud fallback: sending request to server");

  // 生产环境: 接入 OpenAI / Anthropic / 本地服务器
  // const res = await fetch("/api/ai", {
  //   method: "POST",
  //   headers: { "Content-Type": "application/json" },
  //   body: JSON.stringify({ prompt }),
  // });
  // const data = await res.json();
  // return data.response;

  await new Promise((resolve) => setTimeout(resolve, 1500));

  return `Cloud fallback response (simulated):\n\nYou asked: "${prompt}"\n\nWebGPU is not available in your browser. For local inference, use a browser that supports WebGPU (Chrome 113+, Edge 113+, or Safari 17+).`;
}

/**
 * 模型元数据
 */
export const MODEL_METADATA = {
  "qwen-1.8b": {
    name: "Qwen 1.8B",
    size: "1.2GB",
    context: "2048",
    quality: "Fast",
    best: "Simple Q&A, quick analysis",
    license: "Apache 2.0",
  },
  "qwen-4b": {
    name: "Qwen 4B",
    size: "2.5GB",
    context: "4096",
    quality: "Balanced",
    best: "General tasks",
    license: "Apache 2.0",
  },
  "llama-3-8b": {
    name: "Llama 3 8B",
    size: "5GB",
    context: "8192",
    quality: "High quality",
    best: "Complex reasoning",
    license: "Llama 3 Community License",
  },
  "phi-3-4b": {
    name: "Phi-3 4B",
    size: "2.3GB",
    context: "4096",
    quality: "Balanced",
    best: "Code generation",
    license: "MIT",
  },
};

/**
 * 检查浏览器是否支持 WebGPU
 * @returns {boolean}
 */
export function checkWebGPUSupport() {
  if (typeof navigator === "undefined") return false;
  return !!navigator.gpu;
}
