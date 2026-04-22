# Deployment Flow Template

Date: `YYYY-MM-DD`
Owner: `{{owner_role}}`

## Purpose

Define a release order that guarantees schema compatibility and avoids startup-time migration side effects.

## Required Order

1. Run release preflight (`{{release_preflight_command}}`).
2. Apply database migrations (`{{db_migration_command}}`).
3. Roll out application runtime.
4. Run post-deploy smoke checks.

## Standard Commands

- Verification gate: `{{release_verification_command}}`
- Preflight gate: `{{release_preflight_command}}`
- Release deploy flow: `{{release_deploy_command}}`
- Migration status: `{{db_migration_status_command}}`
- Migration apply: `{{db_migration_command}}`

## Policy

- Do not auto-run database migrations in application startup code.
- Use deploy-safe migration commands in release environments.
- Treat schema changes as release-gating events.

## Evidence To Record Per Release

- Verification output (`{{release_verification_command}}`).
- Migration output (`{{db_migration_command}}`) or status evidence when not required.
- Smoke-check result and timestamp.
