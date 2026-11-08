export const runtime = "edge";

// AI 云端降级 API — POST /api/ai
// 浏览器无 WebGPU 时，前端调用此接口用云端 LLM 兜底。
// 配置（仅服务端 env，绝不下发前端）：
//   OPENAI_API_KEY   OpenAI 或兼容 provider 密钥（不配则优雅降级为模拟响应）
//   OPENAI_MODEL     模型名，默认 gpt-4o-mini
//   OPENAI_BASE_URL  默认 https://api.openai.com/v1（可接国产/自建兼容网关）
// 设计：上游任何异常都降级为模拟响应，保证前端可用性。

// Weacond 领域默认系统提示（金融情报，面向散户卖 Put）
const DEFAULT_SYSTEM =
  "You are Weacond, a concise financial-intelligence assistant. " +
  "Explain options, volatility (IV / IV Rank), and risk for retail put-sellers. " +
  "Be factual, hedge when uncertain, and never give personalized investment advice. " +
  "Reply in the user's language.";

// 优雅降级：无密钥或上游失败时返回占位，前端仍能渲染
async function simulatedFallback(prompt, fallback = false) {
  await new Promise((r) => setTimeout(r, 600));
  return {
    response:
      `[Cloud fallback] You asked: "${prompt}"\n\n` +
      "Configure OPENAI_API_KEY on the server to enable real cloud inference. " +
      "On WebGPU-capable browsers this runs fully on-device instead.",
    model: "simulated",
    ...(fallback ? { fallback: true } : {}),
  };
}

export default async function handler(req, res) {
  if (req.method !== "POST") {
    return res.status(405).json({ error: "Method Not Allowed" });
  }

  // Edge runtime 不自动解析 req.body，必须手动 req.json()（修正原实现潜在 400）
  let body;
  try {
    body = await req.json();
  } catch {
    return res.status(400).json({ error: "Invalid JSON body" });
  }

  const {
    prompt,
    system = DEFAULT_SYSTEM,
    model,
    temperature = 0.6,
    max_tokens = 768,
  } = body || {};

  if (!prompt || typeof prompt !== "string") {
    return res.status(400).json({ error: "prompt is required" });
  }

  const apiKey = process.env.OPENAI_API_KEY;
  const baseUrl = process.env.OPENAI_BASE_URL || "https://api.openai.com/v1";
  const modelName = model || process.env.OPENAI_MODEL || "gpt-4o-mini";

  // 无密钥 → 模拟降级
  if (!apiKey) {
    return res.status(200).json(await simulatedFallback(prompt));
  }

  // 有密钥 → 调真实（OpenAI 兼容）chat completions；异常则降级
  try {
    const upstream = await fetch(`${baseUrl}/chat/completions`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${apiKey}`,
      },
      body: JSON.stringify({
        model: modelName,
        messages: [
          { role: "system", content: system },
          { role: "user", content: prompt },
        ],
        temperature,
        max_tokens,
      }),
    });

    if (!upstream.ok) {
      const errText = await upstream.text();
      console.error("AI upstream error", upstream.status, errText.slice(0, 300));
      return res.status(200).json(await simulatedFallback(prompt, true));
    }

    const data = await upstream.json();
    const content = data?.choices?.[0]?.message?.content || "";
    return res.status(200).json({ response: content, model: data?.model || modelName });
  } catch (err) {
    console.error("AI API error:", err);
    return res.status(200).json(await simulatedFallback(prompt, true));
  }
}
