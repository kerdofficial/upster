#!/usr/bin/env bun
//
// Generates a libSQL (sqld) auth keypair and a full-access token.
//
// Run once. By default the credentials are written to a 0600 file so the token
// does not leak through terminal capture or CI logs. Pass --stdout to print
// them instead.
//
//   bun run db:credentials
//   bun run db:credentials -- --stdout
//
// SQLD_AUTH_JWT_KEY goes to the db service (it verifies tokens with it).
// DATABASE_AUTH_TOKEN goes to the upster service (it presents it to the db).

import { generateKeyPairSync, sign } from "node:crypto"
import { writeFileSync } from "node:fs"

function base64url(input: Buffer | string) {
  return Buffer.from(input).toString("base64url")
}

const { publicKey, privateKey } = generateKeyPairSync("ed25519")

const spkiDer = publicKey.export({ type: "spki", format: "der" })
const rawPublicKey = spkiDer.subarray(spkiDer.length - 32)
const jwtKey = rawPublicKey.toString("base64url")

const header = base64url(JSON.stringify({ alg: "EdDSA", typ: "JWT" }))
const payload = base64url(JSON.stringify({}))
const signingInput = `${header}.${payload}`
const signature = sign(null, Buffer.from(signingInput), privateKey).toString(
  "base64url"
)
const token = `${signingInput}.${signature}`

const output = [
  "# Add these to your .env (keep DATABASE_AUTH_TOKEN secret):",
  `SQLD_AUTH_JWT_KEY=${jwtKey}`,
  `DATABASE_AUTH_TOKEN=${token}`,
  "",
].join("\n")

if (process.argv.includes("--stdout")) {
  process.stdout.write(output)
} else {
  const outFile = ".env.libsql"
  writeFileSync(outFile, output, { mode: 0o600 })
  process.stdout.write(
    `Wrote libSQL credentials to ${outFile} (chmod 600). Copy the two lines into your .env, then delete the file.\n`
  )
}
