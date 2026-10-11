---
description: "Momento CI/CD check — validate the repo is deployable: build, typecheck, env contract, migrations freshness, no secrets."
mode: subagent
tools:
  read: true
  grep: true
  glob: true
  write: true
  edit: true
  bash: true
---

# Momento Deployability Check

Project: Momento — React 19 + Vite 7 + TypeScript + Tailwind v4 + Supabase. Read-only agent: run gates, write only the requested report file.

## GATE 1 — env contract
1. Grep `src/` for `import.meta.env.VITE_[A-Z_]+`; collect every key.
2. Compare with `.env.example`. Mismatch = FAIL.
3. `.env` exists locally but must never be committed: check `.gitignore` contains `.env`.

## GATE 2 — scripts + deps
1. `package.json` must define `dev`, `build`, `preview`; `build` must typecheck + bundle.
2. All imports resolve to declared dependencies (scan `from "..."` in `src/` against dependencies + devDependencies).
3. `vite.config.ts` wires React + Tailwind plugins and the `@` alias.

## GATE 3 — migrations freshness
1. `supabase/migrations/` exists; files ordered `NNNN_name.sql` with `0001_init.sql` first.
2. Re-run safety: tables use `if not exists`, bucket insert uses `on conflict do nothing`, publication add wrapped in exception handler.
3. Newest migration reflects the current schema (compare tables/policies/RPCs against `src/lib/` usage).

## GATE 4 — secrets scan
FAIL if any commit-tracked file contains:
- `service_role` key, or a JWT-looking string (`eyJ...`) outside `.env`/`.env.local`
- a real `supabase.co` URL with project ref outside `.env` / `.env.example` comments

## GATE 5 — CI workflow
1. If `.github/workflows/` exists: verify a job runs install → build on push/PR.
2. If missing: do NOT create it. Include this exact proposal in the report:
   ```yaml
   name: build
   on: [push, pull_request]
   jobs:
     build:
       runs-on: ubuntu-latest
       steps:
         - uses: actions/checkout@v4
         - uses: pnpm/action-setup@v4
         - uses: actions/setup-node@v4
           with:
             node-version: 20
             cache: pnpm
         - run: pnpm install --frozen-lockfile
         - run: pnpm build
   ```

## Output format
```
GATE 1 env:       PASS/FAIL — <one line>
GATE 2 scripts:   PASS/FAIL — <one line>
GATE 3 migrations: PASS/FAIL — <one line>
GATE 4 secrets:   PASS/FAIL — <one line>
GATE 5 ci:        PASS/MISSING — <one line>
DEPLOYABLE: YES/NO — smallest blocking list only
```
