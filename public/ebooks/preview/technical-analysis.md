# Technical Analysis and Market Based Strategies

# Chapter 01 · Why Technical Analysis

## Hook

A chart is not a prophecy. It is a record. It is the footprint left by every order that touched the price of something, and it is the single cleanest picture we have of what the market is doing right now — a record of collective behavior, not a forecast of what is coming.

That distinction is the whole of this book. Technical analysis is a way of reading that record and of acting on the behavior it shows: the trend, the levels, the momentum, the volume, the breadth. It is one legitimate method for understanding price, and it is one that a serious, rule-bound investor can use. What it is not is a machine that reliably predicts the future. The gap between "a method that describes behavior" and "a tool that predicts price" is exactly where the honest use of this subject lives, and where the dishonest use of it — the one that sells you a crystal ball — fails.

This chapter does one thing: it frames technical analysis as a method, not a magic model, and states the three principles and the evidence boundary that every later chapter will lean on.

## Concept

**Simply put:** technical analysis is the study of price, volume, and the behavior that produces them, as a lens for understanding and acting on a market — not a claim that the past pattern will reliably produce the future one. It treats the price chart as the output of a system of participants, and it reads that output for structure (trend, level, momentum) rather than for a single certain future.

**record, lens, hypothesis:**

- *record:* a chart is a faithful log of what happened (price, volume, time). It is true by construction; it is not a claim about the future.
- *lens:* an indicator is a way of looking at the record (a smoother, a momentum gauge, a breadth count). It reorganizes the past to make a pattern visible; it does not create a future.
- *hypothesis:* a signal is a bet that the visible pattern has some predictive edge. It must be tested for base rate, cost, and regime — it is never guaranteed.

**The point.** A chart tells you what is; an indicator tells you how to see what is; a signal is a guess about what will, dressed up from a pattern you noticed. Confusing the three is the root of every TA mistake, so we name them separately and keep them separate throughout the book.

## Principle

**The mechanism:** three principles hold the subject together, and they are the spine of everything that follows.

1. A chart is a record, not a crystal ball. The line is what happened. To read it as what will happen is to mistake the output of a system for the input to it, and that mistake is the first thing every chapter corrects.
2. An indicator is a lens and a lag, not a prophecy. Nearly every indicator — moving average, RSI, MACD, volume — is built from past price or past volume. It smooths or restates the record it describes, and in doing so it lags the very move it is meant to catch.
3. A signal is a hypothesis to test, not a guarantee. A pattern has a base rate (how often it has worked), a cost (what trading it costs you), and a regime (the market conditions under which it worked). Without all three, "the signal fired" says nothing about the future.

These three are joined by an evidence boundary that the book keeps in view: transaction costs, the sample you tested on, data-mining (find enough patterns and you find everything), and regime dependence (what worked stops working). Technical analysis is a method, not a magic model. And it is not welded to fundamental analysis into one theory: fundamentals read the value of the thing, technicals read the behavior of the price. They answer different questions, and forcing them into a single framework corrupts both.

## Historical cases

> 📌 **Note on the numbers:** the years and instruments below are anchors tagged †; the magnitudes are illustrative estimates †. († = an illustrative estimate; figures vary by source)

- **1900s–1930s, charting becomes a discipline.** The popularization of candlestick and chart patterns in the early 20th century (the tradition credited to Japanese rice-trading methods and to Western chartists such as those around the 1929 era) established reading the chart as a practice †. Conclusion: charting became a method people use before anyone claimed it predicted; the method and the prediction claim were never the same thing.
- **1960s–1970s, the efficient-market challenge.** Academic work in this period (the strong claims about prices reflecting all available information) argued that simple chart patterns carry no edge, because a visible pattern is arbitraged away †. Conclusion: the "patterns have no predictive power" camp is the evidence boundary in its pure form — a signal you can see is a signal the market can see.
- **2000s–2010s, quant adoption and the cost problem.** Systematic and trend-following funds (the managed-futures era) treated technical signals as tradable rules, and the literature on transaction costs showed that high-turnover signal-following often loses to its own friction †. Conclusion: the most serious users of TA are the ones who model the cost of trading the signal, which is the discipline this book keeps repeating.

The three cases bracket the honest position: a method people use (1900s), a challenge to its predictive claim (1960s), and a cost-aware adoption of it as a rule (2000s). All three treat TA as behavior, not prophecy.

## Numeric example

Take the single most common "signal": a price that is rising and a moving average that lags it. Suppose a price moves from 100 to 150 over sixty days. A 200-day moving average that starts at 100 and adds the new prices will, after sixty days, sit far below 150 — roughly it is the average of the last 200 prices, most of which are still near 100, so the moving average might be near 110 while the price is 150 `(illustrative estimate; figures vary by source)`. The "golden cross" (a short average crossing above a long one) is a lagging event: it confirms the move that already happened, weeks after it started. The number that matters is not the signal; it is the lag between the move and the signal, because the lag is exactly the part of the move you did not catch. A lagging signal that confirms a trend you already missed is still useful as a stay-in rule — it tells you the trend is intact — but it is not an entry that captured the gain.

## Common mistakes

- Treating a chart as a forecast, when it is a record of what already happened.
- Reading an indicator as a predictor, when it is a lens that lags the price it describes.
- Taking a signal as a guarantee, when it is a hypothesis that needs a base rate, a cost, and a regime.
- Welding technical and fundamental analysis into one theory, when they answer different questions (behavior of price vs. value of the thing).
- Ignoring the cost of trading the signal, so the edge the signal shows is eaten by friction.
- Believing that because a pattern worked in one sample it must work in the next, when regimes change.

## Different contexts

Different markets and different timeframes use technical analysis in different ways, and the discipline is the same in each. In a liquid, trending market the trend-following signals are more useful, because the trend they follow is real and persistent. In a narrow, range-bound market the mean-reversion and level signals are more useful, because price is snapping between support and resistance. In a high-frequency setting the same signals decay fast and the transaction cost dominates, so the honest move is to slow down. In a crisis the rules that worked in calm markets break, because the regime itself has changed. In every case the lens is the same: read the record, recognize the regime, size the bet, and respect the cost.

## Practical framework and summary

**The moves.**

1. State what a chart is: a record of price and behavior, true by construction, not a claim about the future.
2. State what an indicator is: a lens and a lag, built from the past it describes.
3. State what a signal is: a hypothesis to test on base rate, cost, and regime.
4. Keep technical and fundamental analysis separate; they answer different questions.
5. Keep the evidence boundary in view: transaction costs, sample, data-mining, regime dependence.
6. Use TA as a method for understanding and acting on behavior, not as a predictor of price.

**Decision rule:** if a claim about TA promises to predict a future price from a past pattern, treat it as a sales pitch, not a method. If it reads the record, names the regime, sizes the bet, and respects the cost, it is a method.

**If then:** if the signal is "the past pattern will repeat," then you are predicting and you should test it; if the signal is "the current behavior suggests a regime," then you are using TA honestly and you may act.

**Summary in three sentences:** Technical analysis is a disciplined way of reading the record of price and the behavior that produces it, not a machine for predicting the future. Its indicators are lenses that lag, and its signals are hypotheses that must survive a base rate, a cost, and a regime. The book that follows treats TA as a method and a risk-management discipline, never as a magic model.

**One thing you can do today:** look at one chart you hold and write down, in three lines, what it is recording (the trend, the level, the volume) and what it is not (a forecast) — the difference is the whole skill.

---

*This content is not investment advice. Markets carry risk; enter with caution.*

