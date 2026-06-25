import sodium from "libsodium-wrappers-sumo"

import type { CloudflareConfig } from "@/features/pills/types"

export type EncryptedVaultInput = {
  name: "cloudflare"
  ciphertext: string
  salt: string
  nonce: string
  kdf: "argon2id"
  version: 1
}

const encoder = new TextEncoder()

async function ready() {
  await sodium.ready
  return sodium
}

async function deriveVaultKey(passphrase: string, salt: Uint8Array) {
  const crypto = await ready()

  return crypto.crypto_pwhash(
    crypto.crypto_aead_xchacha20poly1305_ietf_KEYBYTES,
    passphrase,
    salt,
    crypto.crypto_pwhash_OPSLIMIT_MODERATE,
    crypto.crypto_pwhash_MEMLIMIT_MODERATE,
    crypto.crypto_pwhash_ALG_ARGON2ID13
  )
}

export async function encryptCloudflareVault(
  config: CloudflareConfig,
  passphrase: string
): Promise<EncryptedVaultInput> {
  const crypto = await ready()
  const salt = crypto.randombytes_buf(crypto.crypto_pwhash_SALTBYTES)
  const nonce = crypto.randombytes_buf(
    crypto.crypto_aead_xchacha20poly1305_ietf_NPUBBYTES
  )
  const key = await deriveVaultKey(passphrase, salt)
  const plaintext = encoder.encode(JSON.stringify(config))
  const ciphertext = crypto.crypto_aead_xchacha20poly1305_ietf_encrypt(
    plaintext,
    null,
    null,
    nonce,
    key
  )

  return {
    name: "cloudflare",
    ciphertext: crypto.to_base64(ciphertext),
    salt: crypto.to_base64(salt),
    nonce: crypto.to_base64(nonce),
    kdf: "argon2id",
    version: 1,
  }
}

export async function decryptCloudflareVault(
  vault: EncryptedVaultInput,
  passphrase: string
): Promise<CloudflareConfig> {
  const crypto = await ready()
  const key = await deriveVaultKey(passphrase, crypto.from_base64(vault.salt))
  const plaintext = crypto.crypto_aead_xchacha20poly1305_ietf_decrypt(
    null,
    crypto.from_base64(vault.ciphertext),
    null,
    crypto.from_base64(vault.nonce),
    key
  )

  return JSON.parse(crypto.to_string(plaintext)) as CloudflareConfig
}
