# Savings — projekt koncepció

Egyszerű, önhostolt személyes pénzügyi alkalmazás: költések rögzítése és
csoportosítása, kimutatások, megtakarítások (savings) vezetése, havi
befizetések követése.

## Cél

Ne legyen bonyolult third-party pénzügyi app — egy saját, kis erőforrás-
igényű, privát hálózaton futó eszköz, ami pontosan azt tudja amire szükség
van, semmi többet.

## Funkciók (v1 kör)

- **Költések rögzítése** — összeg, dátum, leírás, kategória
- **Kategorizálás** — saját kategóriák (pl. élelmiszer, rezsi, szórakozás),
  egy költés egy kategóriához tartozik
- **Kimutatások** — havi/időszaki bontás kategóriánként, összegzések,
  egyszerű grafikonok (trend, megoszlás)
- **Savings (megtakarítás) vezetése** — egy vagy több megtakarítási cél/
  számla, aktuális egyenleg követése
- **Havi befizetések** — rendszeres befizetések rögzítése a savings
  célokhoz, előzmény lista

Ami **nem** kell (egyelőre):
- Auth / user management — csak privát hálózatról érhető el
- Multi-user support
- Bankintegráció / automatikus tranzakció-import

## Tech stack

| Réteg      | Választás                              | Miért |
|------------|-----------------------------------------|-------|
| Backend    | Node.js + TypeScript + Fastify          | kis memóriaigény, gyors, type-safe |
| DB         | SQLite (better-sqlite3)                 | egy fájl, nincs külön DB szerver, minimál erőforrás |
| Frontend   | React + Vite + TypeScript               | komponens-alapú, jól illeszkedik a tervezett letisztult UI-hoz (kimutatások/grafikonok) |
| Proxy      | Caddy (csak prod)                       | egyetlen belépési pont, statikus frontend + `/api` proxy, minimál config |
| Konténer   | Docker, külön dev/prod compose stack    | mindkét környezet konténerizált, izolált adat |

### Architektúra — Prod

```
                 ┌────────────┐
  :80 ───────────▶   Caddy    │
                 └─────┬──────┘
                       │  /            → statikus React build
                       │  /api/*       → proxy
                       ▼
                 ┌────────────┐
                 │  Backend   │  (Fastify, csak belső hálózat)
                 │  (Node.js) │
                 └─────┬──────┘
                       │
                 ┌─────▼──────┐
                 │ SQLite file│  (named volume)
                 └────────────┘
```

### Architektúra — Dev

```
  :5173 ──────────▶ Vite dev server ──(built-in proxy)──▶ Backend (:3000, tsx watch, hot reload)
                          │                                      │
                     HMR (live update)                     SQLite (dev volume, külön a prodtól)
```

Nincs külön proxy konténer dev-ben — a Vite dev szerver proxy configja
(`server.proxy` a `vite.config.ts`-ben) intézi az `/api` irányítást, és
natívan kezeli a HMR websocketet is.

## Workflow

- Egyetlen **`dev`** branch-en dolgozunk, nincs feature branch
- Amikor egy funkció/release kész, `dev` → `master` merge, és a
  `CHANGELOG.md` frissül a release-szel
- `master` = prod, mindig deployable állapotban
- `dev` compose stack éles fejlesztésre (live update / hot reload)
- `prod` compose stack a stabil, buildelt verzióra

## Kapcsolódó fájlok

- [`CHANGELOG.md`](./CHANGELOG.md) — release-ek és feature-ök
- [`TODO.md`](./TODO.md) — nyitott pontok, stack döntések, teendők
