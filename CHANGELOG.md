# Changelog

Ez a fájl követi a `dev` → `master` release-eket. Mindig a lista tetejére
kerül az új bejegyzés.

## Unreleased

- Tranzakciók no longer silently caps at a fixed 100 rows — it now infinite-scrolls, loading the next batch automatically as you scroll down, until every matching transaction has loaded. Batch size (default 100) is configurable on Beállítások
- money amounts no longer show ugly floating-point noise (e.g. "235437.5700000003") — they're rounded (0.5 always rounds up, never banker's rounding) everywhere they're displayed or typed into, including the liquid/bucket override inputs and the editable transaction amount. New Beállítások page lets you set how many decimal places to round/show (forint defaults to 0; a bucket tracking something fractional like crypto can use more)
- the "Szabad (liquid) pénz" figure on Megtakarítás can now be set manually (same as a savings bucket's mark-to-market value) — click into it and type the real number, a "kézi" badge shows it's overridden, and a revert button switches back to the calculated (income − expense − savings-transfers) figure
- CSV import now picks up the time-of-day from the date column when the bank export includes one (e.g. "2026-09-01 14:32:00"), and shows it next to the date in Tranzakciók ("2026. szept. 1. · 14:32"); re-importing the same file safely backfills the time onto already-imported rows that are missing it, without creating duplicates
- fixed the "Kategorizálatlan" filter always showing savings transfers as uncategorized — they don't use category_id (they use bucket_id instead), so the filter now checks bucket_id for savings and category_id for everything else
- rule creation suggestion is now a small tag-icon button next to the category dropdown that opens a compact popover — no more full-width banner pinned to the top of the page forcing a scroll
- creating a category rule (manually or via the "learn this pattern" suggestion) now also applies retroactively to existing, still-uncategorized transactions matching the pattern — not just future imports
- transaction amounts are now editable directly in the Tranzakciók list — click into the amount, type a math expression after the existing value (e.g. click "31000" and type "-3000" so it reads "31000-3000"), it evaluates on blur; the new-transaction form's amount field works the same way
- savings buckets can now hold a manual mark-to-market value and a free-text note (e.g. "10 AAPL + 5 VOO") — for holdings like stocks/crypto whose value moves on its own; editing the value directly on Megtakarítás overrides the transfer-sum, and a later transfer into that bucket adds onto it instead of being ignored
- savings destinations moved into their own independent `savings_buckets` table (decoupled from categories); Megtakarítás now has a bucket manager and a "transfer from liquid" form that posts a real transaction
- removed the net worth "opening balance" setting — it's simpler to have one place for money in (income transactions) than a separate balance to reconcile against them; if you had savings before you started tracking, add them as a manual income transaction instead. Net worth is now just income − expense − savings-transfers

## v0.1.0 — 2026-09-01

Első release.

- added project file, changelog and todo setup
- added backend skeleton (Fastify, health endpoint, SQLite connection, initial schema)
- added frontend skeleton (Vite + React + TypeScript, dev proxy to backend)
- added docker-compose dev (hot reload) and prod (Caddy + multi-stage builds) stacks, verified both end to end
- added README with start/stop commands, moved all ports into .env
- added transactions (expense/income, separately tracked), categories, category rules, CSV import with column-mapping auto-detection and duplicate protection, and category-breakdown reports — with a full UI (Áttekintés, Tranzakciók, Import, Kategóriák, Szabályok)
- added category reordering (up/down) and a one-click "translate to English" button for the default categories
- replaced the default categories with a fixed English taxonomy (Home, Food, Nights, Entertainment, Clothing, Beauty, Health, Sport, IT, Travel, Vacation, Bills, General, Unknown, Gifts + Salary, Transfer, Other Income); added a one-time migration system so this kind of change runs exactly once per database
- added a "Reset to defaults" button on the Kategóriák page (wipes all categories, including custom ones, and reseeds the default taxonomy; transactions keep their data with category cleared)
- added category icons: a curated Lucide icon set, a picker on the Kategóriák page, sensible defaults for every default category, and a fallback icon for anything unset
- added an "uncategorized" quick filter on Tranzakciók
- import results now list which rows were duplicates and which were skipped (with the reason), not just counts
- added an "Automatikus színezés" button on Kategóriák that assigns every category a color from the fixed palette in one click
- added an opt-in legacy category backfill (POST /api/import/legacy-categorize, behind ENABLE_LEGACY_CATEGORY_IMPORT, off by default) that applies categories from an All-Accounts.csv-shaped export onto matching, still-uncategorized transactions
- transaction delete now asks for confirmation before removing
- unified all button sizes across the app (removed the smaller .btn-sm variant, fixed height for both text and icon buttons)
- unified typography: dropped the Fraunces display serif, headings now use the same IBM Plex Sans as body text
- added a "Legacy kategorizálás" section on the Import page, shown only when ENABLE_LEGACY_CATEGORY_IMPORT is on (GET /api/config exposes the flag), so the backfill feature has a UI trigger instead of curl-only
- .env is no longer tracked in git (gitignored now); added .env.example as the checked-in template, README updated to `cp .env.example .env` on first setup
- added a "Havi összehasonlítás" (monthly comparison) card on Áttekintés: per expense category, current vs previous month with the delta (amount + %), plus a monthly average across all months of data; month navigable with arrows
- fixed an "ambiguous column name: type" 500 on GET /api/transactions?type=... (categories.type collided with transactions.type after the categories JOIN)
- added a chart type toggle (kör/oszlop) and a "Kategóriák havonta" monthly category trend chart on Áttekintés
- added net worth tracking: a third category type ('savings', alongside expense/income), a Megtakarítás page showing liquid cash vs. money moved into savings/investment buckets and the total net worth, and a one-time opening balance setting. Any transaction can be reclassified as a savings move straight from its category dropdown on Tranzakciók (with a way back)
- added recurring payments: an Ismétlődők page to define expected monthly bills/income/savings transfers (day of month, amount, category — manually or picked from an existing transaction), with a "missing this month" list and a one-click "record it now" action
- fixed dev live-reload not actually working on Docker Desktop for Windows: native fs-change events don't cross the bind mount reliably, so Vite and tsx were silently serving stale code. Backend dev script now runs via nodemon --legacy-watch (polling); frontend Vite config now polls too
- pre-release review pass: inputs/selects now match the 34px button height everywhere (they were visibly shorter than buttons in the same toolbar row); fixed clipped Y-axis labels on the "Kategóriák havonta" chart; added prev/next month navigation to the main Áttekintés date filter
