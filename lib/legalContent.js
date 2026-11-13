// lib/legalContent.js — 法律与合规内容（中英双语）
// 供 /terms 与 /privacy 通过 useLanguage 消费，避免在页面里重复硬编码。
// 每个章节：{ id, zh:{h,p}, en:{h,p}, link?:{zh,en,href} }

// ===== 注册主体 / 适用法律（上线前必填）=====
// 上线前必须由注册主体确认并填入真实管辖法（建议新加坡 / 美国 / 马来西亚）。
// 留空时，相关条款显示中性占位提示，避免给出虚假管辖声明。
export const PLATFORM_JURISDICTION = {
  name: "Weacond",
  // 例："State of Delaware, USA" / "Singapore" / "Malaysia"
  governingLaw: "",
  // 争议管辖法院/仲裁地，例："Singapore International Arbitration Centre (SIAC)"
  jurisdiction: "",
  // 联系邮箱（隐私政策 / 用户权利入口）
  contactEmail: "weacond@gmail.com",
};

// ===== 服务条款 / Terms of Service =====
export const TERMS_SECTIONS = [
  {
    id: "service",
    zh: { h: "1. 服务说明", p: "Weacond（以下简称\"平台\"）提供金融数据分析、教育内容和策略工具。所有内容和信号仅供教育和研究用途，不构成投资建议、财务建议或交易建议。" },
    en: { h: "1. Service Description", p: "Weacond (the \"Platform\") provides financial data analysis, educational content, and strategy tools. All content and signals are for educational and research purposes only and do not constitute investment, financial, or trading advice." },
  },
  {
    id: "disclaimer",
    zh: { h: "2. 免责声明", p: "用户理解并同意：(a) 平台不提供个性化投资咨询；(b) 历史回测结果不代表未来表现；(c) 信号和策略有风险，可能导致亏损；(d) 投资有风险，入市需谨慎。使用平台即表示您已阅读并同意此免责声明。" },
    en: { h: "2. Disclaimer", p: "Users acknowledge and agree that: (a) the Platform does not provide personalized investment advice; (b) past backtest results do not indicate future performance; (c) signals and strategies carry risk and may result in losses; (d) investing involves risk. By using the Platform, you acknowledge that you have read and agreed to this disclaimer." },
  },
  {
    id: "account",
    zh: { h: "3. 账户与注册", p: "用户需提供真实、准确的注册信息。每个用户只能拥有一个账户。平台保留在发现欺诈行为时关闭账户的权利。" },
    en: { h: "3. Accounts & Registration", p: "Users must provide truthful and accurate registration information. Each user may hold only one account. The Platform reserves the right to suspend accounts upon discovery of fraudulent activity." },
  },
  {
    id: "subscription",
    zh: { h: "4. 订阅与退款", p: "订阅按月/年计费，自动续费。7 天内无条件退款（年付首次及活动除外）。退款处理时间不超过 24 小时。年付不可部分退款。" },
    en: { h: "4. Subscriptions & Refunds", p: "Subscriptions are billed monthly or annually and renew automatically. A no-questions-asked refund is available within 7 days (excluding the first annual payment and promotional offers). Refunds are processed within 24 hours. Annual plans are not eligible for partial refunds." },
  },
  {
    id: "api",
    zh: { h: "5. API 使用条款", p: "API 使用受速率限制约束。禁止：(a) 反向工程；(b) 用于违法目的；(c) 超出套餐配额的使用。平台保留在滥用时终止 API 访问的权利。API 数据不得二次分发。" },
    en: { h: "5. API Usage", p: "API usage is subject to rate limits. The following are prohibited: (a) reverse engineering; (b) use for unlawful purposes; (c) exceeding your plan's quota. The Platform reserves the right to terminate API access upon abuse. API data may not be redistributed." },
  },
  {
    id: "creators",
    zh: { h: "6. 创作者与策略市场", p: "上架策略须：(a) 保证原创性；(b) 披露回测假设；(c) 标注风险等级；(d) 同意平台分润条款（默认 50%/30%/20%）。抄袭或违规将被下线并保留仲裁权。" },
    en: { h: "6. Creators & Strategy Marketplace", p: "Listed strategies must: (a) be original; (b) disclose backtest assumptions; (c) carry a risk rating; (d) agree to the Platform's revenue-share terms (default 50%/30%/20%). Plagiarism or violations will be delisted, and the Platform reserves arbitration rights." },
  },
  {
    id: "data-privacy",
    zh: { h: "7. 数据与隐私", p: "平台采用数据最小化原则，敏感数据加密存储。" },
    en: { h: "7. Data & Privacy", p: "The Platform follows a data-minimization principle; sensitive data is encrypted at rest. For full details, see our:" },
    link: { zh: "隐私政策", en: "Privacy Policy", href: "/privacy" },
  },
  {
    id: "ip",
    zh: { h: "8. 知识产权", p: "平台所有内容、代码、设计归 Weacond 所有。用户不得复制、修改或分发。开源组件遵循其各自许可证（Apache 2.0 / MIT）。" },
    en: { h: "8. Intellectual Property", p: "All content, code, and design of the Platform are owned by Weacond. Users may not copy, modify, or distribute them. Open-source components are governed by their respective licenses (Apache 2.0 / MIT)." },
  },
  {
    id: "liability",
    zh: { h: "9. 责任限制", p: "平台按\"现状\"提供，不做任何保证。在任何情况下，平台对因使用本服务导致的直接、间接、附带损害不承担责任，包括投资损失。总责任上限为最近 12 个月支付金额。" },
    en: { h: "9. Limitation of Liability", p: "The Platform is provided \"as is\" without warranties of any kind. In no event shall the Platform be liable for any direct, indirect, or consequential damages arising from use of the service, including investment losses. Total liability is capped at the amount paid in the preceding 12 months." },
  },
  {
    id: "dispute",
    zh: { h: "10. 争议解决", p: "因本服务产生的争议，双方同意通过友好协商解决。协商不成，提交平台所在地有管辖权的法院。适用法律为平台注册地法律。" },
    en: { h: "10. Dispute Resolution", p: "Disputes arising from this service shall first be resolved through good-faith negotiation. If unresolved, they shall be submitted to a court of competent jurisdiction where the Platform is located. The governing law is that of the Platform's registered jurisdiction." },
  },
  {
    id: "compliance",
    zh: { h: "11. 金融合规", p: "平台不提供代客理财、代下单服务。复制交易功能在上线前须完成牌照申请。KYC/AML 在涉及托管/大额/自动交易时启用。" },
    en: { h: "11. Financial Compliance", p: "The Platform does not offer discretionary account management or order execution on behalf of clients. Copy-trading features require a license before launch. KYC/AML is enabled for custody, large-value, or automated trading." },
  },
  {
    id: "governing-law",
    zh: {
      h: "12. 适用法律与争议解决",
      p: PLATFORM_JURISDICTION.governingLaw
        ? `本服务条款受 ${PLATFORM_JURISDICTION.governingLaw} 法律管辖；任何争议提交 ${PLATFORM_JURISDICTION.jurisdiction || PLATFORM_JURISDICTION.governingLaw} 专属管辖。`
        : "本服务条款的适用法律与争议管辖由平台注册主体在上线前确定（建议新加坡 / 美国 / 马来西亚）。主体注册完成前，相关争议条款以最终公布版本为准。",
    },
    en: {
      h: "12. Governing Law & Dispute Resolution",
      p: PLATFORM_JURISDICTION.governingLaw
        ? `These Terms are governed by the laws of ${PLATFORM_JURISDICTION.governingLaw}; any dispute shall be subject to the exclusive jurisdiction of ${PLATFORM_JURISDICTION.jurisdiction || PLATFORM_JURISDICTION.governingLaw}.`
        : "The governing law and dispute jurisdiction for these Terms will be set by the Platform's registered entity before launch (suggested: Singapore / USA / Malaysia). Until then, the published version controls.",
    },
  },
  {
    id: "changes",
    zh: { h: "13. 条款变更与通知", p: `平台可不时更新本条款；重大变更将通过站内公告或注册邮箱（${PLATFORM_JURISDICTION.contactEmail}）提前通知。继续使用即视为接受更新后的条款。` },
    en: { h: "13. Changes & Notices", p: `The Platform may update these Terms from time to time; material changes will be announced on-site or by email (${PLATFORM_JURISDICTION.contactEmail}) in advance. Continued use constitutes acceptance of the updated Terms.` },
  },
  {
    id: "termination",
    zh: { h: "14. 终止", p: "用户可随时终止账户；平台可在用户违约或违反本条款时终止服务。终止后的数据处理见隐私政策「数据保留 / 删除」条款。" },
    en: { h: "14. Termination", p: "Users may terminate their account at any time; the Platform may terminate service for breach of these Terms. Data handling after termination is governed by the Privacy Policy's retention/deletion clauses." },
  },
  {
    id: "data-sourcing",
    zh: { h: "15. 数据源与二次分发", p: "平台使用的行情 / 基本面 / 宏观数据来自第三方供应商，受其各自服务条款约束。用户不得将平台数据用于超出授权范围的二次分发；商业化使用须另行取得数据源许可。" },
    en: { h: "15. Data Sourcing & Redistribution", p: "Market, fundamental, and macro data are sourced from third-party providers under their own terms. Users may not redistribute Platform data beyond the scope of their license; commercial reuse requires a separate data-source license." },
  },
];
// ===== 隐私政策 / Privacy Policy =====
export const PRIVACY_SECTIONS = [
  {
    id: "collection",
    zh: { h: "1. 数据收集", p: "Weacond 收集以下数据：(a) 注册信息（邮箱、用户名）；(b) 使用数据（页面访问、功能使用）；(c) 支付信息（通过 Stripe，Weacond 不存储信用卡号）；(d) 本地 AI 数据（完全在设备本地，不上传）。" },
    en: { h: "1. Data Collection", p: "Weacond collects the following: (a) registration data (email, username); (b) usage data (page views, feature use); (c) payment data (processed via Stripe; Weacond does not store card numbers); (d) local AI data (fully on-device, never uploaded)." },
  },
  {
    id: "usage",
    zh: { h: "2. 数据使用", p: "数据仅用于：(a) 提供服务；(b) 改善用户体验；(c) 发送通知和账单；(d) 安全与反欺诈。我们不出售用户数据。" },
    en: { h: "2. Data Usage", p: "Data is used only to: (a) provide the service; (b) improve user experience; (c) send notifications and billing; (d) ensure security and anti-fraud. We do not sell user data." },
  },
  {
    id: "local-ai",
    zh: { h: "3. 本地 AI 隐私", p: "Weacond 的本地 AI 功能（WebGPU + Qwen）在用户设备本地运行。交易数据、策略参数、持仓信息永不上传服务器。这是我们的核心设计原则。" },
    en: { h: "3. Local AI Privacy", p: "Weacond's local AI (WebGPU + Qwen) runs on your device. Trading data, strategy parameters, and holdings are never uploaded to a server. This is a core design principle." },
  },
  {
    id: "third-party",
    zh: { h: "4. 第三方服务", p: "我们使用以下第三方：Supabase（用户数据）、Stripe（支付）、Cloudflare R2（文件存储）。这些服务可能在不同地区处理数据，但受其各自隐私政策保护。" },
    en: { h: "4. Third-Party Services", p: "We use the following third parties: Supabase (user data), Stripe (payments), Cloudflare R2 (file storage). These services may process data in different regions, each governed by its own privacy policy." },
  },
  {
    id: "retention",
    zh: { h: "5. 数据保留", p: "用户数据在账户存续期间保留。账户关闭后 30 天内删除。审计日志保留 7 年以满足监管要求。" },
    en: { h: "5. Data Retention", p: "User data is retained for the life of the account and deleted within 30 days after closure. Audit logs are retained for 7 years to meet regulatory requirements." },
  },
  {
    id: "rights",
    zh: { h: "6. 用户权利", p: "用户可：(a) 查看自己的数据；(b) 请求更正；(c) 请求删除；(d) 导出数据；(e) 撤销同意。通过 weacond@gmail.com 联系。" },
    en: { h: "6. User Rights", p: "Users may: (a) access their data; (b) request correction; (c) request deletion; (d) export their data; (e) withdraw consent. Contact us at weacond@gmail.com." },
  },
  {
    id: "security",
    zh: { h: "7. 数据安全保障", p: "敏感数据加密存储（AES-256）。传输使用 HTTPS/TLS。访问控制基于角色（RBAC）。定期进行安全审计。计划取得 SOC 2 / ISO 27001 认证。" },
    en: { h: "7. Data Security", p: "Sensitive data is encrypted at rest (AES-256). In transit, HTTPS/TLS is used. Access control is role-based (RBAC). Regular security audits are conducted. SOC 2 / ISO 27001 certification is planned." },
  },
  {
    id: "cookies",
    zh: { h: "8. Cookie 与追踪", p: "我们使用必要的会话 Cookie 和可选的分析 Cookie。用户可在浏览器中管理 Cookie 设置。" },
    en: { h: "8. Cookies & Tracking", p: "We use necessary session cookies and optional analytics cookies. Users can manage cookie settings in their browser." },
  },
  {
    id: "cross-border",
    zh: { h: "9. 跨境数据传输与 GDPR", p: "用户数据可能在多个司法管辖区处理（含 Cloudflare / Supabase / Stripe 所在区域）。若用户位于欧盟 / 英国，平台在可行范围内提供标准合同条款（SCC）与数据主体权利（访问、更正、删除、可携带、反对、撤回同意）。" },
    en: { h: "9. Cross-Border Transfer & GDPR", p: "User data may be processed across jurisdictions (including regions hosting Cloudflare / Supabase / Stripe). For users in the EEA/UK, the Platform offers, where feasible, Standard Contractual Clauses (SCC) and data-subject rights (access, correction, deletion, portability, objection, withdrawal of consent)." },
  },
  {
    id: "deletion",
    zh: { h: "10. 数据删除程序", p: `用户可通过 ${PLATFORM_JURISDICTION.contactEmail} 请求删除个人数据。平台在收到请求后 30 天内处理；账户关闭后 30 天内删除可识别数据，审计日志按监管要求保留（最长 7 年）。法定义务要求保留的除外。` },
    en: { h: "10. Data Deletion Procedure", p: `Users may request deletion of personal data via ${PLATFORM_JURISDICTION.contactEmail}. The Platform acts within 30 days of a request; identifiable data is deleted within 30 days of account closure, while audit logs are retained as required by regulation (up to 7 years). Retention mandated by law is excepted.` },
  },
];

// ===== 页面级标签（标题 / 更新日期） =====
export const TERMS_META = {
  zh: { title: "服务条款", intro: "最后更新：2026 年 11 月" },
  en: { title: "Terms of Service", intro: "Last updated: November 2026" },
};
export const PRIVACY_META = {
  zh: { title: "隐私政策", intro: "最后更新：2026 年 11 月" },
  en: { title: "Privacy Policy", intro: "Last updated: November 2026" },
};
