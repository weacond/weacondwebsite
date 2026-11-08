# Bonds and Fixed Income

# Chapter 01 · What Is a Bond: The Promise Behind the Price

## Hook

Buy a stock and you own a claim on a company's future profits; the payoff is uncertain and, in principle, endless. Buy a bond and you hold something far more specific: a **contractual promise** that a named borrower will pay you a schedule of interest and return your money on a fixed date. That single fact — a date and a schedule, not a hope — is the source of both a bond's safety and its subtlety.

This chapter does one thing: it establishes that a bond is a dated, interest-bearing promise, and shows how that definition makes a bond at once simpler and stranger than a stock.

## Concept

**Simply put:** a bond is a loan you make to a borrower. You lend a set amount; the borrower pays you interest at regular intervals and returns the principal on a maturity date. The borrower is usually a government or a company; the price you pay can differ from the face value, and that difference is where all the interesting behavior begins.

The promise is fully specified by four numbers:

- *Principal:* the face amount repaid at maturity.
- *Why it matters:* every other bond calculation is a claim about how much of this amount you get back.
- *How to use it:* treat it as the anchor — price, yield, and duration are all expressed relative to it.

- *Coupon:* the periodic interest paid, usually a fixed percentage of the face value.
- *Why it matters:* it is the income the bond produces while you hold it, and the first thing investors compare.
- *How to use it:* read it as an annual stream, not a one-time gift.

- *Maturity (term):* the date the principal is returned.
- *Why it matters:* it fixes the horizon of your commitment and the window of risk.
- *How to use it:* a longer maturity means you are exposed to interest-rate risk for longer.

**The point.** A bond is not a single price; it is a **schedule of future cash flows** with a known date and a known size. Everything that follows in this book — yield, duration, spreads — is machinery for translating that schedule into a single number you can compare against other investments.

## Principle

**The mechanism:** a bond's worth is the present value of its promised cash flows, discounted at the rate investors demand. Three forces decide that value:

1. ***Time.*** A dollar promised in ten years is worth less than a dollar today; the farther the maturity, the more each promised payment is discounted.
2. **The discount rate.** When the rate investors require rises, every promised payment is worth less today, so the bond's price falls.
3. ***Credit.*** The more doubt that the borrower will pay, the higher the rate demanded, and the lower the price.

## Historical cases

Bonds are older than stocks, and their history is a history of promises kept and broken.

- **15th–16th-century Italian and Flemish bonds** were among the first long-dated instruments, and they financed states and cities for centuries. Magnitude: they traded on exchanges and were held for generations. Conclusion: the "dated promise" model is not a modern invention but a centuries-old device. (illustrative historical framing; figures vary by source)
- **British Consols (1751).** A perpetual government bond with no maturity date and a fixed coupon. Magnitude: they survived for over two centuries and traded at prices far from their coupon-implied value. Conclusion: even without a maturity date, a promise with a known payment can be priced. †
- **The Great Depression long bonds (1913–1942).** A famous account holds that an investor buying a 30-year U.S. government bond in 1913 and holding it to 1942 saw the price rise, yet after the price fell with the deflation of the 1930s the **real** return was sharply negative. Magnitude: a paper gain, a real loss. Conclusion: a bond can "mature safely" and still lose purchasing power. †
- **The 1980s Treasury bonds.** When U.S. interest rates spiked to nearly 16% in 1981, long bonds bought years earlier fell steeply in price. Magnitude: long-term bond funds lost double-digit percentage points. Conclusion: a bond can be "safe" in the sense of being repaid and "dangerous" in the sense of falling in value. †

> 📌 **Note on the numbers:** the Consol price history, the 1913–1942 long-bond real return, and the 1980s fund losses are cited as directional, historical illustrations; verify exact figures for any use. († = an illustrative estimate; figures vary by source)

## Numeric example

A $100 face-value bond, 5% coupon, ten years to maturity. Its price depends entirely on the discount rate investors require.

