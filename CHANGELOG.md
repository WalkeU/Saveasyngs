# Changelog

Ez a fájl követi a `dev` → `master` release-eket. Mindig a lista tetejére
kerül az új bejegyzés.

## Unreleased

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
