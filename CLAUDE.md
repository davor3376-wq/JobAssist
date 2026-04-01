# CLAUDE.md — High-Efficiency Rules

## Critical Constraints (Zero-Waste Policy)
- **No Refactors:** Never rewrite working code unless explicitly told. 
- **Surgical Edits:** Only edit the specific lines requested. Do not rewrite entire files.
- **No Background Research:** Do not search for "best practices" or read unrelated files.
- **Database Safety:** All User deletions MUST check for `job_alerts` dependencies. Use `ondelete='CASCADE'`.
- **Validation:** Always verify the existence of a file before attempting to read it.

## Design System (8px Command Center)
- **Spacing:** Use Tailwind `p-2`, `m-2`, `gap-2`, `space-y-2`.
- **Density:** Favor `text-xs` and `text-sm`. Convert cards to compact tables.
- **Theme:** Dark mode only. Background: `bg-[#090b0f]`. Borders: `border-white/10`.

## Technical Summary
- **Backend:** FastAPI, SQLAlchemy (Async), PostgreSQL.
- **Frontend:** React, Tailwind CSS.
- **Primary Files:** `backend/app/models/`, `src/components/dashboard/`.

## Command Shortcuts
- **Build:** `npm run build` / `docker-compose build`
- **Test:** `pytest`
- **Lint:** `npx eslint .`