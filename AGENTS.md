# Upster

Upster is a local Dockerized admin dashboard for publishing short-lived mini apps through Cloudflare Tunnel. It manages mounted repositories as Upster pills, assigns local ports, starts app commands, configures per-pill Cloudflare tunnels, streams logs, and shows tunnel metrics.

## Tech Stack

- Bun
- TanStack Start
- React
- TypeScript strict mode
- Tailwind CSS v4
- shadcn/ui with the base-mira style
- Drizzle ORM
- libSQL sidecar in Docker
- Cloudflare Tunnel through the Cloudflare API and cloudflared
- ghostty-web for terminal rendering

## Code Conventions

- Keep TypeScript strict and prefer explicit domain types for pill, tunnel, run, and vault data.
- Use TanStack Start server functions for app-owned queries and mutations.
- Use server routes only for streaming, raw HTTP endpoints, or integrations that should not be server functions.
- Keep server-only code in `*.server.ts` files.
- Keep client-safe server function wrappers in `*.functions.ts` files.
- Never import server-only modules into UI components.
- Use shadcn components before custom markup.
- Use semantic Tailwind tokens and `cn()`.
- Use `gap-*`, not `space-*`.
- Do not add comments unless the code is genuinely complex.
- Do not log secrets, tokens, vault payloads, command env values, or decrypted config.
- Do not use emoji, em dash, or en dash in code, docs, or committed files.
- Use only normal hyphen characters when punctuation needs a dash.

## Security Rules

- Cloudflare credentials must be stored only as encrypted vault ciphertext.
- Plaintext secrets may exist only in memory during an explicit runtime action.
- Pill commands must not receive Cloudflare secrets in their environment.
- Pill paths must stay inside configured workspace roots.
- Prefer argv arrays over shell strings for process execution.

## Code Quality Checks

Run this after every significant change:

```sh
bun run validate
```

`validate` must format with Prettier, run ESLint, run TypeScript typecheck, and run tests.

## Commit Style

Use short conventional commit messages with no body.

Allowed prefixes:

- `feat:`
- `fix:`
- `refactor:`
- `chore:`
- `test:`
- `docs:`
- `build:`
- `ci:`

Examples:

- `feat: add pill runtime schema`
- `fix: rotate occupied pill ports`
- `docs: add upster agent guide`
