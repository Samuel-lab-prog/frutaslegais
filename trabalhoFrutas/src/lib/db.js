import { Pool } from "pg";

function createPool() {
  if (process.env.DATABASE_URL) {
    return new Pool({
      connectionString: process.env.DATABASE_URL,
      ssl: process.env.PGSSL === "true" || process.env.NODE_ENV === "production"
        ? { rejectUnauthorized: false }
        : undefined,
    });
  }

  const required = ["PGUSER", "PGPASSWORD", "PGHOST", "PGPORT", "PGDATABASE"];
  const missing = required.filter((name) => !process.env[name]);
  if (missing.length) throw new Error(`Configure DATABASE_URL ou: ${missing.join(", ")}.`);

  return new Pool({
    user: process.env.PGUSER,
    password: process.env.PGPASSWORD,
    host: process.env.PGHOST,
    port: Number(process.env.PGPORT),
    database: process.env.PGDATABASE,
    ssl: process.env.PGSSL === "true" ? { rejectUnauthorized: false } : undefined,
  });
}

const globalForDb = globalThis;
export const db = globalForDb.fruitMilkshakePool ?? createPool();
if (process.env.NODE_ENV !== "production") globalForDb.fruitMilkshakePool = db;

export async function ensureMilkshakeTable() {
  await db.query(`
    CREATE TABLE IF NOT EXISTS milkshakes (
      id BIGSERIAL PRIMARY KEY,
      nome VARCHAR(80) NOT NULL,
      ingredientes JSONB NOT NULL,
      calorias_total NUMERIC(12, 2) NOT NULL,
      criado_em TIMESTAMPTZ NOT NULL DEFAULT NOW(),
      atualizado_em TIMESTAMPTZ NOT NULL DEFAULT NOW()
    )
  `);
}
