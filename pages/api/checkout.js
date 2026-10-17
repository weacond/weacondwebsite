export const runtime = "edge";

// 临时极简 handler：零 import，用于定位 /api/* 500 是运行时/框架问题还是依赖问题。
export default async function handler(req, res) {
  try {
    res.status(200).json({
      ok: true,
      message: "checkout handler 运行时正常",
      method: req.method,
      hasStripeKey: !!process.env.STRIPE_SECRET_KEY,
      keyPrefix: process.env.STRIPE_SECRET_KEY ? String(process.env.STRIPE_SECRET_KEY).slice(0, 8) : null,
    });
  } catch (e) {
    res.status(500).json({ error: "handler crash", detail: e && e.message ? e.message : String(e) });
  }
}