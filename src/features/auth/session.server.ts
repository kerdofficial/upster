import { randomBytes } from "node:crypto"

import {
  getRequestHeader,
  setResponseHeader,
} from "@tanstack/react-start/server"

import { getAppSetting, setAppSetting } from "@/db/repositories.server"
import {
  SESSION_TTL_SECONDS,
  createSessionToken,
  verifySessionToken,
  type SessionPayload,
} from "@/features/auth/session-token"

const COOKIE_NAME = "upster_session"
const SECRET_SETTING_KEY = "session_secret"

let cachedSecret: string | null = null

async function getSessionSecret() {
  const fromEnv = process.env.UPSTER_SESSION_SECRET?.trim()
  if (fromEnv) {
    return fromEnv
  }

  if (cachedSecret) {
    return cachedSecret
  }

  const existing = await getAppSetting(SECRET_SETTING_KEY)
  if (existing) {
    cachedSecret = existing
    return existing
  }

  const generated = randomBytes(32).toString("hex")
  await setAppSetting(SECRET_SETTING_KEY, generated)
  cachedSecret = generated
  return generated
}

function readSessionCookie() {
  const header = getRequestHeader("cookie")
  if (!header) {
    return null
  }

  for (const part of header.split(/;\s*/)) {
    const eq = part.indexOf("=")
    if (eq === -1) {
      continue
    }
    if (part.slice(0, eq) === COOKIE_NAME) {
      return part.slice(eq + 1)
    }
  }

  return null
}

function isSecureRequest() {
  if (process.env.UPSTER_SECURE_COOKIES === "true") {
    return true
  }

  return getRequestHeader("x-forwarded-proto") === "https"
}

export async function issueSessionCookie(sub: string) {
  const secret = await getSessionSecret()
  const token = createSessionToken(sub, secret)
  const parts = [
    `${COOKIE_NAME}=${token}`,
    "HttpOnly",
    "SameSite=Lax",
    "Path=/",
    `Max-Age=${SESSION_TTL_SECONDS}`,
  ]

  if (isSecureRequest()) {
    parts.push("Secure")
  }

  setResponseHeader("Set-Cookie", parts.join("; "))
}

export function clearSessionCookie() {
  setResponseHeader(
    "Set-Cookie",
    `${COOKIE_NAME}=; HttpOnly; SameSite=Lax; Path=/; Max-Age=0`
  )
}

export async function readSession(): Promise<SessionPayload | null> {
  const secret = await getSessionSecret()
  return verifySessionToken(readSessionCookie(), secret)
}

export async function verifyRequestSession(
  cookieHeader: string | null
): Promise<SessionPayload | null> {
  if (!cookieHeader) {
    return null
  }

  let token: string | null = null
  for (const part of cookieHeader.split(/;\s*/)) {
    const eq = part.indexOf("=")
    if (eq === -1) {
      continue
    }
    if (part.slice(0, eq) === COOKIE_NAME) {
      token = part.slice(eq + 1)
      break
    }
  }

  const secret = await getSessionSecret()
  return verifySessionToken(token, secret)
}
