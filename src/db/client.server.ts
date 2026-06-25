import { createClient } from "@libsql/client"
import { drizzle } from "drizzle-orm/libsql"

import { getUpsterConfig } from "@/config/env.server"
import * as schema from "@/db/schema"

const config = getUpsterConfig()
const client = createClient({ url: config.databaseUrl })

export const db = drizzle(client, { schema })

let initialized = false

export async function ensureDatabase() {
  if (initialized) {
    return
  }

  await client.batch(
    [
      `CREATE TABLE IF NOT EXISTS app_settings (
        key TEXT PRIMARY KEY,
        value TEXT NOT NULL,
        updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
      )`,
      `CREATE TABLE IF NOT EXISTS admin_users (
        id TEXT PRIMARY KEY,
        passphrase_verifier TEXT NOT NULL,
        created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
        updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
      )`,
      `CREATE TABLE IF NOT EXISTS secret_vaults (
        id TEXT PRIMARY KEY,
        name TEXT NOT NULL,
        ciphertext TEXT NOT NULL,
        salt TEXT NOT NULL,
        nonce TEXT NOT NULL,
        kdf TEXT NOT NULL,
        version INTEGER NOT NULL,
        created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
        updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
      )`,
      `CREATE TABLE IF NOT EXISTS pills (
        id TEXT PRIMARY KEY,
        name TEXT NOT NULL,
        slug TEXT NOT NULL UNIQUE,
        repo_path TEXT NOT NULL,
        default_env TEXT NOT NULL,
        status TEXT NOT NULL,
        created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
        updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
      )`,
      `CREATE TABLE IF NOT EXISTS pill_commands (
        id TEXT PRIMARY KEY,
        pill_id TEXT NOT NULL REFERENCES pills(id) ON DELETE CASCADE,
        name TEXT NOT NULL,
        cwd TEXT NOT NULL,
        argv_json TEXT NOT NULL,
        env_json TEXT NOT NULL,
        healthcheck_path TEXT
      )`,
      `CREATE TABLE IF NOT EXISTS pill_ports (
        pill_id TEXT PRIMARY KEY REFERENCES pills(id) ON DELETE CASCADE,
        app_port INTEGER NOT NULL,
        metrics_port INTEGER NOT NULL,
        last_checked_at TEXT,
        rotation_count INTEGER NOT NULL
      )`,
      `CREATE TABLE IF NOT EXISTS cloudflare_tunnels (
        pill_id TEXT PRIMARY KEY REFERENCES pills(id) ON DELETE CASCADE,
        tunnel_id TEXT,
        tunnel_name TEXT NOT NULL,
        hostname TEXT NOT NULL,
        dns_record_id TEXT,
        config_status TEXT NOT NULL
      )`,
      `CREATE TABLE IF NOT EXISTS pill_runs (
        id TEXT PRIMARY KEY,
        pill_id TEXT NOT NULL REFERENCES pills(id) ON DELETE CASCADE,
        command_name TEXT NOT NULL,
        app_pid INTEGER,
        tunnel_pid INTEGER,
        status TEXT NOT NULL,
        started_at TEXT NOT NULL,
        stopped_at TEXT,
        expires_at TEXT,
        exit_code INTEGER,
        error TEXT
      )`,
      `CREATE TABLE IF NOT EXISTS run_logs (
        id TEXT PRIMARY KEY,
        run_id TEXT NOT NULL REFERENCES pill_runs(id) ON DELETE CASCADE,
        stream TEXT NOT NULL,
        sequence INTEGER NOT NULL,
        chunk TEXT NOT NULL,
        created_at TEXT NOT NULL
      )`,
      `CREATE TABLE IF NOT EXISTS events (
        id TEXT PRIMARY KEY,
        type TEXT NOT NULL,
        pill_id TEXT,
        run_id TEXT,
        message TEXT NOT NULL,
        metadata_json TEXT NOT NULL,
        created_at TEXT NOT NULL
      )`,
    ],
    "write"
  )

  initialized = true
}
