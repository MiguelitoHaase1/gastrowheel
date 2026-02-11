# Gastrowheel

An interactive cooking companion where users build dishes by selecting ingredients around a flavor wheel. Pick a base ingredient, walk the wheel segment by segment, and compose a balanced, flavorful dish one component at a time.

**Live:** https://gastrowheel.vercel.app

## The Wheel

10 segments: **Sour - Umami - Oil - Crunch - Sweet - Aroma - Fresh - Base - Bitter - Spicy**

827 ingredients, 590 dish descriptions, 71 cooking modules, 407 SVG icons.

## Architecture

pnpm monorepo with three packages:

```
Gastrowheel/
├── packages/data/          # @gastrowheel/data — types, constants, pairing engine
├── packages/mcp-server/    # @gastrowheel/mcp-server — 10 MCP tools (stdio)
├── app/                    # @gastrowheel/app — Next.js 15 + React 19
└── pnpm-workspace.yaml
```

All data is pre-generated from CSV at build time (no database).

## Quick Start

```bash
pnpm install
pnpm generate-data    # Build TS modules from CSV + JSON
pnpm -r build         # Build all packages
pnpm dev              # Start Next.js dev server on :3000
```

## REST API

The app exposes 10 REST endpoints for cross-origin consumption (CORS enabled):

| Endpoint | Method | Description |
|---|---|---|
| `/api/filters` | GET | All valid filter enum values |
| `/api/wheel/structure` | GET | Wheel constants, colors, weights, stats |
| `/api/ingredients/by-segment` | GET | Ingredients in a wheel segment |
| `/api/ingredients/search` | GET | Search/filter ingredients |
| `/api/ingredients/{id}` | GET | Single ingredient (by ID or name) |
| `/api/ingredients/{id}/icon` | GET | SVG icon |
| `/api/cooking-components` | GET | Cooking instruction modules + recipes |
| `/api/pairing-suggestions` | POST | Ranked pairing suggestions |
| `/api/suggest-dishes` | POST | Fuzzy dish matching |
| `/api/cooking-guide` | POST | Cooking steps for selected ingredients |

Full API documentation: [API-documentation.md](./API-documentation.md)

## MCP Server

10 tools exposing the same capabilities for AI assistants via the Model Context Protocol:

```bash
npx @gastrowheel/mcp-server   # or: node packages/mcp-server/dist/index.js
```

## Testing

```bash
pnpm --filter @gastrowheel/data test   # 36 unit tests (vitest)
pnpm -r build                          # Full build verification
```

## Deployment

Deployed on Vercel. Push to `main` triggers auto-deploy, or:

```bash
vercel --prod --yes
```

## Tech Stack

- **Next.js 15** + React 19 + Tailwind v4
- **Zustand** for state management
- **framer-motion** for animations
- **SVG wheel** (not Canvas) for accessibility
- **Pre-generated TypeScript modules** from CSV (zero-latency, type-safe)
- **Vitest** for testing
