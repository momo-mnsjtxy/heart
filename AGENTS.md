# AGENTS.md

## Cursor Cloud specific instructions

心语 (Heart) is a single Next.js 15 (App Router) + React 19 + TypeScript web app. There is no separate backend; the AI chat endpoint is a Next.js route handler at `src/app/api/chat/route.ts`. Data lives client-side in IndexedDB.

### Services

| Task | Command | Notes |
|------|---------|-------|
| Dev server | `npm run dev` | Serves on `http://localhost:3000`. Use this for development. |
| Lint | `npm run lint` | Uses `next lint` (deprecation warning is expected/harmless). |
| Build | `npm run build` | Production build. |
| Start (prod) | `npm start` | Runs the built app; must `npm run build` first. |

There is no test script/framework configured (no `npm test`).

### Non-obvious notes

- The chat feature works **without** an OpenAI key: `src/app/api/chat/route.ts` falls back to a built-in canned counselor response (`"fallback": true` in the JSON response). Set `OPENAI_API_KEY` (and optionally `OPENAI_API_BASE`, `OPENAI_MODEL`) in `.env.local` to enable real AI responses.
- `sharp` is intentionally replaced by a local MIT stub at `vendor/sharp-stub` via `package.json` `overrides`; the app does not use `next/image`. Do not add real `sharp`.
- All user data (chat history, moods) is stored in the browser's IndexedDB with optional client-side AES-256-GCM encryption; nothing persists server-side.
