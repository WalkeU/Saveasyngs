# Changelog

Ez a fájl követi a `dev` → `master` release-eket. Mindig a lista tetejére
kerül az új bejegyzés.

## Unreleased

- pre-release review pass: inputs/selects now match the 34px button height everywhere (they were visibly shorter than buttons in the same toolbar row); fixed clipped Y-axis labels on the "Kategóriák havonta" chart; added prev/next month navigation to the main Áttekintés date filter

- fixed dev live-reload not actually working on Docker Desktop for Windows: native fs-change events don't cross the bind mount reliably, so Vite and tsx were silently serving stale code. Backend dev script now runs via nodemon --legacy-watch (polling); frontend Vite config now polls too
- added net worth tracking: a third category type ('savings', alongside expense/income), a Megtakarítás page showing liquid cash vs. money moved into savings/investment buckets and the total net worth, and a one-time opening balance setting. Any transaction can be reclassified as a savings move straight from its category dropdown on Tranzakciók (with a way back)
- added recurring payments: an Ismétlődők page to define expected monthly bills/income/savings transfers (day of month, amount, category — manually or picked from an existing transaction), with a "missing this month" list and a one-click "record it now" action

- added a "Havi összehasonlítás" (monthly comparison) card on Áttekintés: per expense category, current vs previous month with the delta (amount + %), plus a monthly average across all months of data; month navigable with arrows
- fixed an "ambiguous column name: type" 500 on GET /api/transactions?type=... (categories.type collided with transactions.type after the categories JOIN)

- .env is no longer tracked in git (gitignored now); added .env.example as the checked-in template, README updated to `cp .env.example .env` on first setup

- added a "Legacy kategorizálás" section on the Import page, shown only when ENABLE_LEGACY_CATEGORY_IMPORT is on (GET /api/config exposes the flag), so the backfill feature has a UI trigger instead of curl-only

- unified typography: dropped the Fraunces display serif, headings now use the same IBM Plex Sans as body text

- unified all button sizes across the app (removed the smaller .btn-sm variant, fixed height for both text and icon buttons)

- added an opt-in legacy category backfill (POST /api/import/legacy-categorize, behind ENABLE_LEGACY_CATEGORY_IMPORT, off by default) that applies categories from an All-Accounts.csv-shaped export onto matching, still-uncategorized transactions
- transaction delete now asks for confirmation before removing

- added an "Automatikus színezés" button on Kategóriák that assigns every category a color from the fixed palette in one click

- added category icons: a curated Lucide icon set, a picker on the Kategóriák page, sensible defaults for every default category, and a fallback icon for anything unset
- added an "uncategorized" quick filter on Tranzakciók
- import results now list which rows were duplicates and which were skipped (with the reason), not just counts

- added a "Reset to defaults" button on the Kategóriák page (wipes all categories, including custom ones, and reseeds the default taxonomy; transactions keep their data with category cleared)
- replaced the default categories with a fixed English taxonomy (Home, Food, Nights, Entertainment, Clothing, Beauty, Health, Sport, IT, Travel, Vacation, Bills, General, Unknown, Gifts + Salary, Transfer, Other Income); added a one-time migration system so this kind of change runs exactly once per database
- added category reordering (up/down) and a one-click "translate to English" button for the default categories
- added transactions (expense/income, separately tracked), categories, category rules, CSV import with column-mapping auto-detection and duplicate protection, and category-breakdown reports — with a full UI (Áttekintés, Tranzakciók, Import, Kategóriák, Szabályok)
- added README with start/stop commands, moved all ports into .env
- added docker-compose dev (hot reload) and prod (Caddy + multi-stage builds) stacks, verified both end to end
- added backend skeleton (Fastify, health endpoint, SQLite connection, initial schema)
- added frontend skeleton (Vite + React + TypeScript, dev proxy to backend)
- added project file, changelog and todo setup
