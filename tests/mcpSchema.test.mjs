// tests/mcpSchema.test.mjs — 极简 JSON Schema 校验器
import { test } from "node:test";
import assert from "node:assert/strict";
import { validateSchema } from "../lib/mcp/schema.js";

test("合法对象通过", () => {
  const schema = {
    type: "object",
    properties: { p: { type: "number", minimum: 0, maximum: 1 } },
    required: ["p"],
    additionalProperties: false,
  };
  const r = validateSchema(schema, { p: 0.55 });
  assert.equal(r.valid, true);
  assert.deepEqual(r.errors, []);
});

test("缺必填字段报必填错误", () => {
  const schema = { type: "object", required: ["p"] };
  const r = validateSchema(schema, {});
  assert.equal(r.valid, false);
  assert.ok(r.errors.some((e) => e.includes("p") && e.includes("必填")));
});

test("类型不符报类型错误", () => {
  const r = validateSchema({ type: "object", properties: { p: { type: "number" } } }, { p: "x" });
  assert.equal(r.valid, false);
  assert.ok(r.errors.some((e) => e.includes("期望 number")));
});

test("数值边界 minimum/maximum/exclusiveMinimum", () => {
  assert.equal(validateSchema({ type: "number", minimum: 0, maximum: 1 }, 1.5).valid, false);
  assert.equal(validateSchema({ type: "number", exclusiveMinimum: 0 }, 0).valid, false);
  assert.equal(validateSchema({ type: "number", exclusiveMinimum: 0 }, 0.01).valid, true);
});

test("enum 与 additionalProperties:false", () => {
  assert.equal(validateSchema({ enum: ["long", "short"] }, "up").valid, false);
  assert.equal(validateSchema({ enum: ["long", "short"] }, "long").valid, true);
  const schema = { type: "object", properties: { a: {} }, additionalProperties: false };
  const r = validateSchema(schema, { a: 1, b: 2 });
  assert.equal(r.valid, false);
  assert.ok(r.errors.some((e) => e.includes("未知字段")));
});

test("嵌套对象与数组校验", () => {
  const schema = {
    type: "object",
    properties: {
      items: { type: "array", items: { type: "number", minimum: 0 } },
    },
  };
  assert.equal(validateSchema(schema, { items: [1, 2, -3] }).valid, false);
  assert.equal(validateSchema(schema, { items: [1, 2, 3] }).valid, true);
});
