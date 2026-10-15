import { defineTool } from "eve/tools";
import { z } from "zod";

export default defineTool({
  description:
    "Forecast a paid-social funnel from budget and assumptions: impressions, clicks, orders, revenue, CPA, ROAS, and whether the plan pays back. Use benchmark figures from get_benchmarks unless the merchant has real numbers.",
  inputSchema: z.object({
    budgetUsd: z.number().positive().describe("Total ad spend in USD for the period."),
    cpmUsd: z.number().positive().describe("Cost per 1,000 impressions in USD."),
    ctrPct: z.number().positive().max(100).describe("Click-through rate in percent, e.g. 1.2 for 1.2%."),
    cvrPct: z.number().positive().max(100).describe("Click-to-order conversion rate in percent, e.g. 2 for 2%."),
    aovUsd: z.number().positive().describe("Average order value in USD."),
    grossMarginPct: z
      .number()
      .min(1)
      .max(100)
      .default(50)
      .describe("Gross margin in percent after product and shipping costs. Defaults to 50."),
  }),
  label: {
    start: ({ budgetUsd }) => `Forecasting a $${Math.round(budgetUsd).toLocaleString("en-US")} launch`,
  },
  async execute({ budgetUsd, cpmUsd, ctrPct, cvrPct, aovUsd, grossMarginPct }) {
    const impressions = (budgetUsd / cpmUsd) * 1000;
    const clicks = impressions * (ctrPct / 100);
    const orders = clicks * (cvrPct / 100);
    const revenue = orders * aovUsd;
    const margin = grossMarginPct / 100;
    const contribution = revenue * margin - budgetUsd;
    const roas = revenue / budgetUsd;
    const breakEvenRoas = 1 / margin;
    const cpc = clicks > 0 ? budgetUsd / clicks : null;
    const cpa = orders > 0 ? budgetUsd / orders : null;

    // Which single assumption would need to move to reach break-even.
    const roasGap = breakEvenRoas / roas;
    const leversToBreakEven = {
      cvrPct: round(cvrPct * roasGap),
      aovUsd: round(aovUsd * roasGap),
      cpmUsd: round(cpmUsd / roasGap),
    };

    return {
      assumptions: { budgetUsd, cpmUsd, ctrPct, cvrPct, aovUsd, grossMarginPct },
      forecast: {
        impressions: Math.round(impressions),
        clicks: Math.round(clicks),
        orders: Math.round(orders),
        revenueUsd: round(revenue),
        cpcUsd: cpc === null ? null : round(cpc),
        cpaUsd: cpa === null ? null : round(cpa),
        roas: round(roas),
        breakEvenRoas: round(breakEvenRoas),
        contributionUsd: round(contribution),
      },
      verdict:
        contribution >= 0
          ? "pays back: forecast ROAS is at or above break-even"
          : "does not pay back yet: forecast ROAS is below break-even",
      leversToBreakEven,
      leverNote:
        "Each lever is the value that reaches break-even on its own, holding the others fixed. Pick the one the merchant can actually move.",
    };
  },
});

function round(value: number): number {
  return Math.round(value * 100) / 100;
}
