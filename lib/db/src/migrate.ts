/**
 * Programmatic migration runner.
 *
 * Run with:
 *   npm run migrate --workspace=@workspace/db
 * or from the workspace root:
 *   npm run db:migrate
 *
 * Applies all pending SQL migration files from lib/db/drizzle/ to the
 * configured PostgreSQL database.
 */
import { drizzle } from "drizzle-orm/node-postgres";
import { migrate } from "drizzle-orm/node-postgres/migrator";
import pg from "pg";
import { fileURLToPath } from "url";
import { dirname, join } from "path";
import { existsSync } from "fs";

const { Pool } = pg;

// ── Load .env from workspace root ──────────────────────────────────────────
// __dirname is lib/db/src; workspace root is three levels up.
const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
const workspaceRoot = join(__dirname, "../../..");
const envFile = join(workspaceRoot, ".env");

if (existsSync(envFile)) {
  const { config } = await import("dotenv");
  config({ path: envFile });
  console.log(`Loaded env from ${envFile}`);
}

// ── Validate env ────────────────────────────────────────────────────────────
if (!process.env.DATABASE_URL) {
  console.error(
    "✗  DATABASE_URL is not set.\n" +
      "   Add it to the workspace .env file or set it as an environment variable."
  );
  process.exit(1);
}

// ── Run migrations ──────────────────────────────────────────────────────────
const pool = new Pool({ connectionString: process.env.DATABASE_URL });
const db = drizzle(pool);

// Migrations live in lib/db/drizzle/ — one level up from lib/db/src/
const migrationsFolder = join(__dirname, "../drizzle");

console.log(`Applying migrations from: ${migrationsFolder}`);

try {
  await migrate(db, { migrationsFolder });
  console.log("✓  All migrations applied successfully.");
} catch (err) {
  console.error("✗  Migration failed:", err);
  process.exit(1);
} finally {
  await pool.end();
}
