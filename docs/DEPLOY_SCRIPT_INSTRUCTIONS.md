# Deploy script instruction

Add a `bun run deploy` script for this app.

- Read deployment settings from ignored `.env.deploy`; commit only `.env.deploy.example` with blank values.
- Do not hard-code host names, IPs, ports, paths, credentials, or secrets in tracked files.
- Use SSH to run `git pull --ff-only`, then `docker compose up -d --build` in the configured app directory.
- Show Compose status and optionally verify a configurable server-local health URL.
- Preserve persistent host data. For SQLite, keep the whole database directory mounted; for file-backed apps, keep source files under the mounted data directory.
- Document the one-command deploy workflow without disclosing deployment details.
- If required deployment details, persistent-data paths, start commands, or health checks are unclear, ask me before implementing.
