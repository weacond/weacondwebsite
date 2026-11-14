// lib/mcp/schema.js — 极简 JSON Schema 校验器（无外部依赖，Edge/Node 通用）
//
// 支持子集（足够校验计算器数值入参）：
//   type / properties / required / minimum / maximum / exclusiveMinimum /
//   exclusiveMaximum / enum / additionalProperties:false / items /
//   minLength / pattern / default。
// 更复杂的 schema（$ref、allOf、format 等）请换正式库；本实现刻意保持轻量。
//
// 返回 { valid:boolean, errors:string[] }；errors 为人类/模型可读的中文提示。

function jsType(v) {
  if (v === null) return "null";
  if (Array.isArray(v)) return "array";
  return typeof v;
}

function typeMatches(type, v) {
  if (Array.isArray(type)) return type.some((t) => typeMatches(t, v));
  switch (type) {
    case "object":
      return v !== null && typeof v === "object" && !Array.isArray(v);
    case "array":
      return Array.isArray(v);
    case "string":
      return typeof v === "string";
    case "number":
      return typeof v === "number" && Number.isFinite(v);
    case "integer":
      return typeof v === "number" && Number.isInteger(v);
    case "boolean":
      return typeof v === "boolean";
    case "null":
      return v === null;
    default:
      return true;
  }
}

/**
 * 校验 data 是否符合 schema。
 * @param {object} schema JSON Schema（子集）
 * @param {*} data 待校验数据
 * @returns {{valid:boolean, errors:string[]}}
 */
export function validateSchema(schema, data) {
  const errors = [];
  walk(schema, data, "$", errors);
  return { valid: errors.length === 0, errors };
}

function walk(schema, data, label, errors) {
  if (!schema || typeof schema !== "object") return;

  // 类型
  if (schema.type && !typeMatches(schema.type, data)) {
    errors.push(`${label}: 期望 ${Array.isArray(schema.type) ? schema.type.join("|") : schema.type}，实际 ${jsType(data)}`);
    return; // 类型不符，不再深入子结构
  }

  // 枚举
  if (Array.isArray(schema.enum) && !schema.enum.includes(data)) {
    errors.push(`${label}: 必须是 [${schema.enum.join(", ")}] 之一`);
  }

  // 数值边界
  if (typeof data === "number") {
    if (schema.minimum !== undefined && data < schema.minimum) errors.push(`${label}: 须 ≥ ${schema.minimum}`);
    if (schema.maximum !== undefined && data > schema.maximum) errors.push(`${label}: 须 ≤ ${schema.maximum}`);
    if (schema.exclusiveMinimum !== undefined && data <= schema.exclusiveMinimum) errors.push(`${label}: 须 > ${schema.exclusiveMinimum}`);
    if (schema.exclusiveMaximum !== undefined && data >= schema.exclusiveMaximum) errors.push(`${label}: 须 < ${schema.exclusiveMaximum}`);
  }

  // 字符串
  if (typeof data === "string") {
    if (schema.minLength !== undefined && data.length < schema.minLength) errors.push(`${label}: 至少 ${schema.minLength} 字符`);
    if (schema.pattern !== undefined && !new RegExp(schema.pattern).test(data)) errors.push(`${label}: 不匹配模式 ${schema.pattern}`);
  }

  // 对象
  if (schema.type === "object" && data !== null && typeof data === "object" && !Array.isArray(data)) {
    if (Array.isArray(schema.required)) {
      for (const k of schema.required) {
        if (data[k] === undefined || data[k] === null) errors.push(`${label}.${k}: 必填`);
      }
    }
    if (schema.properties) {
      for (const [k, sub] of Object.entries(schema.properties)) {
        if (k in data) walk(sub, data[k], `${label}.${k}`, errors);
      }
    }
    if (schema.additionalProperties === false && schema.properties) {
      for (const k of Object.keys(data)) {
        if (!Object.prototype.hasOwnProperty.call(schema.properties, k)) errors.push(`${label}: 未知字段 "${k}"`);
      }
    }
  }

  // 数组
  if (schema.type === "array" && Array.isArray(data) && schema.items) {
    data.forEach((it, i) => walk(schema.items, it, `${label}[${i}]`, errors));
  }
}
