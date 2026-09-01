# Changelog

Ez a fájl követi a `dev` → `master` release-eket. Mindig a lista tetejére
kerül az új bejegyzés.

## Unreleased

- replaced the default categories with a fixed English taxonomy (Home, Food, Nights, Entertainment, Clothing, Beauty, Health, Sport, IT, Travel, Vacation, Bills, General, Unknown, Gifts + Salary, Transfer, Other Income); added a one-time migration system so this kind of change runs exactly once per database
- added category reordering (up/down) and a one-click "translate to English" button for the default categories
- added transactions (expense/income, separately tracked), categories, category rules, CSV import with column-mapping auto-detection and duplicate protection, and category-breakdown reports — with a full UI (Áttekintés, Tranzakciók, Import, Kategóriák, Szabályok)
- added README with start/stop commands, moved all ports into .env
- added docker-compose dev (hot reload) and prod (Caddy + multi-stage builds) stacks, verified both end to end
- added backend skeleton (Fastify, health endpoint, SQLite connection, initial schema)
- added frontend skeleton (Vite + React + TypeScript, dev proxy to backend)
- added project file, changelog and todo setup
