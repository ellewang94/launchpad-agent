import { defineEval } from "eve/evals";
import { includes } from "eve/evals/expect";

// Run with `npm run eval` while `npm run dev` is up, or `eve eval --url <deployment>`.
export default defineEval({
  description:
    "A merchant with a product, price, and budget gets a forecast and a weekly plan without extra questions.",
  async test(t) {
    const turn = await t.send(
      "I sell a $38 vitamin C serum, 60% gross margin, and I have $2,000 for a 4-week launch. Give me a plan.",
    );
    t.succeeded();
    t.calledTool("get_benchmarks");
    t.calledTool("estimate_funnel");
    t.calledTool("plan_budget_split");
    t.check(turn.message, includes(/week 1/i));
  },
});
