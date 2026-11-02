# Arranque rapido: Dailyaches-api

Ultima actualizacion: 2026-06-29

## Requisitos

- Node.js compatible con Nuxt 4.
- npm.
- PostgreSQL accesible.

## Variables de entorno

Variables documentadas y detectadas:

- PORT
- NODE_ENV
- JWT_SECRET
- JWT_EXPIRES_IN
- ADMIN_SETUP_TOKEN
- DB_DIALECT
- DB_HOST
- DB_PORT
- DB_NAME
- DB_USER
- DB_PASSWORD
- DB_SCHEMA
- POSTGRES_URL
- CORS_ORIGIN

Notas:

- POSTGRES*URL tiene prioridad sobre DB*\*.
- El schema y la tabla users pueden bootstrapearse en runtime durante los primeros flujos de auth.

## Instalacion

```bash
npm install
```

## Preparacion de entorno

1. copiar .env.example a .env
2. completar JWT_SECRET y credenciales de BD
3. ajustar CORS_ORIGIN para el cliente que vas a usar

## Desarrollo local

```bash
npm run dev
```

## Base de datos y pruebas

Los cambios de esquema viven en `migrations/` (archivos `.sql` numerados). Se aplican
una sola vez, en orden, y quedan registrados en la tabla `schema_migrations`:

```bash
npm run migrate
```

Antes de aplicar migraciones a datos que importan, haz un respaldo con `pg_dump`.

La migracion 004 crea `user_progress` y `user_achievements` (puntos y logros). Las reglas del juego viven en `server/utils/gamification.ts` y espejan `utils/gamification.js` de la app; `tests/progress-golden.json` guarda valores generados con las reglas de la app para detectar cualquier desvio. **Sin la migracion 004, crear un registro falla**: aplica `npm run migrate` antes de desplegar.

La migracion 003 agrega `users.password_changed_at`. Cada token lleva esa marca (`pca`): al cambiar la contraseña los tokens anteriores dejan de valer. `ensureUsersInfra` tambien crea la columna si falta, para que una API sin migrar no deje de autenticar.

Las pruebas de integracion usan un schema aparte (`dailyaches_test`, se recrea en cada
corrida) y no tocan `dailyaches_api`. Detén `npm run dev` antes: comparten la carpeta `.nuxt`.

```bash
npm test
```

## Smoke test recomendado

Chequeo manual minimo:

1. GET /api/health
2. GET /api/db-check
3. POST /api/auth/register
4. POST /api/auth/login
5. GET /api/auth/me con Bearer token
6. CRUD basico de people, pain-types y records

## Build y preview

```bash
npm run build
npm run preview
```

Para LAN:

```bash
npm run preview:lan
```

## Despliegue

Pasos sugeridos:

1. configurar .env del entorno objetivo
2. correr npm run build
3. validar con npm run preview o preview:lan
4. desplegar el artefacto Nuxt/Nitro en el host objetivo

## Archivos que conviene leer primero

- CONTEXTO_PROYECTO.md
- MATRIZ_APP_BACKEND.md
- nuxt.config.ts
- .env.example
