import { defineTool } from "eve/tools";
import { z } from "zod";

// Illustrative paid-social medians for a cold product launch, by category.
// These are sample planning assumptions, not live market data. The agent is
// instructed to label them as such before it reports a forecast.
const BENCHMARKS = {
  beauty: { cpmUsd: 9, ctrPct: 1.4, cvrPct: 2.5 },
  apparel: { cpmUsd: 8, ctrPct: 1.2, cvrPct: 1.8 },
  home: { cpmUsd: 7, ctrPct: 1.0, cvrPct: 1.6 },
  food: { cpmUsd: 7, ctrPct: 1.3, cvrPct: 2.2 },
  electronics: { cpmUsd: 10, ctrPct: 1.1, cvrPct: 1.2 },
  fitness: { cpmUsd: 8, ctrPct: 1.3, cvrPct: 1.9 },
  pets: { cpmUsd: 7, ctrPct: 1.5, cvrPct: 2.4 },
  kids: { cpmUsd: 7, ctrPct: 1.2, cvrPct: 2.0 },
  general: { cpmUsd: 8, ctrPct: 1.2, cvrPct: 1.8 },
} as const;

type Category = keyof typeof BENCHMARKS;

const KEYWORDS: ReadonlyArray<readonly [Category, readonly string[]]> = [
  ["beauty", ["beauty", "skincare", "skin", "cosmetic", "makeup", "hair", "serum", "fragrance"]],
  ["apparel", ["apparel", "clothing", "clothes", "fashion", "shoe", "sneaker", "jewelry", "bag"]],
  ["home", ["home", "kitchen", "decor", "furniture", "candle", "bedding", "garden", "cookware"]],
  ["food", ["food", "snack", "beverage", "drink", "coffee", "tea", "sauce", "supplement"]],
  ["electronics", ["electronic", "gadget", "tech", "phone", "audio", "headphone", "charger", "smart"]],
  ["fitness", ["fitness", "gym", "workout", "yoga", "sport", "outdoor", "bike", "running"]],
  ["pets", ["pet", "dog", "cat", "puppy", "kitten"]],
  ["kids", ["kid", "toy", "baby", "toddler", "children"]],
];

function matchCategory(text: string): Category {
  const haystack = text.toLowerCase();
  for (const [category, words] of KEYWORDS) {
    if (words.some((word) => haystack.includes(word))) return category;
  }
  return "general";
}

export default defineTool({
  description:
    "Look up illustrative paid-social launch benchmarks (CPM, CTR, conversion rate) for a product category. Returns sample planning assumptions, not live data.",
  inputSchema: z.object({
    product: z
      .string()
      .min(1)
      .describe("The product or category in the merchant's own words, e.g. 'vitamin C serum' or 'dog treats'."),
  }),
  label: {
    start: ({ product }) => `Looking up benchmarks for ${product}`,
  },
  async execute({ product }) {
    const category = matchCategory(product);
    const median = BENCHMARKS[category];
    return {
      product,
      category,
      source: "illustrative category medians for a cold paid-social launch; not live market data",
      median,
      // Cold launches usually convert below the median until creative and
      // audiences are tuned. Plan week 1 at the conservative figures.
      conservative: {
        cpmUsd: median.cpmUsd,
        ctrPct: round(median.ctrPct * 0.8),
        cvrPct: round(median.cvrPct * 0.7),
      },
      notes: [
        "CPM is cost per 1,000 impressions in USD.",
        "CTR is clicks per impression, in percent.",
        "CVR is orders per click, in percent.",
      ],
    };
  },
});

function round(value: number): number {
  return Math.round(value * 100) / 100;
}