- Discount rate 5% (equal to the coupon): price = **$100.00** — the bond trades at **par**, coupon equals yield.
- Discount rate 6% (higher than the coupon): price = **$92.64** — it trades at a **discount**, the buyer is compensated for a low coupon by paying less and earning the difference at maturity.
- Discount rate 4% (lower than the coupon): price = **$108.11** — it trades at a **premium**, the seller accepts a price above face because the coupon is generous.

The same promise, three prices. Move the discount rate up and the price falls; move it down and the price rises. This inverse relationship — the price-yield law — is the spine of every later chapter, and it is already visible in these three numbers.

## Common mistakes

- **Thinking a bond is "risk-free" because it is safe.** It may be safe to **repay**; it is rarely safe in **price**. A 30-year bond can lose a third of its value on a rate move.
- **Confusing coupon with yield.** The coupon is a fixed dollar amount set at issuance; the yield is the annualized return **you actually get**, which depends on the price you pay. They are equal only at par.
- **Ignoring the maturity.** A two-year bond and a thirty-year bond with the same coupon are not the same bet: the longer one is far more sensitive to interest rates.
- **Assuming a bond pays a fixed total return.** The price you pay, the price you sell for, and the coupons received together determine your return — and the first two move with interest rates.

## Different contexts

- **A short-term government bond** is the "cash on the shelf" of the bond world: it barely moves in price and is used to park money safely.
- **A long-term government bond** is an **interest-rate bet**: it is stable in credit but volatile in price, and is how investors take a view on where rates will go.
- **A corporate bond** trades off safety for a higher coupon: you accept some default risk in exchange for extra yield.
- **A municipal ("muni") bond** is a distinct issuer category: the bonds of US state and local governments, whose interest is often *exempt* from federal income tax and, when in-state, from state tax too. That tax break is *the whole point* of the instrument, and it is measured by a **tax-equivalent yield**, the muni yield divided by *(1 minus your marginal tax rate)*, so it can be compared fairly with a *taxable* Treasury of the same safety and maturity. The mechanism is a trade, not a gift: because the tax benefit only *exists* for someone in a tax bracket, a *zero-bracket* holder forgoes the entire advantage and is *strictly worse off* holding the muni over a Treasury, while a high-bracket holder can come out ahead even though the muni's *nominal* coupon is lower. The honest risks: munis are *not* principal-guaranteed, they *can default* (a handful of municipalities, and a sovereign such as Puerto Rico, have), they are *less liquid* than Treasuries, and the tax break can be *clawed back* by future law. So the decision is a *person-dependent* calculation on your own bracket and horizon, not a default "safer" asset. (illustrative: the mechanism is qualitative; any specific yield or bracket figure is not a quote)
- **For a household** the difference matters most in the short run: a bond can be a gentle, predictable income and a sudden, steep price loss at the same time, depending on how long you hold it.

## Practical framework and summary

**The moves:**

1. **Name the four numbers** — face value, coupon, maturity, and credit — before you name the price.
2. **Separate safety from value.** "Will it be repaid?" and "Will its price fall?" are two different questions.
3. **Read the coupon as a stream,** not a lump; read the price as a function of the discount rate, not a fixed fact.

**Decision rule:** if you can name the four numbers and separate repayment safety from price risk, you can read any bond quote.

**If–then:** if a bond is "safe," check **what kind** of safety — repayment or price — before you rely on it.

**Summary in three sentences:** A bond is a dated, interest-bearing promise defined by four numbers. Its price is the present value of that promise, and it moves inversely to the discount rate. Master this single idea and the rest of fixed income becomes arithmetic on top of it.

**One thing you can do today:** before evaluating any bond, write down its face value, coupon, and maturity, and ask whether "safe" means "will be repaid" or "won't fall in price" — because a bond can be both safe and dangerous at once.

---

*This content is not investment advice. Markets carry risk; enter with caution.*

