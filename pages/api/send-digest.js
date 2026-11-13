// pages/api/send-digest.js — 邮件发送 / 预览端点（Edge，恒 200，graceful 降级）
//
// 手册 §4「邮件自动化」：把每日简报 / 欢迎信渲染并（若已配 provider）发送。
//   - POST { to, template: "digest"|"welcome", name, lang }
//   - 未配 EMAIL_SEND_URL/EMAIL_SEND_TOKEN 时，返回渲染好的邮件「预览」(sent:false)，
//     不报错、不泄露配置；配了则转发到通用 relay（provider 无关）。
// 单一事实源：复用 lib/email.js + lib/digest.js。

import { buildDigestEmail, buildWelcomeEmail } from "../../lib/email.js";
import { buildDailyDigest } from "../../lib/digest.js";

export const config = { runtime: "edge" };

const EMAIL_RE = /^[^@\s]+@[^@\s]+\.[^@\s]+$/;

export default async function handler(req, res) {
  try {
    const body = req.body || {};
    const to = String(body.to || "").trim();
    const lang = body.lang === "en" ? "en" : "zh";
    const template = body.template === "welcome" ? "welcome" : "digest";
    const isEmail = EMAIL_RE.test(to);

    // 渲染邮件内容（与前端 /digest 同一事实源）
    const email =
      template === "welcome"
        ? buildWelcomeEmail(body.name || "", { lang })
        : buildDigestEmail(buildDailyDigest({ generatedAt: new Date().toISOString() }), { lang });

    // 投递：配了 EMAIL_SEND_URL + TOKEN 才真正发；否则返回预览（诚实降级）
    let delivery = { sent: false, reason: "provider_not_configured", preview: true };
    const sendUrl = process.env.EMAIL_SEND_URL;
    const sendToken = process.env.EMAIL_SEND_TOKEN;
    if (!isEmail) {
      delivery = { sent: false, reason: "invalid_email", preview: true };
    } else if (sendUrl && sendToken) {
      try {
        const r = await fetch(sendUrl, {
          method: "POST",
          headers: {
            "content-type": "application/json",
            authorization: "Bearer " + sendToken,
          },
          body: JSON.stringify({
            to,
            subject: email.subject,
            text: email.text,
            html: email.html,
          }),
        });
        delivery = { sent: r.ok, status: r.status, preview: false };
      } catch (_e) {
        delivery = { sent: false, reason: "send_failed", preview: true };
      }
    }

    res.setHeader("Cache-Control", "no-store");
    res.setHeader("Robots", "noindex, nofollow");
    res.status(200).json({ ok: true, template, delivery, email });
  } catch (_e) {
    res.setHeader("Cache-Control", "no-store");
    res.status(200).json({ ok: false, error: "digest_send_failed" });
  }
}
