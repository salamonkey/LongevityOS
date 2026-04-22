# Database Fabric Component

This component provides standardized database infrastructure bootstrap and checks for generated projects.

## Artifacts

- `supabase-config.template.toml`: baseline Supabase CLI local config.
- `supabase-seed.template.sql`: baseline idempotent seed contract placeholder.

## Runtime Integration

Runtime commands in `runtime/fabric.mjs` consume DB settings from `fabric.yaml`:

- `db:init`: provisions baseline DB artifacts and required package scripts.
- `db:check`: verifies DB artifact/env/script readiness.
- `db:reset`: executes configured reset command (requires `--yes`).
- `db:seed`: executes configured seed command.

## Defaults

- Provider: Postgres
- Local tooling: Supabase CLI
- Release migration policy: migration status + deploy commands are required gates.
