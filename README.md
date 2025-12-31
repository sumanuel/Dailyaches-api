# DailyAches API (Nuxt + PostgreSQL)

API tipo “Lebrun”: sirve endpoints en `server/api/*` (y si luego quieres, puedes agregar páginas/admin con Nuxt).

## Setup

```bash
npm install
```

Crea un `.env` (puedes copiar de `.env.example`) y completa lo mínimo:

- `JWT_SECRET`
- `DB_HOST`, `DB_PORT`, `DB_NAME`, `DB_USER`, `DB_PASSWORD`
- `DB_SCHEMA` (ej: `dailyaches_api`)

> También puedes usar `POSTGRES_URL` (si existe, tiene prioridad sobre `DB_*`).

## Dev

```bash
npm run dev
```

## Endpoints

- `GET /api/health`
- `GET /api/db-check`

Auth:

- `POST /api/auth/register` body: `{ "email": "...", "password": "...", "name": "..." }`
- `POST /api/auth/login` body: `{ "email": "...", "password": "..." }`
- `GET /api/auth/me` header: `Authorization: Bearer <token>`

Admin (requires `role=admin`):

- `GET /api/admin/users?limit=20&offset=0&search=`
- `GET /api/admin/users/:id`
- `PATCH /api/admin/users/:id` body: `{ "name": "...", "role": "admin|user", "is_active": true|false }`
- `DELETE /api/admin/users/:id` (soft delete: sets `is_active=false`)

Bootstrap admin (optional):

- Set `ADMIN_SETUP_TOKEN` in `.env`
- `POST /api/admin/bootstrap` header `x-admin-setup-token: <ADMIN_SETUP_TOKEN>` body `{ "email": "you@example.com" }`

## Nota de DB

En el primer `register/login/me` se crea automáticamente el schema y la tabla `users` si no existen.
