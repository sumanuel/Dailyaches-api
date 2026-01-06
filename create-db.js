import pg from "pg";

const { Pool } = pg;

const pool = new Pool({
  host: "127.0.0.1",
  port: 5432,
  database: "postgres",
  user: "postgres",
  password: "123456",
});

pool.query('CREATE DATABASE "daily-aches"', (err, res) => {
  if (err) {
    console.error("Error creating DB:", err.message);
  } else {
    console.log("DB created");
  }
  pool.end();
});
