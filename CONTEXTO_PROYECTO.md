# Contexto del proyecto: Dailyaches-api

Ultima actualizacion: 2026-06-29

## Resumen rapido

Dailyaches-api es un backend montado sobre Nuxt 4 usando server routes en server/api. Aunque el nombre del repo sugiere solo API, la base tecnica es tipo full-stack Nuxt, con capacidad de crecer hacia interfaz administrativa si hiciera falta.

Actualmente expone salud, chequeo de base de datos, autenticacion, administracion de usuarios y modulos de dominio para personas, tipos de dolor y registros.

## Stack y arquitectura

- Framework: Nuxt 4.
- Runtime: Node con Nitro/server routes.
- Base de datos: PostgreSQL.
- Auth: JWT.
- Estructura server-side: server/api, server/auth, server/db, server/middleware.

## Punto de entrada y flujo base

- Configuracion principal: nuxt.config.ts
- Endpoints: server/api
- Capa de auth y utilidades: server/auth y server/middleware
- Chequeo inicial de DB: server/api/db-check.get.ts

El README indica que el schema y la tabla users pueden bootstrapearse automaticamente en el primer flujo de register/login/me.

## Modulos funcionales principales

- health
- db-check
- auth
- admin
- people
- pain-types
- records
- setup-db

## Endpoints clave

- GET /api/health
- GET /api/db-check
- POST /api/auth/register
- POST /api/auth/login
- GET /api/auth/me
- endpoints admin de usuarios

## Carpetas que conviene leer primero

- server/api
- server/auth
- server/db
- server/middleware
- README.md

## Comandos utiles

```bash
npm install
npm run dev
npm run build
npm run preview
```

## Estado actual y notas operativas

- El repo ya trae .env.example y README bastante util para setup rapido.
- El enfoque es parecido a otros proyectos tipo Lebrun: API primero dentro de Nuxt.
- Existe endpoint opcional de bootstrap admin protegido por token de setup.

## Riesgos o deuda visible

- El nombre del proyecto puede confundir: no es un Express API clasico, es un Nuxt server app.
- Conviene aclarar mejor en documentacion si se usara solo como API o tambien como panel futuro.
- Si el schema se auto-crea en runtime, hay que vigilar compatibilidad cuando el modelo crezca.

## Recomendacion para futuras sesiones

Antes de tocar negocio:

1. ubicar el endpoint en server/api
2. revisar middleware y auth involucrados
3. revisar acceso a DB en server/db
4. confirmar contrato esperado con DailyAches
