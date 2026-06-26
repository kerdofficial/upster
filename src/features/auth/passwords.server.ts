import sodium from "libsodium-wrappers-sumo"

async function ready() {
  await sodium.ready
  return sodium
}

export async function hashPassphrase(passphrase: string) {
  const crypto = await ready()

  return crypto.crypto_pwhash_str(
    passphrase,
    crypto.crypto_pwhash_OPSLIMIT_MODERATE,
    crypto.crypto_pwhash_MEMLIMIT_MODERATE
  )
}

export async function verifyPassphrase(verifier: string, passphrase: string) {
  const crypto = await ready()

  return crypto.crypto_pwhash_str_verify(verifier, passphrase)
}
