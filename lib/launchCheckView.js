// lib/launchCheckView.js — 纯函数：把 /api/launch-check 的 report 渲染成前台可用结构。
// 职责：i18n（页面外壳）+ 进度 + 分组（todo/recommended/optional）。SSR/Edge 安全，无网络、无浏览器 API。
// 说明：项目标签（what/where/hint）沿用 READINESS_CHECKS 的中文（内部运营页，作者双语）；
//       页面外壳（标题/状态/分组名）按 lang 切换。

const LANG = {
  zh: {
    title: "上线就绪清单",
    subtitle: "核心服务配置进度（内部运营用，不对外）",
    ready: "✅ 可上线",
    notReady: "⏳ 还有 %N% 项未完成",
    progressLabel: "已配置",
    todoTitle: "上线前必做（Blocker）",
    recommendedTitle: "建议做",
    optionalTitle: "可选",
    whereLabel: "在哪配",
    empty: "暂无",
    note: "本清单只显示各服务是否已配置，绝不回传密钥值。",
    tip: "全部 Blocker 完成即可上线；建议项/可选项不影响上线。",
    banner: "内部运营页 · 非公开",
  },
  en: {
    title: "Launch Readiness",
    subtitle: "Core service config progress (internal ops, not public)",
    ready: "✅ Ready to launch",
    notReady: "⏳ %N% item(s) remaining",
    progressLabel: "Configured",
    todoTitle: "Must-do before launch (Blockers)",
    recommendedTitle: "Recommended",
    optionalTitle: "Optional",
    whereLabel: "Where",
    empty: "None",
    note: "This checklist only shows whether each service is configured — no secrets are exposed.",
    tip: "Launch when all blockers are done; recommended/optional do not block launch.",
    banner: "Internal ops page · not public",
  },
};

// 把单个 check 规整成渲染需要的字段
function norm(c) {
  return {
    what: c.what,
    where: c.where || "",
    hint: c.hint || "",
    severity: c.severity || "optional",
  };
}

// 主函数：report（/api/launch-check 的 JSON）-> 渲染结构
export function formatReport(report, lang = "zh") {
  const L = LANG[lang] || LANG.zh;
  const s = (report && report.summary) || {};
  const total = s.total || 0;
  const configured = s.configured || 0;
  const progressPct = total ? Math.round((configured / total) * 100) : 0;
  const ready = !!(report && report.ready);
  const remaining = (report && report.todo ? report.todo.length : 0);

  const groups = [
    {
      key: "todo",
      title: L.todoTitle,
      items: (report && report.todo ? report.todo : []).map(norm),
      // blocker 组：空则显示「已清零」而非隐藏（让运营确认）
      showEmpty: true,
    },
    {
      key: "recommended",
      title: L.recommendedTitle,
      items: (report && report.recommended ? report.recommended : []).map(norm),
      showEmpty: false,
    },
    {
      key: "optional",
      title: L.optionalTitle,
      items: (report && report.optional ? report.optional : []).map(norm),
      showEmpty: false,
    },
  ];

  return {
    title: L.title,
    subtitle: L.subtitle,
    banner: L.banner,
    ready,
    statusLabel: ready ? L.ready : L.notReady.replace("%N%", String(remaining)),
    progressPct,
    progressLabel: L.progressLabel,
    configured,
    total,
    groups,
    emptyLabel: L.empty,
    whereLabel: L.whereLabel,
    note: L.note,
    tip: L.tip,
  };
}

// 进度条分段（纯计算，供 UI 渲染）：done / pending 百分比
export function progressSegments(report) {
  const s = (report && report.summary) || {};
  const total = s.total || 1;
  const configured = s.configured || 0;
  const donePct = total ? Math.round((configured / total) * 100) : 0;
  return { donePct, pendingPct: 100 - donePct };
}

export default formatReport;
