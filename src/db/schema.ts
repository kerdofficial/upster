import { sql } from "drizzle-orm"
import { integer, sqliteTable, text } from "drizzle-orm/sqlite-core"

export const appSettings = sqliteTable("app_settings", {
  key: text("key").primaryKey(),
  value: text("value").notNull(),
  updatedAt: text("updated_at")
    .notNull()
    .default(sql`CURRENT_TIMESTAMP`),
})

export const adminUsers = sqliteTable("admin_users", {
  id: text("id").primaryKey(),
  passphraseVerifier: text("passphrase_verifier").notNull(),
  createdAt: text("created_at")
    .notNull()
    .default(sql`CURRENT_TIMESTAMP`),
  updatedAt: text("updated_at")
    .notNull()
    .default(sql`CURRENT_TIMESTAMP`),
})

export const secretVaults = sqliteTable("secret_vaults", {
  id: text("id").primaryKey(),
  name: text("name").notNull(),
  ciphertext: text("ciphertext").notNull(),
  salt: text("salt").notNull(),
  nonce: text("nonce").notNull(),
  kdf: text("kdf").notNull(),
  version: integer("version").notNull(),
  createdAt: text("created_at")
    .notNull()
    .default(sql`CURRENT_TIMESTAMP`),
  updatedAt: text("updated_at")
    .notNull()
    .default(sql`CURRENT_TIMESTAMP`),
})

export const pills = sqliteTable("pills", {
  id: text("id").primaryKey(),
  name: text("name").notNull(),
  slug: text("slug").notNull().unique(),
  repoPath: text("repo_path").notNull(),
  defaultEnv: text("default_env").notNull(),
  status: text("status").notNull(),
  createdAt: text("created_at")
    .notNull()
    .default(sql`CURRENT_TIMESTAMP`),
  updatedAt: text("updated_at")
    .notNull()
    .default(sql`CURRENT_TIMESTAMP`),
})

export const pillCommands = sqliteTable("pill_commands", {
  id: text("id").primaryKey(),
  pillId: text("pill_id")
    .notNull()
    .references(() => pills.id, { onDelete: "cascade" }),
  name: text("name").notNull(),
  cwd: text("cwd").notNull(),
  argvJson: text("argv_json").notNull(),
  envJson: text("env_json").notNull(),
  healthcheckPath: text("healthcheck_path"),
})

export const pillPorts = sqliteTable("pill_ports", {
  pillId: text("pill_id")
    .primaryKey()
    .references(() => pills.id, { onDelete: "cascade" }),
  appPort: integer("app_port").notNull(),
  metricsPort: integer("metrics_port").notNull(),
  lastCheckedAt: text("last_checked_at"),
  rotationCount: integer("rotation_count").notNull(),
})

export const cloudflareTunnels = sqliteTable("cloudflare_tunnels", {
  pillId: text("pill_id")
    .primaryKey()
    .references(() => pills.id, { onDelete: "cascade" }),
  tunnelId: text("tunnel_id"),
  tunnelName: text("tunnel_name").notNull(),
  hostname: text("hostname").notNull(),
  dnsRecordId: text("dns_record_id"),
  configStatus: text("config_status").notNull(),
})

export const pillRuns = sqliteTable("pill_runs", {
  id: text("id").primaryKey(),
  pillId: text("pill_id")
    .notNull()
    .references(() => pills.id, { onDelete: "cascade" }),
  commandName: text("command_name").notNull(),
  appPid: integer("app_pid"),
  tunnelPid: integer("tunnel_pid"),
  status: text("status").notNull(),
  startedAt: text("started_at").notNull(),
  stoppedAt: text("stopped_at"),
  expiresAt: text("expires_at"),
  exitCode: integer("exit_code"),
  error: text("error"),
})

export const runLogs = sqliteTable("run_logs", {
  id: text("id").primaryKey(),
  runId: text("run_id")
    .notNull()
    .references(() => pillRuns.id, { onDelete: "cascade" }),
  stream: text("stream").notNull(),
  sequence: integer("sequence").notNull(),
  chunk: text("chunk").notNull(),
  createdAt: text("created_at").notNull(),
})

export const events = sqliteTable("events", {
  id: text("id").primaryKey(),
  type: text("type").notNull(),
  pillId: text("pill_id"),
  runId: text("run_id"),
  message: text("message").notNull(),
  metadataJson: text("metadata_json").notNull(),
  createdAt: text("created_at").notNull(),
})
