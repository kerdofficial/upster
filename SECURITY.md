# Upster Security

Upster is a local, single-user development tool that controls Cloudflare
tunnels and runs mounted repositories as child processes. This document
describes the security model that is in place, what an operator still needs to
watch for, and how contributors (human or AI) should approach security-relevant
changes.

## Threat model

- Upster is intended to run on one developer's machine, reachable only over
  loopback by default.
- The most sensitive asset is the Cloudflare API token. It can change DNS and
  open tunnels for the configured zone, so it is treated as a high-value secret.
- Pills (the apps Upster runs) are assumed to be repositories the operator
  trusts. Upster is not a sandbox for untrusted code.
- The realistic adversary is another host or process on the same machine or
  local network, not a remote internet attacker.

## What is in place

### Authentication and sessions

- The dashboard requires an admin passphrase. It is stored only as an Argon2id
  verifier in the `admin_users` table, never in plaintext.
- Access is gated by a signed (HMAC-SHA256), `HttpOnly`, `SameSite=Lax` session
  cookie. `SameSite=Lax` also blocks cross-site POSTs, which protects the
  mutating server functions from CSRF.
- Every protected TanStack Start server function carries the auth middleware,
  and the streaming and metrics server routes verify the session manually
  because route handlers do not run server-function middleware.
- TanStack Start's built-in CSRF protection rejects cross-origin calls to
  server functions.

### Network exposure

- The container binds the dashboard on `127.0.0.1` by default. Exposing it on
  the local network is an explicit opt-in through `UPSTER_BIND_HOST`.
- There is no TLS by default; loopback-only operation makes transport sniffing a
  non-issue for the default setup.

### Secret handling

- Cloudflare credentials are encrypted in the browser with the vault passphrase
  (Argon2id key derivation, XChaCha20-Poly1305) and stored only as ciphertext.
- The plaintext config exists only in memory during an explicit runtime action
  (validating the token or starting a tunnel) and is never persisted or logged.

### Database isolation

- The libSQL database is never published to the host; it is reachable only on
  the internal Docker network.
- It can additionally require an auth token (`SQLD_AUTH_JWT_KEY` on the db,
  `DATABASE_AUTH_TOKEN` on the dashboard) so that a compromised pill cannot read
  it. Generate a pair with `bun run db:credentials`.

### Process isolation

- Pill processes receive a minimal, explicit environment. They never inherit the
  dashboard environment, the database URL, or any dashboard secret.
- `UPSTER_ALLOWED_COMMANDS` can restrict which executables a pill may run.
- The dashboard container runs with `cap_drop: ALL` and
  `no-new-privileges:true`, so a pill cannot raise its privileges.

### Cloudflare resource ownership

- DNS records created by Upster are tagged with a `managed-by-upster` comment.
- Upster refuses to overwrite a DNS record it does not own, including records
  referenced by a stale stored record id.
- Deleting a pill with the vault unlocked also removes its tunnel and DNS
  record, and the UI warns if that cleanup could not be confirmed.

## What an operator still needs to watch for

- **Do not run untrusted repositories.** Pills run as a non-root-capable but
  still privileged process inside the container; there is no per-pill user
  isolation. Treat a pill as code you would run locally yourself.
- **Enable database auth in shared environments.** Without
  `SQLD_AUTH_JWT_KEY` / `DATABASE_AUTH_TOKEN`, a malicious pill on the Docker
  network could read the database, including the session signing secret, and
  forge an admin session. Setting `UPSTER_SESSION_SECRET` also keeps the secret
  out of the database.
- **Use TLS before exposing on a network.** If you set `UPSTER_BIND_HOST` to a
  non-loopback address, put the dashboard behind a TLS-terminating proxy and set
  `UPSTER_SECURE_COOKIES=true`.
- **Complete the first-run setup promptly.** Before an admin passphrase exists,
  anyone who can reach the dashboard can claim it. Loopback-only binding limits
  this to the local machine.
- **Choose a strong vault passphrase.** Vault passphrase strength is enforced
  only in the browser (minimum 12 characters). A weak passphrase weakens offline
  resistance if the ciphertext is ever exposed.
- **Keep the Cloudflare token least-privilege.** Scope it to the specific
  account and zone, and grant only the permissions Upster requests.
- **Pills can print secrets to their own logs.** Upster streams and stores pill
  output. Do not print secrets from a pill if you do not want them in the run
  logs.

## Guidance for AI agents and contributors

Read `AGENTS.md` first. These rules are mandatory:

- Cloudflare credentials may exist only as encrypted vault ciphertext at rest.
- Plaintext secrets may live only in memory during an explicit runtime action.
- Pill commands must never receive Cloudflare secrets in their environment.
- Pill paths must stay inside the configured workspace roots.
- Prefer argv arrays over shell strings for process execution.
- Never log secrets, tokens, vault payloads, command env values, or decrypted
  config.

When making security-relevant changes:

- **Default new server functions to authenticated.** Add the auth middleware to
  every new server function unless it is intentionally public (only the auth
  status, login, setup, and logout functions are public). New `/api/*` server
  routes must verify the session manually, the way `terminal` and `metrics` do.
- **Keep server-only code out of the client bundle.** Do not import a
  `*.server.ts` module into a client-reachable `*.functions.ts` or component.
  Middleware that needs server-only code should pull it in inside its `.server()`
  callback (see `src/features/auth/auth-middleware.ts`). The dev server hides
  these boundary mistakes; the production build catches them.
- **Verify with the production build, not only dev.** Run `bun run build` and,
  when the change affects runtime behavior, the Docker stack. Dev-only checks
  have previously masked both build failures and SSR auth-redirect differences.
- **Run the checks.** `bun run validate` (format, lint, typecheck, tests) must
  pass, and `bun run build` must succeed.
- **Re-run the penetration tests.** `tests/pentest/run.sh` boots an isolated
  instance (or targets a running one via `UPSTER_PENTEST_URL`) and asserts that
  unauthenticated and cross-site access is rejected.
- **Stay least-privilege.** New Cloudflare permissions, new environment
  variables, and new container capabilities should be the minimum required, and
  should be documented in `.env.example` and here.
- **Do not weaken these controls silently.** If a change relaxes a security
  property, call it out explicitly and update this document.
