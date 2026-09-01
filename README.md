# Savings

Első indítás előtt (csak egyszer):
cp .env.example .env

Dev indítása:
docker compose -f docker-compose.dev.yml up -d --build

Dev leállítása:
docker compose -f docker-compose.dev.yml down

Prod indítása:
docker compose -f docker-compose.prod.yml up -d --build

Prod leállítása:
docker compose -f docker-compose.prod.yml down

## Elérés

- Dev frontend: `http://localhost:$FRONTEND_PORT`
- Dev backend: `http://localhost:$BACKEND_PORT/api/health`
- Prod: `http://localhost:$HTTP_PORT`

A portok a `.env` fájlban állíthatók (lásd [`.env.example`](./.env.example) — a `.env` maga nincs verziózva, csak sablon).

## Mi ez?

Egyszerű, önhostolt személyes pénzügyi alkalmazás: költések rögzítése és
csoportosítása, kimutatások, megtakarítások (savings) vezetése, havi
befizetések követése. Részletek: [`PROJECT.md`](./PROJECT.md).

## Kapcsolódó fájlok

- [`PROJECT.md`](./PROJECT.md) — koncepció, stack, architektúra
- [`CHANGELOG.md`](./CHANGELOG.md) — release-ek és feature-ök
- [`TODO.md`](./TODO.md) — nyitott pontok, teendők
