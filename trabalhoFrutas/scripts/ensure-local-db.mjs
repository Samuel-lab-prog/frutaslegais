import { createRequire } from "node:module";
import pg from "pg";

const require = createRequire(import.meta.url);
const { loadEnvConfig } = require("@next/env");
loadEnvConfig(process.cwd());

const localHosts = ["localhost", "127.0.0.1", "::1", "[::1]"];
const isLocal = (host) => localHosts.includes(host?.toLowerCase());
const quoteIdentifier = (value) => `"${value.replaceAll('"', '""')}"`;

let database;
let adminConfig;

if (process.env.DATABASE_URL) {
  const connection = new URL(process.env.DATABASE_URL);
  const hostname = connection.hostname.replace(/^\[|\]$/g, "");
  if (!isLocal(hostname)) {
    console.log("Banco remoto detectado; a inicialização automática é somente local.");
    process.exit(0);
  }
  database = decodeURIComponent(connection.pathname.slice(1));
  adminConfig = { connectionString: process.env.DATABASE_URL, database: "postgres" };
} else {
  const hostname = process.env.PGHOST;
  if (!hostname || !process.env.PGDATABASE) {
    console.log("Configure DATABASE_URL ou as variáveis PG* no arquivo .env.local.");
    process.exit(0);
  }
  if (!isLocal(hostname)) {
    console.log("Banco remoto detectado; a inicialização automática é somente local.");
    process.exit(0);
  }
  database = process.env.PGDATABASE;
  adminConfig = {
    user: process.env.PGUSER,
    password: process.env.PGPASSWORD,
    host: hostname,
    port: Number(process.env.PGPORT || 5432),
    database: "postgres",
  };
}

if (!database) {
  console.error("O nome do banco não foi informado.");
  process.exit(1);
}

const client = new pg.Client({ ...adminConfig, connectionTimeoutMillis: 5000 });
try {
  await client.connect();
  const { rowCount } = await client.query("SELECT 1 FROM pg_database WHERE datname = $1", [database]);
  if (rowCount) {
    console.log(`Banco local "${database}" já existe.`);
  } else {
    await client.query(`CREATE DATABASE ${quoteIdentifier(database)}`);
    console.log(`Banco local "${database}" criado.`);
  }
} catch (error) {
  if (error.code === "42P04") {
    console.log(`Banco local "${database}" já foi criado por outro processo.`);
  } else {
    console.error("Não foi possível preparar o banco. Confira se o PostgreSQL está iniciado e se o usuário tem permissão para criar bancos.");
    console.error(`Detalhe: ${error.code || error.message}`);
    process.exitCode = 1;
  }
} finally {
  await client.end().catch(() => {});
}
