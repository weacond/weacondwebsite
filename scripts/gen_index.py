import json, os
b = [
{"slug":"rational-101","title_cn":"理性投资入门","title_en":"Rational Investing 101","price_cents":0,"type":"free","category":"basics"},
{"slug":"behavioral-biases","title_cn":"行为偏差识别","title_en":"Behavioral Biases","price_cents":0,"type":"free","category":"basics"},
{"slug":"macro-basics","title_cn":"宏观经济基础","title_en":"Macro Economics Basics","price_cents":0,"type":"free","category":"basics"},
{"slug":"equity-pricing","title_cn":"股票定价模型","title_en":"Equity Pricing Models","price_cents":9900,"type":"paid","category":"advanced"},
{"slug":"risk-management","title_cn":"风险管理框架","title_en":"Risk Management Framework","price_cents":9900,"type":"paid","category":"advanced"},
{"slug":"portfolio-theory","title_cn":"投资组合理论","title_en":"Portfolio Theory","price_cents":9900,"type":"paid","category":"advanced"},
{"slug":"options-strategies","title_cn":"期权策略手册","title_en":"Options Strategies","price_cents":12900,"type":"paid","category":"derivatives"},
{"slug":"futures-trading","title_cn":"期货交易实务","title_en":"Futures Trading","price_cents":12900,"type":"paid","category":"derivatives"},
{"slug":"quant-coding","title_cn":"量化编程基础","title_en":"Quantitative Coding","price_cents":14900,"type":"paid","category":"quant"},
{"slug":"backtesting","title_cn":"回测方法论","title_en":"Backtesting Methodology","price_cents":14900,"type":"paid","category":"quant"},
{"slug":"market-microstructure","title_cn":"市场微观结构","title_en":"Market Microstructure","price_cents":14900,"type":"paid","category":"advanced"},
{"slug":"fixed-income","title_cn":"固定收益分析","title_en":"Fixed Income Analysis","price_cents":12900,"type":"paid","category":"bonds"},
{"slug":"reits","title_cn":"REITs 投资","title_en":"REITs Investing","price_cents":8900,"type":"paid","category":"alternative"},
{"slug":"crypto-investing","title_cn":"加密货币投资","title_en":"Crypto Investing","price_cents":9900,"type":"paid","category":"alternative"},
{"slug":"emerging-markets","title_cn":"新兴市场","title_en":"Emerging Markets","price_cents":9900,"type":"paid","category":"global"},
{"slug":"etf-guide","title_cn":"ETF 完全指南","title_en":"ETF Complete Guide","price_cents":7900,"type":"paid","category":"basics"},
{"slug":"tax-optimization","title_cn":"税务优化","title_en":"Tax Optimization","price_cents":8900,"type":"paid","category":"basics"},
{"slug":"retirement-planning","title_cn":"退休规划","title_en":"Retirement Planning","price_cents":9900,"type":"paid","category":"personal"},
{"slug":"asset-allocation","title_cn":"资产配置","title_en":"Asset Allocation","price_cents":10900,"type":"paid","category":"advanced"},
{"slug":"index-investing","title_cn":"指数投资","title_en":"Index Investing","price_cents":7900,"type":"paid","category":"basics"},
{"slug":"value-investing","title_cn":"价值投资","title_en":"Value Investing","price_cents":9900,"type":"paid","category":"basics"},
{"slug":"momentum-trading","title_cn":"动量交易","title_en":"Momentum Trading","price_cents":11900,"type":"paid","category":"advanced"},
{"slug":"event-driven","title_cn":"事件驱动策略","title_en":"Event-Driven Strategies","price_cents":14900,"type":"paid","category":"quant"},
{"slug":"high-frequency","title_cn":"高频交易入门","title_en":"HFT Introduction","price_cents":16900,"type":"paid","category":"quant"},
{"slug":"black-swan","title_cn":"黑天鹅应对","title_en":"Black Swan Response","price_cents":12900,"type":"paid","category":"advanced"},
]
for x in b:
  x["preview"] = f"preview/{x['slug']}.md"
  x["content"] = f"content/{x['slug']}.md"
out = os.path.join(os.path.dirname(__file__), "..", "public", "ebooks", "index.json")
# ⚠️  DEPRECATED — 这是旧的“3 本免费”生成器，一旦运行会把 index.json 覆盖回旧模型，
#     丢掉“25 本全付费 + 双语描述”的新结构。已停用，改为熔断提示。
import sys
print("⚠️  DEPRECATED: gen_index.py 是旧的 3 本免费模型生成器。")
print("   运行它会覆盖 public/ebooks/index.json，回退掉全付费 + 双语描述。")
print("   请改用新生成器：  node scripts/genEbooks.mjs")
sys.exit(1)