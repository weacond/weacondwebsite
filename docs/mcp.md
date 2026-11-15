# Weacond MCP Endpoint

> Expose Weacond's deterministic, bilingual financial calculators as **Model Context
> Protocol (MCP)** tools that AI assistants and search engines can call over stateless
> JSON-RPC 2.0 on HTTP.
>
> Public, bilingual endpoint doc: <https://weacond.com/mcp>

## Why

Weacond is a deterministic, bilingual, educational layer of financial calculation —
Kelly sizing, ATR stop, risk of ruin, risk budget, drawdown sizing, leverage /
liquidation, slippage, take-profit / trailing stop, FX pip / cross / interest-parity,
rebalancing, portfolio beta, NPV, and more. The MCP endpoint exposes these as
**AI-callable tools**, so an agent can run the math *deterministically* (pure
functions, full unit tests) instead of approximating it.

The same engine serves two surfaces:

- **People / education** — calculator pages + glossary + concept cross-links.
- **AI agents** — the same functions exposed as MCP tools (`/api/mcp`).

Each MCP tool links back to its calculator page (e.g. `kelly` → `/kelly`), closing a
bidirectional loop.

## Endpoint

| Field | Value |
|-------|-------|
| **URL** | `https://weacond.com/api/mcp` |
| **Protocol** | Model Context Protocol · JSON-RPC 2.0 over HTTP (stateless) |
| **Runtimes** | Vercel + Cloudflare Edge (zero external dependencies) |
| **Auth** | Open by default (good for GEO crawlability); set `MCP_API_KEY` to lock |
| **Rate limit** | `MCP_RATE_LIMIT_PER_MIN` (default 60, per-IP token bucket) |

Stateless by design: no session handshake — each request is self-contained and carries
the negotiated protocol version, so it runs unchanged on either runtime.

## Quick start

### 1. List the tools

```
POST /api/mcp
{ "jsonrpc": "2.0", "id": 1, "method": "tools/list", "params": {} }
```

### 2. Call a tool (example: `kelly`)

```
POST /api/mcp
{
  "jsonrpc": "2.0", "id": 2, "method": "tools/call",
  "params": { "name": "kelly", "arguments": { "winRate": 0.55, "odds": 1 } }
}
```

Each tool declares a JSON Schema input contract; invalid inputs return a structured
`isError` result (unknown tool, bad argument, or domain-validation failure).

### 3. Point an MCP client at the HTTP endpoint

The exact client config **shape varies by client**; for an HTTP-based MCP server it is
generally a URL + transport type, e.g.

```json
{
  "mcpServers": {
    "weacond": { "url": "https://weacond.com/api/mcp", "type": "http" }
  }
}
```

Adjust to your client's schema (some expect `command`/`args` for stdio; Weacond is
HTTP, so use the URL/transport form your client supports).

## Tools

48 high-intent calculators, each with a JSON Schema input contract and a back-link to
its calculator page. The full live catalog (with per-tool schemas + copy-to-use
examples) is at <https://weacond.com/mcp>. Representative tools:

| Tool | Calculator page | What it computes |
|------|-----------------|------------------|
| `kelly` | `/kelly` | Kelly / fractional-Kelly position fraction |
| `atr_stop` | `/atr-stop` | ATR-based stop distance |
| `risk_of_ruin` | `/risk-ruin` | Probability of ruin |
| `risk_budget` | `/risk-budget` | Risk-budget position size |
| `drawdown_sizing` | `/drawdown-sizing` | Sizing to cap max drawdown |
| `leverage` | `/leverage` | Leverage P/L, liquidation price/move, band |
| `slippage` | `/slippage` | Slippage cost on fill |
| `fx_pip` | `/fx-pip` | FX pip value |
| `fx_cross` | `/fx-cross` | FX cross rate |
| `interest_parity` | `/interest-parity` | Forward rate + carry premium |
| `rebalance` | `/rebalance` | Rebalancing bonus |
| `beta` | `/portfolio-beta` | Portfolio beta |
| `npv` | `/npv` | Net present value |

…and 35 more — see the live catalog.

## Environment variables

| Variable | Default | Notes |
|----------|---------|-------|
| `MCP_API_KEY` | unset | When set, requests need `Authorization: Bearer` or `x-api-key`. The key is **never** returned to clients. |
| `MCP_RATE_LIMIT_PER_MIN` | 60 | Per-IP requests/min (token bucket; degrades per-instance on stateless runtimes). |
| `MCP_PROTOCOL_VERSION` | 2026-03-26 | Negotiated MCP protocol version; overridable. |

## Compliance

All results are for **educational and research purposes only** — not investment,
financial, or legal advice. Past performance does not guarantee future results.

## See also

- Public bilingual endpoint doc: <https://weacond.com/mcp>
- All calculators: <https://weacond.com/calculators>
- Capability comparison: <https://weacond.com/weacond-vs>
