import * as client from "openid-client";
import crypto from "crypto";
import { type Request, type Response } from "express";
import { db, sessionsTable } from "@workspace/db";
import { eq } from "drizzle-orm";
import type { AuthUser } from "@workspace/api-zod";

function getIssuerUrl(): string {
  if (process.env.ISSUER_URL?.trim()) return process.env.ISSUER_URL.trim();
  if (process.env.OIDC_ISSUER_URL?.trim()) return process.env.OIDC_ISSUER_URL.trim();
  return "https://accounts.google.com";
}

export const ISSUER_URL = getIssuerUrl();
export const SESSION_COOKIE = "sid";
export const SESSION_TTL = 7 * 24 * 60 * 60 * 1000;

export interface SessionData {
  user: AuthUser;
  access_token: string;
  refresh_token?: string;
  expires_at?: number;
}

let oidcConfig: client.Configuration | null = null;
let mobileOidcConfig: client.Configuration | null = null;

export function getOidcClientId(): string {
  const clientId =
    process.env.GOOGLE_CLIENT_ID ??
    process.env.OIDC_CLIENT_ID;
  if (!clientId || !clientId.trim()) {
    throw new Error(
      "Missing OIDC client id. Set GOOGLE_CLIENT_ID or OIDC_CLIENT_ID before using /api/login.",
    );
  }
  return clientId;
}

export function getMobileOidcClientId(): string {
  const clientId =
    process.env.GOOGLE_IOS_CLIENT_ID ??
    process.env.OIDC_MOBILE_CLIENT_ID ??
    process.env.GOOGLE_CLIENT_ID ??
    process.env.OIDC_CLIENT_ID;
  if (!clientId || !clientId.trim()) {
    throw new Error(
      "Missing mobile OIDC client id. Set GOOGLE_IOS_CLIENT_ID or OIDC_MOBILE_CLIENT_ID for mobile sign-in.",
    );
  }
  return clientId;
}

export async function getOidcConfig(): Promise<client.Configuration> {
  if (!oidcConfig) {
    const clientSecret = process.env.GOOGLE_CLIENT_SECRET?.trim();
    oidcConfig = await client.discovery(
      new URL(ISSUER_URL),
      getOidcClientId(),
      clientSecret ? clientSecret : undefined,
    );
  }
  return oidcConfig;
}

export async function getMobileOidcConfig(): Promise<client.Configuration> {
  if (!mobileOidcConfig) {
    const clientSecret =
      process.env.GOOGLE_IOS_CLIENT_SECRET?.trim() ??
      process.env.OIDC_MOBILE_CLIENT_SECRET?.trim();
    mobileOidcConfig = await client.discovery(
      new URL(ISSUER_URL),
      getMobileOidcClientId(),
      clientSecret ? clientSecret : undefined,
    );
  }
  return mobileOidcConfig;
}

export async function createSession(data: SessionData): Promise<string> {
  const sid = crypto.randomBytes(32).toString("hex");
  await db.insert(sessionsTable).values({
    sid,
    sess: data as unknown as Record<string, unknown>,
    expire: new Date(Date.now() + SESSION_TTL),
  });
  return sid;
}

export async function getSession(sid: string): Promise<SessionData | null> {
  const [row] = await db
    .select()
    .from(sessionsTable)
    .where(eq(sessionsTable.sid, sid));

  if (!row || row.expire < new Date()) {
    if (row) await deleteSession(sid);
    return null;
  }

  return row.sess as unknown as SessionData;
}

export async function updateSession(
  sid: string,
  data: SessionData,
): Promise<void> {
  await db
    .update(sessionsTable)
    .set({
      sess: data as unknown as Record<string, unknown>,
      expire: new Date(Date.now() + SESSION_TTL),
    })
    .where(eq(sessionsTable.sid, sid));
}

export async function deleteSession(sid: string): Promise<void> {
  await db.delete(sessionsTable).where(eq(sessionsTable.sid, sid));
}

export async function clearSession(
  res: Response,
  sid?: string,
): Promise<void> {
  if (sid) await deleteSession(sid);
  res.clearCookie(SESSION_COOKIE, { path: "/" });
}

export function getSessionId(req: Request): string | undefined {
  const authHeader = req.headers["authorization"];
  if (authHeader?.startsWith("Bearer ")) {
    return authHeader.slice(7);
  }
  return req.cookies?.[SESSION_COOKIE];
}
