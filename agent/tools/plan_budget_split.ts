import { defineTool } from "eve/tools";
import { z } from "zod";

type Phase = {
  readonly phase: "test" | "learn" | "scale" | "scale + retarget";
  readonly focus: string;
  readonly successMetric: string;
};

const TEST: Phase = {
  phase: "test",
  focus: "Run 4-6 creatives against 2-3 audiences at low spend. No scaling decisions yet.",
  successMetric: "At least one creative with CTR above the benchmark median.",
};

const LEARN: Phase = {
  phase: "learn",
  focus: "Cut the bottom half of creatives, move spend to the winners, add one new hook.",
  successMetric: "CPA within 1.5x of target on the winning ad set.",
};

const SCALE: Phase = {
  phase: "scale",
  focus: "Raise budgets on winners by no more than 20-30% per day; keep one test ad set live.",
  successMetric: "CPA holds within 20% of last week while spend grows.",
};

const SCALE_RETARGET: Phase = {
  phase: "scale + retarget",
  focus: "Keep scaling winners and add a retargeting ad set for site visitors and cart abandoners.",
  successMetric: "Blended ROAS at or above break-even for the full launch.",
};

/**
 * Weekly spend shares ramp up and then plateau: week 1 is deliberately small
 * because learning is cheap and scaling blind is not. Four weeks come out at
 * roughly 13% / 21% / 29% / 37%.
 */
function weeklyShares(weeks: number): number[] {
  const weights = Array.from({ length: weeks }, (_, index) => Math.min(1 + 0.6 * index, 3));
  const total = weights.reduce((sum, weight) => sum + weight, 0);
  return weights.map((weight) => weight / total);
}

function phaseFor(index: number, weeks: number): Phase {
  if (weeks === 1) return TEST;
  if (index === 0) return TEST;
  if (index === 1) return LEARN;
  if (index === weeks - 1) return SCALE_RETARGET;
  return SCALE;
}

export default defineTool({
  description:
    "Split a launch budget into a week-by-week plan with a phase, a focus, and a success metric for each week. Spend ramps from testing into scaling so the merchant learns before they commit.",
  inputSchema: z.object({
    totalBudgetUsd: z.number().positive().describe("Total ad spend for the launch in USD."),
    weeks: z.number().int().min(1).max(12).default(4).describe("Length of the launch in weeks. Defaults to 4."),
  }),
  label: {
    start: ({ weeks }) => `Splitting the budget across ${weeks} weeks`,
  },
  async execute({ totalBudgetUsd, weeks }) {
    const shares = weeklyShares(weeks);
    let allocated = 0;
    const plan = shares.map((share, index) => {
      // Round each week to whole dollars and give the remainder to the last week so the total is exact.
      const isLast = index === weeks - 1;
      const budgetUsd = isLast ? totalBudgetUsd - allocated : Math.round(totalBudgetUsd * share);
      allocated += budgetUsd;
      return {
        week: index + 1,
        budgetUsd,
        sharePct: Math.round(share * 100),
        dailyBudgetUsd: Math.round((budgetUsd / 7) * 100) / 100,
        ...phaseFor(index, weeks),
      };
    });

    return {
      totalBudgetUsd,
      weeks,
      plan,
      rule: "Never move more than a third of the remaining budget on the strength of a single day's results.",
    };
  },
});
