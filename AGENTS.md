# Launchpad (eve agent)

This project uses the eve framework: the agent is the `agent/` directory, and eve compiles and runs it.

- `agent/instructions.md` — identity and standing rules (always in the system prompt)
- `agent/agent.ts` — model and reasoning config
- `agent/tools/` — typed functions the model can call; the filename is the tool name
- `agent/skills/` — procedures loaded on demand; the filename is the skill name
- `agent/channels/eve.ts` — the HTTP API channel and its route auth
- `evals/` — scored checks run with `eve eval`

Read the framework docs before changing anything outside `instructions.md`:

```sh
ls node_modules/eve/docs
```

Start with `docs/README.md`, read the one page that covers the task, make the smallest complete change, and run one narrow check (`npm run typecheck`, `npm run build`, or `npm run eval`).
