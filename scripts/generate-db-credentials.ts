#!/usr/bin/env bun
//
// Generates a libSQL (sqld) auth keypair and a full-access token.
//
// Run once, then copy the two printed values into your .env:
//
//   bun run scripts/generate-db-credentials.ts
//
// SQLD_AUTH_JWT_KEY goes to the db service (it verifies tokens with it).
// DATABASE_AUTH_TOKEN goes to the upster service (it presents it to the db).

import { generateKeyPairSync, sign } from "node:crypto"

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

process.stdout.write(
  [
    "# Add these to your .env (keep DATABASE_AUTH_TOKEN secret):",
    `SQLD_AUTH_JWT_KEY=${jwtKey}`,
    `DATABASE_AUTH_TOKEN=${token}`,
    "",
  ].join("\n")
)
