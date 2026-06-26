# Upster

Upster is a local Dockerized dashboard for publishing short-lived mini apps through Cloudflare Tunnel.

## Status

Upster is in alpha and under active development. Use it at your own risk.

The project is intended for local, single-user development workflows. It is not production-ready yet, and some safety hardening is still planned around process isolation, secret handling, Cloudflare record ownership, and exposed local app behavior.

Do not use Upster for untrusted repositories, public multi-user access, or sensitive production workloads until those safety items are completed.

## Development

Run the local dashboard:

```bash
bun run dev
```

Run the full stack with Docker:

```bash
docker compose up --build
```

## Validation

```bash
bun run validate
```
