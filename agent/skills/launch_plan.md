---
description: Build a complete paid-social launch plan for a merchant's product: assumptions, funnel forecast, weekly budget split, and next steps.
---

# Launch plan procedure

Use this when a merchant wants a plan, a forecast, or asks "how should I spend $X".

1. **Collect the inputs.** You need the product, the price (average order value), the
   total budget, and the gross margin. Ask for at most two missing items; assume the
   rest and say what you assumed. Default margin is 50% if unknown.
2. **Pull assumptions.** Call `get_benchmarks` with the product description. Use the
   `conservative` figures for the forecast; the `median` figures are the target to
   grow into.
3. **Forecast.** Call `estimate_funnel` with the budget, the conservative benchmarks,
   the price, and the margin. Say once that the benchmarks are illustrative.
4. **Decide.** If the verdict pays back, continue. If it does not, lead with that,
   then pick the one lever in `leversToBreakEven` the merchant can realistically
   move (usually AOV through a bundle, or CVR through a better landing page) and
   re-run the forecast with it before writing the plan.
5. **Split the budget.** Call `plan_budget_split` with the total budget and the
   launch length (default 4 weeks).
6. **Write the plan** in this order, compact enough that each section fits a phone screen:
   - **Verdict** — one line: forecast orders, ROAS vs break-even, pays back or not.
   - **Week by week** — one line per week: budget, phase, the single thing to do.
   - **Assumptions** — the numbers used, labeled illustrative.
   - **First three actions** — concrete, startable tomorrow.
7. Offer to write hooks with the `write_ad_hooks` skill. Do not write them unasked.
