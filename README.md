# Saveasy

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

## Auth (opcionális)

Alapból nincs bejelentkezés — az app arra épít, hogy a hálózati szintet te
véded (pl. VPN). Ha szeretnél egy jelszavas belépést is ráadásul (pl. mert
nem csak VPN-en, hanem publikusan is elérhető lesz), állítsd be a `.env`-ben:

```
AUTH_PASSWORD_HASH=...   # bcrypt hash, lásd lentebb
SESSION_KEY=...          # 32 bájtos hex kulcs, lásd lentebb
COOKIE_SECURE=false      # true, ha már valódi TLS van előtte
```

Jelszó-hash generálása:
```
docker compose -f docker-compose.prod.yml run --rm backend node -e "console.log(require('bcrypt').hashSync(process.argv[1], 12))" 'a-jelszavad'
```

Session kulcs generálása:
```
node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"
```

Ha `AUTH_PASSWORD_HASH` üres marad, minden pontosan úgy működik, mint eddig
— nincs login képernyő, semmi extra lépés.

## Mi ez?

Egyszerű, önhostolt személyes pénzügyi alkalmazás: költések rögzítése és
csoportosítása, kimutatások, megtakarítások (savings) vezetése, havi
befizetések követése. Részletek: [`PROJECT.md`](./PROJECT.md).

## Kapcsolódó fájlok

- [`PROJECT.md`](./PROJECT.md) — koncepció, stack, architektúra
- [`CHANGELOG.md`](./CHANGELOG.md) — release-ek és feature-ök
- [`TODO.md`](./TODO.md) — nyitott pontok, teendők
