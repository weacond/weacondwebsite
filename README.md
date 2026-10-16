# Weacond - Financial Decision Platform

> AI + Quant + Education. Make investing easy, smart, stable.

## Architecture

- **Hosting**: Cloudflare Pages (global CDN, free commercial use)
- **Storage**: Cloudflare R2 (replaces Notion, zero egress fee)
- **Auth/DB**: Supabase (PostgreSQL + Auth, free tier)
- **Payments**: Stripe (global standard)
- **Local AI**: WebGPU + Qwen 7B/14B (data stays local, zero inference cost)
- **CI/CD**: GitHub Actions auto deploy to Cloudflare Pages

## Tech Stack

- **Frontend**: Next.js 14, React 18, Tailwind CSS, PWA
- **Backend**: Cloudflare Workers, R2, Supabase
- **AI**: WebGPU + Qwen GGUF (Apache 2.0 license)
- **Payments**: Stripe
- **Notifications**: Web Push, Email

## Pricing

| Plan | Monthly | Yearly | Core Features |
|------|---------|--------|---------------|
| Free | $0 | $0 | Daily signal digest + 3-day trial |
| Basic | $9.9 | $99 | Technical signals + ebooks + tasks |
| **PutSeller** | **$29.9** | **$299** | 5-10 puts/day + IV Rank + Greeks + risk mgmt |
| ProQuant | $149 | $1490 | Backtesting + Paper trading + Real-time WS + API |
| Enterprise | $999+ | Custom | White-label + Self-host + SLA + Copy trading |

## Quick Start

1. `npm install`
2. `cp .env.example .env.local`
3. Fill in R2 / Supabase / Stripe config
4. `npm run dev`
5. `STATIC_EXPORT=true npm run build`
6. `npm run deploy`

## Data Flow

- **Ebooks**: GitHub to R2 (sync) to build-time fetch to page render
- **Signals**: Market API to Workers to 3-Engine (Fundamental+Technical+Volatility) to SignalCard to User
- **AI**: User device (WebGPU) to Qwen GGUF to local inference
- **Payments**: User to Stripe Checkout to Webhook to Supabase update
- **Notifications**: Workers to Web Push / Email

## Directory Structure

- `pages/` - Next.js pages (index, signals, pricing, about, contact, login, dashboard, terms, privacy, ebooks)
- `pages/api/` - API routes (auth, checkout, webhook)
- `components/` - Shared components (Navbar)
- `lib/` - Core libraries (r2, supabase, stripe, signals)
- `public/ebooks/` - R2 sync source (index.json + markdown content)
- `scripts/` - Utility scripts (syncR2.js)

## Financial Compliance

- All content labeled "educational/reference, not investment advice"
- SignalCards include data source + explainability
- Backtesting shows assumptions (slippage/commission/dividends)
- KYC/AML required for enterprise tier
- Data encryption (AES-256) + 7-year audit logs

## License

- Open source components: Apache 2.0 / MIT
- Platform code: Commercial
- Financial signals/strategies: Weacond IP

## Disclaimer

All content on this platform is for educational and research purposes only.
It does not constitute financial advice, investment advice, or a recommendation
to buy or sell any financial instrument. Investing involves risk, including
the loss of principal.

## Ebook System

### Architecture

- User flow: /ebooks → /ebooks/[slug] → Stripe Checkout → Webhook → Supabase purchase
- Download: /api/download?slug=X&format=pdf → verify purchase → R2 signed URL (30-day)
- R2 bucket: weacond-ebooks/ with index.json, content/*.md, files/*.pdf/epub/html, covers/*.jpg

### Adding a New Book

1. Add MD file to public/ebooks/content/
2. Add entry to public/ebooks/index.json (include files field with pdf/epub/html paths)
3. Place PDF/EPUB/HTML in public/ebooks/files/
4. Create Product in Stripe Dashboard
5. Push to main → CI auto-syncs to R2

### Legal Compliance

- GDPR: Supabase in EU region
- Copyright: All content original, authored by weacond
- DMCA: Add takedown policy to /terms
- Tax: Stripe handles VAT/GST automatically
- Privacy: /privacy discloses email-only data collection
