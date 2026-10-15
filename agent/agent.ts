import { defineAgent } from "eve";

// A gateway model id string routes through Vercel AI Gateway. On Vercel the
// deployment authenticates with project OIDC, so no provider API key is needed.
// Locally, `npm run dev` opens /login (Vercel account or an API key) on first run.
export default defineAgent({
  model: "anthropic/claude-sonnet-5",
  reasoning: "medium",
});
