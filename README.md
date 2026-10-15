# Launchpad

A launch strategist for small merchants, built with [eve](https://eve.dev), Vercel's
filesystem-first agent framework. Tell it what you sell, what it costs, and what you
can spend; it returns a funnel forecast, a week-by-week budget split, and ad hooks
you can film tomorrow.

Built by Elle Wang, who spent seven years as a product manager on TikTok Ads Manager
helping 1.5 million merchants get their products in front of customers. This is the
planning conversation most of them never got to have.

## What's in the agent

```
agent/
├── agent.ts                   # model: anthropic/claude-sonnet-5 via AI Gateway
├── instructions.md            # identity and standing rules
├── channels/eve.ts            # HTTP API channel + route auth
├── channels/home.ts           # public web chat at the deployment root (/)
├── tools/
│   ├── get_benchmarks.ts      # illustrative CPM / CTR / CVR by category
│   ├── estimate_funnel.ts     # budget → impressions → orders → ROAS vs break-even
│   └── plan_budget_split.ts   # week-by-week spend with a phase and a success metric
└── skills/
    ├── launch_plan.md         # the end-to-end planning procedure
    └── write_ad_hooks.md      # five hook angles + shot list
evals/
└── launch-plan/first-plan.eval.ts
```

Try: *"I sell a $38 vitamin C serum, 60% margin, $2,000 for a 4-week launch. Give me a plan."*

## Run it locally

Requires Node 24+.

```bash
npm install
npm run dev
```

The eve terminal UI opens. On first run, type `/login` to connect a Vercel account
(AI Gateway) or paste an Anthropic API key, then send a message.

## Deploy to Vercel

```bash
npx eve deploy
```

Or push this repo to GitHub and import it at vercel.com/new. On Vercel the model call
authenticates through the project's OIDC token, so no API key is needed.

To let a browser or `curl` talk to the deployed agent, add a `DEMO_PASSWORD`
environment variable to the Vercel project. The HTTP API then accepts Basic auth
with username `demo`:

```bash
curl https://<your-deployment>/eve/v1/health
curl -u demo:<DEMO_PASSWORD> -X POST https://<your-deployment>/eve/v1/session \
  -H "Content-Type: application/json" \
  -d '{"message":"I sell $24 dog treats, 55% margin, $1,500 for 4 weeks. Plan it."}'
```

Without `DEMO_PASSWORD`, production routes stay closed (eve's scaffold default) and
you can still chat from your laptop with `npx eve remote connect --url https://<your-deployment>`.

## Evals

```bash
npm run eval                      # against the local dev server
npx eve eval --url https://<your-deployment>
```
