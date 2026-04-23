<!-- generated_from: templates/deployment-flow-template.md -->
<!-- fabric_version: v1 -->
<!-- generated_at: 2026-04-23T12:25:43.423Z -->
# Deployment Flow Template

Date: `YYYY-MM-DD`
Owner: `Product Manager`

## Purpose

Define a release order that guarantees schema compatibility and avoids startup-time migration side effects.

## Required Order

1. Run release preflight (`npm run release:preflight`).
2. Apply database migrations (`npm run db:migrate:deploy`).
3. Roll out application runtime.
4. Run post-deploy smoke checks.

## Standard Commands

- Verification gate: `npm run verify:release`
- Preflight gate: `npm run release:preflight`
- Release deploy flow: `npm run release:deploy`
- Migration status: `npm run db:migrate:status`
- Migration apply: `npm run db:migrate:deploy`

## Policy

- Do not auto-run database migrations in application startup code.
- Use deploy-safe migration commands in release environments.
- Treat schema changes as release-gating events.

## Evidence To Record Per Release

- Verification output (`npm run verify:release`).
- Migration output (`npm run db:migrate:deploy`) or status evidence when not required.
- Smoke-check result and timestamp.
