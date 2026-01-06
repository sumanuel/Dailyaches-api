import pg from "pg";

const { Pool } = pg;

const pool = new Pool({
  host: "127.0.0.1",
  port: 5432,
  database: "postgres",
  user: "postgres",
  password: "123456",
});

pool.query(
  "DELETE FROM users WHERE email = 'jesusprada27@gmail.com'",
  (err, res) => {
    if (err) console.error(err);
    else console.log("Deleted");
    pool.end();
  }
);
