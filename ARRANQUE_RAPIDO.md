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
