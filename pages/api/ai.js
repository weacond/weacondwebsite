export const runtime = "edge";

// AI 云端降级 API — POST /api/ai
// 当 WebGPU 不可用时，使用云端 LLM
// 生产环境: 接入 OpenAI / Anthropic / 本地服务器

export default async function handler(req, res) {
  if (req.method !== "POST") {
    return res.status(405).json({ error: "Method Not Allowed" });
  }

  const { prompt, system = "You are a helpful financial assistant." } = req.body;

  if (!prompt) {
    return res.status(400).json({ error: "prompt is required" });
  }

  try {
    // MVP: 模拟云端响应（生产环境接入真实API）
    // 示例 (OpenAI):
    // const res = await fetch("https://api.openai.com/v1/chat/completions", {
    //   method: "POST",
    //   headers: {
    //     "Content-Type": "application/json",
    //     "Authorization": `Bearer ${process.env.OPENAI_API_KEY}`,
    //   },
    //   body: JSON.stringify({
    //     model: "gpt-4o-mini",
    //     messages: [
    //       { role: "system", content: system },
    //       { role: "user", content: prompt },
    //     ],
    //     max_tokens: 512,
    //     temperature: 0.7,
    //   }),
    // });
    // const data = await res.json();
    // return res.status(200).json({ response: data.choices[0].message.content });

    await new Promise((r) => setTimeout(r, 1500));

    res.status(200).json({
      response: `[Cloud fallback] You asked: "${prompt}"\n\nIn production, this will call OpenAI/Anthropic API. Currently simulated.`,
      model: "simulated",
    });
  } catch (err) {
    console.error("AI API error:", err);
    res.status(500).json({ error: err.message || "AI request failed" });
  }
}
