import pg from "pg";

const { Pool } = pg;

async function setupDatabase() {
  const pool = new Pool({
    host: process.env.DB_HOST || "127.0.0.1",
    port: process.env.DB_PORT || 5432,
    database: process.env.DB_NAME || "daily-aches",
    user: process.env.DB_USER || "postgres",
    password: process.env.DB_PASSWORD || "123456",
    max: 10,
    options: `-c search_path=${
      process.env.DB_SCHEMA || "dailyaches_api"
    },public`,
  });

  try {
    console.log("🚀 Conectando a PostgreSQL...");

    // Test connection
    const client = await pool.connect();
    console.log("✅ Conexión exitosa a la base de datos");

    // Create schema if not exists
    const schema = (process.env.DB_SCHEMA || "dailyaches_api").trim();
    await client.query(
      `CREATE SCHEMA IF NOT EXISTS "${schema.replace(/"/g, '""')}"`
    );
    console.log(`✅ Schema '${schema}' creado/verificado`);

    // Set search path
    await client.query(
      `SET search_path TO "${schema.replace(/"/g, '""')}", public`
    );

    // Create users table
    await client.query(`
      CREATE TABLE IF NOT EXISTS users (
        id BIGSERIAL PRIMARY KEY,
        email TEXT NOT NULL UNIQUE,
        password_hash TEXT NOT NULL,
        name TEXT NULL,
        role TEXT NOT NULL DEFAULT 'user',
        is_active BOOLEAN NOT NULL DEFAULT TRUE,
        created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
        updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
      )
    `);
    console.log("✅ Tabla users creada/verificada");

    // Create people table
    await client.query(`
      CREATE TABLE IF NOT EXISTS people (
        id BIGSERIAL PRIMARY KEY,
        user_id BIGINT NOT NULL REFERENCES users(id),
        name TEXT NOT NULL,
        relation TEXT,
        image_url TEXT,
        created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
        updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
      )
    `);
    console.log("✅ Tabla people creada/verificada");

    // Add image_url column if not exists
    await client.query(`
      ALTER TABLE people ADD COLUMN IF NOT EXISTS image_url TEXT
    `);
    console.log("✅ Columna image_url agregada/verificada");

    // Add phone column if not exists
    await client.query(`
      ALTER TABLE people ADD COLUMN IF NOT EXISTS phone TEXT
    `);
    console.log("✅ Columna phone agregada/verificada");

    // Add whatsapp_enabled column if not exists
    await client.query(`
      ALTER TABLE people ADD COLUMN IF NOT EXISTS whatsapp_enabled BOOLEAN DEFAULT FALSE
    `);
    console.log("✅ Columna whatsapp_enabled agregada/verificada");

    // Add new columns if they don't exist (for backwards compatibility)
    try {
      await client.query(
        `ALTER TABLE users ADD COLUMN IF NOT EXISTS role TEXT NOT NULL DEFAULT 'user'`
      );
      await client.query(
        `ALTER TABLE users ADD COLUMN IF NOT EXISTS is_active BOOLEAN NOT NULL DEFAULT TRUE`
      );
    } catch (error) {
      // Ignore errors if columns already exist
    }

    client.release();
    await pool.end();

    console.log("🎉 Base de datos inicializada correctamente!");
    console.log("📋 Tablas creadas:");
    console.log(
      "   - users (id, email, password_hash, name, role, is_active, created_at, updated_at)"
    );
    console.log("");
    console.log("✅ Ya puedes probar el registro y login en tu app!");
  } catch (error) {
    console.error("❌ Error al inicializar la base de datos:", error);
    process.exit(1);
  }
}

setupDatabase();
