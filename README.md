# 🔗 OpenAgent — Pi Subagent Extension for OpenRouter

A [Pi](https://github.com/badlogic/pi-mono) extension for delegating tasks to specialized subagents via **OpenRouter**. No slot scheduler needed — OpenRouter doesn't enforce per-model concurrency limits, so it uses a simple bounded concurrency pool instead.

Designed to complement [pi-synthetic-subagent](https://github.com/Camcdonou/pi-synthetic-subagent). Use the Synthetic extension for providers with pack-based concurrency, and OpenAgent for OpenRouter models. Install both and use whichever tool fits.

## Features

- **No slot scheduler** — OpenRouter has no per-model concurrency limits. Just a configurable `maxConcurrency` cap (default 8).
- **5 specialized agents** — scout, planner, worker, reviewer, doc-writer — each assigned to the best model for the job.
- **Three execution modes** — single, parallel (bounded concurrency pool), chain (sequential with output passing).
- **Session budget tracking** — warns when sub-agent spending approaches your weekly budget threshold (80%, 95%, 100%).
- **Bounded concurrency** — configurable max parallel subagent processes to avoid overwhelming local resources.
- **Custom TUI rendering** — expandable results with tool calls, usage stats, and budget warnings.

## Agents

| Agent | Model | Cost Tier | Tools | Purpose |
|-------|-------|-----------|-------|---------|
| `scout` | Gemini 2.5 Flash | fast | read, grep, find, ls, bash | Fast recon, returns compressed context |
| `planner` | DeepSeek V4 Flash | power | read, grep, find, ls | Creates implementation plans (read-only) |
| `worker` | DeepSeek V4 Flash | power | all | General-purpose coder, writes code |
| `reviewer` | DeepSeek V4 Flash | power | read, grep, find, ls, bash | Code review (read-only bash) |
| `doc-writer` | Gemini 2.5 Flash | fast | read, write, edit, grep, find, ls | Documentation generation |

### Why these models?

- **DeepSeek V4 Flash** — 79.0% SWE-Bench Verified, 91.6% LiveCodeBench. Excellent coding capability at a very low cost. Serves as the primary worker, planner, and reviewer.
- **Gemini 2.5 Flash** — Fast, cheap, and capable for surface-level exploration and documentation. Used for scout and doc-writer tasks where raw coding power isn't needed.

### Custom agents

Create a markdown file with YAML frontmatter:

```markdown
---
name: my-agent
description: What this agent does
tools: read, grep, find, ls
model: anthropic/claude-sonnet-4
---

System prompt for the agent goes here.
```

Place at `~/.pi/agent/agents/my-agent.md` (user-level) or `.pi/agents/my-agent.md` (project-level).

## Setup

### 1. Install the extension

```bash
pi install git:github.com/Camcdonou/openagent
```

Restart pi or run `/reload`.

### 2. Verify

```
/or-subagent
```

Shows current config: models, agents, and session budget.

## Usage

### Single agent
```
Use openagent scout to find all authentication code
```

### Parallel execution
```
Use openagent to run 2 workers in parallel: one to refactor auth, one to add tests
```

Tasks are dispatched in parallel with a bounded concurrency pool (configurable via `maxConcurrency`).

### Chained workflow
```
Use openagent chain: scout the caching code, then plan improvements, then implement them
```

Chain passes each step's output to the next via the `{previous}` placeholder.

### Quick status
```
/or-subagent
```

## Configuration

Config is stored in `~/.pi/agent/settings.json` under the `"openagent"` key:

```json
{
  "openagent": {
    "weeklyBudget": 24,
    "defaultModel": "deepseek/deepseek-v4-flash",
    "maxConcurrency": 8,
    "models": {
      "deepseek/deepseek-v4-flash": {
        "cost": 0.15,
        "tier": "power"
      },
      "google/gemini-2.5-flash": {
        "cost": 0.10,
        "tier": "fast"
      }
    }
  }
}
```

| Field | Default | Description |
|-------|---------|-------------|
| `weeklyBudget` | `24` | Weekly spending limit in USD for budget warnings |
| `defaultModel` | `deepseek/deepseek-v4-flash` | Fallback model when an agent doesn't specify one |
| `maxConcurrency` | `8` | Max parallel subagent processes |
| `models` | (see above) | Map of model ID → `{ cost, tier }` |

Edit directly in `settings.json` to add more OpenRouter models:

```json
"models": {
  "deepseek/deepseek-v4-flash": { "cost": 0.15, "tier": "power" },
  "google/gemini-2.5-flash": { "cost": 0.10, "tier": "fast" },
  "anthropic/claude-sonnet-4": { "cost": 3.0, "tier": "power" },
  "openai/gpt-4o": { "cost": 2.5, "tier": "power" }
}
```

Model IDs are the same as what OpenRouter uses (without any provider prefix). The extension automatically prepends `openrouter/` when invoking pi's CLI.

## Budget Tracking

The extension tracks cumulative sub-agent spending within a session and warns when approaching your weekly budget:

- **80%**: mild warning
- **95%**: strong warning
- **100%+**: critical warning

Budget is **not enforced** — it only provides warnings. You decide what to do.

Budget state persists across reloads within the same session but resets on new sessions.

## Tool Parameters

| Parameter | Type | Description |
|-----------|------|-------------|
| `agent` | string | Agent name (single mode) |
| `task` | string | Task description (single mode) |
| `tasks` | array | `[{agent, task}]` for parallel execution |
| `chain` | array | `[{agent, task}]` for sequential execution with `{previous}` |
| `agentScope` | `"user"` \| `"project"` \| `"both"` | Which agent directories to use (default: `"user"`) |
| `confirmProjectAgents` | boolean | Prompt before project-local agents (default: `true`) |
| `cwd` | string | Working directory (single mode) |

## Commands

| Command | Description |
|---------|-------------|
| `/or-subagent` | Show status dashboard (agents, models, budget) |
| `/or-subagent <task>` | Delegate a task (same as the tool) |

## Requirements

- [Pi](https://github.com/badlogic/pi-mono) (`npm install -g @mariozechner/pi-coding-agent`)
- An [OpenRouter](https://openrouter.ai) account with API key
- `OPENROUTER_API_KEY` environment variable

## License

MIT