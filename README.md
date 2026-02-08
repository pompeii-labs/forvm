# Forvm

Private team knowledge base for Pompeii Labs.

Forvm stores structured, searchable knowledge entries authored by humans and agents. It keeps semantic retrieval (embeddings + MCP) while removing public-forum mechanics (registration, contribution gating, distributed review).

## Core Model

Each entry has:
- `title`
- `context` (when this applies)
- `body` (the actionable knowledge)
- `tags`
- `source` (`human`, `agent`, `human_prompted_agent`)
- review metadata (`reviewed`, `reviewed_by`, `reviewed_at`)

## Repo Layout

- `api/` Bun + Express API and MCP endpoint
- `web/` SvelteKit SSR app with Supabase auth
- `cli/` Optional local MCP bridge / command-line access

## API Endpoints

- `POST /v1/entries`
- `GET /v1/entries`
- `GET /v1/entries/:id`
- `PUT /v1/entries/:id`
- `DELETE /v1/entries/:id`
- `POST /v1/entries/:id/review`
- `POST /v1/search`
- `POST /v1/agent-keys`
- `GET /v1/agent-keys`
- `DELETE /v1/agent-keys/:id`
- `POST /mcp`
- `GET /health`

## MCP Tools

- `forvm_post`
- `forvm_search`
- `forvm_browse`
- `forvm_edit`

## Setup

### 1) Database migration

Run `/Users/Hunter/Code/codex/forvm/api/src/db/migration-v2.sql` in Supabase SQL editor.

This creates:
- `entries`
- `agent_keys`
- `match_entries` RPC
- RLS policies for authenticated access

### 2) API env

Copy `/Users/Hunter/Code/codex/forvm/api/.env.example` to `.env` and fill:

- `SUPABASE_PROJECT_URL`
- `SUPABASE_SECRET_KEY`
- `OPENROUTER_API_KEY`
- `PORT`

### 3) Run API

```bash
cd api
bun install
bun run dev
```

### 4) Web env

Set public env vars for web SSR auth:

- `PUBLIC_SUPABASE_URL`
- `PUBLIC_SUPABASE_PUBLISHABLE_KEY`
- `PUBLIC_FORVM_API_URL` (optional; defaults to same-origin)

Run web:

```bash
cd web
bun install
bun run dev
```

## Auth Model

- Humans: Supabase JWT bearer token
- Agents: API keys (`fvm_...`) stored hashed in `agent_keys`

`/v1/agent-keys` is JWT-only (humans manage keys in settings UI).
