// tests/analytics.test.mjs — 轻量事件埋点
import { test } from "node:test";
import assert from "node:assert/strict";
import {
  normalizeEvent, shouldTrack, buildPayload, track,
  isAllowedEvent, ALLOWED_EVENTS,
} from "../lib/analytics.js";

test("normalizeEvent：合并 props + 注入 ts/locale", () => {
  const e = normalizeEvent("page_view", { path: "/risk" }, { now: () => 1000, locale: "en" });
  assert.equal(e.type, "page_view");
  assert.equal(e.path, "/risk");
  assert.equal(e.ts, 1000);
  assert.equal(e.locale, "en");
});

test("normalizeEvent：默认 locale=zh，默认 now=Date.now", () => {
  const e = normalizeEvent("cta_click", {}, {});
  assert.equal(e.locale, "zh");
  assert.ok(typeof e.ts === "number");
});

test("normalizeEvent：type 非法 → 抛错", () => {
  assert.throws(() => normalizeEvent(123));
  assert.throws(() => normalizeEvent(""));
  assert.throws(() => normalizeEvent(null));
});

test("normalizeEvent：过滤 null/NaN props", () => {
  const e = normalizeEvent("tool_open", { a: null, b: NaN, c: 5 }, { now: () => 1 });
  assert.equal("a" in e, false);
  assert.equal("b" in e, false);
  assert.equal(e.c, 5);
});

test("shouldTrack：尊重 DNT 与 disabled", () => {
  assert.equal(shouldTrack({ dnt: true }), false);
  assert.equal(shouldTrack({ disabled: true }), false);
  assert.equal(shouldTrack({ dnt: false, disabled: false }), true);
  assert.equal(shouldTrack({}), true);
});

test("buildPayload：含 event/url/ua/ts", () => {
  const p = buildPayload({ type: "page_view" }, { url: "/x", ua: "ua", now: () => 5 });
  assert.equal(p.event.type, "page_view");
  assert.equal(p.url, "/x");
  assert.equal(p.ts, 5);
});

test("isAllowedEvent / 白名单", () => {
  assert.ok(isAllowedEvent("search"));
  assert.ok(isAllowedEvent("lang_switch"));
  assert.equal(isAllowedEvent("garbage_event"), false);
  assert.ok(ALLOWED_EVENTS.size >= 5);
});

test("track：允许 + 可上报 → payload；否则 null", () => {
  const ok = track("search", { q: "sharpe" }, { now: () => 1, locale: "en" });
  assert.ok(ok != null);
  assert.equal(ok.event.type, "search");
  assert.equal(ok.event.q, "sharpe");

  // DNT → null
  assert.equal(track("search", { q: "x" }, { dnt: true }), null);
  // 类型不允许 → null
  assert.equal(track("garbage", {}, {}), null);
});

test("track 结果 JSON 可序列化", () => {
  const ok = track("tool_open", { id: "risk" }, { now: () => 1 });
  const s = JSON.stringify(ok);
  assert.equal(JSON.parse(s).event.type, "tool_open");
});
