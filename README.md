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

## Reverse proxy mögé rakás (prod)

A prod Caddy egy külső Docker hálózaton is elérhető (`proxy` néven alapból,
`.env`-ben `PROXY_NETWORK`-kel átnevezhető), amin a saját reverse proxyd
(Traefik, nginx-proxy-manager, egy másik Caddy, stb.) közvetlenül eléri
konténernév alapján — nem kell hozzá a `HTTP_PORT`-ot használnia.

Egyszeri lépés, mielőtt először elindítod a prod stacket:

docker network create proxy

Utána a reverse proxy konfigjában a célpont: `caddy`, `80`-as port, ezen a
hálózaton (nem `localhost:$HTTP_PORT`). A `HTTP_PORT` publikálás megmarad
is emellett, úgyhogy közvetlen LAN-elérés is működik, ha arra is szükség
van — ha nem, csak ne nyisd meg azt a portot kifelé a tűzfalon.

## Mi ez?

Egyszerű, önhostolt személyes pénzügyi alkalmazás: költések rögzítése és
csoportosítása, kimutatások, megtakarítások (savings) vezetése, havi
befizetések követése. Részletek: [`PROJECT.md`](./PROJECT.md).

## Kapcsolódó fájlok

- [`PROJECT.md`](./PROJECT.md) — koncepció, stack, architektúra
- [`CHANGELOG.md`](./CHANGELOG.md) — release-ek és feature-ök
- [`TODO.md`](./TODO.md) — nyitott pontok, teendők
