// https://nuxt.com/docs/api/configuration/nuxt-config
export default defineNuxtConfig({
  compatibilityDate: "2025-12-30",
  devtools: { enabled: true },

  nitro: {
    preset: "node-server",
  },

  runtimeConfig: {
    postgresUrl: process.env.POSTGRES_URL,

    dbDialect: process.env.DB_DIALECT,
    dbHost: process.env.DB_HOST,
    dbPort: process.env.DB_PORT,
    dbName: process.env.DB_NAME,
    dbUser: process.env.DB_USER,
    dbPassword: process.env.DB_PASSWORD,
    dbSchema: process.env.DB_SCHEMA,

    jwtSecret: process.env.JWT_SECRET,
    jwtExpiresIn: process.env.JWT_EXPIRES_IN || "7d",
    adminSetupToken: process.env.ADMIN_SETUP_TOKEN,

    public: {
      corsOrigin: process.env.CORS_ORIGIN || "*",
    },
  },
});
