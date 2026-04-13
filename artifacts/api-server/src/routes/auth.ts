import * as oidc from "openid-client";
import { Router, type IRouter, type Request, type Response } from "express";
import {
  GetCurrentUserResponse,
  ExchangeMobileAuthorizationCodeBody,
  ExchangeMobileAuthorizationCodeResponse,
  LogoutMobileSessionResponse,
} from "@workspace/api-zod";
import { db, usersTable } from "@workspace/db";
import {
  clearSession,
  getOidcConfig,
  getSessionId,
  createSession,
  deleteSession,
  SESSION_COOKIE,
  SESSION_TTL,
  ISSUER_URL,
  getOidcClientId,
  getMobileOidcClientId,
  getMobileOidcConfig,
  type SessionData,
} from "../lib/auth";

const OIDC_COOKIE_TTL = 10 * 60 * 1000;

const router: IRouter = Router();

function isPrivateHostname(hostname: string): boolean {
  const lower = hostname.toLowerCase();
  if (lower === "localhost" || lower === "127.0.0.1" || lower === "::1") {
    return true;
  }

  const ipv4 = /^(\d{1,3})\.(\d{1,3})\.(\d{1,3})\.(\d{1,3})$/.exec(lower);
  if (!ipv4) return false;

  const octets = ipv4.slice(1).map((part) => Number(part));
  if (octets.some((value) => Number.isNaN(value) || value < 0 || value > 255)) {
    return false;
  }

  // RFC1918 private ranges + link-local range.
  if (octets[0] === 10) return true;
  if (octets[0] === 172 && octets[1] >= 16 && octets[1] <= 31) return true;
  if (octets[0] === 192 && octets[1] === 168) return true;
  if (octets[0] === 169 && octets[1] === 254) return true;
  return false;
}

function getOrigin(req: Request): string {
  const publicOrigin = process.env.PUBLIC_OAUTH_ORIGIN?.trim();
  if (publicOrigin) {
    return publicOrigin.replace(/\/+$/, "");
  }

  const proto = req.headers["x-forwarded-proto"] || req.protocol || "http";
  const host =
    req.headers["x-forwarded-host"] || req.headers["host"] || "localhost";
  return `${proto}://${host}`;
}

function getAppOrigin(req: Request): string {
  const fallback = getOrigin(req);
  const fallbackHost = new URL(fallback).host;
  const originHeader = req.headers.origin;

  if (typeof originHeader === "string") {
    try {
      const parsed = new URL(originHeader);
      if (parsed.protocol === "http:" || parsed.protocol === "https:") {
        if (parsed.host === fallbackHost) {
          return `${parsed.protocol}//${parsed.host}`;
        }
      }
    } catch {
      // ignore malformed origin header and use fallback
    }
  }

  const refererHeader = req.headers.referer;
  if (typeof refererHeader === "string") {
    try {
      const parsed = new URL(refererHeader);
      if (parsed.protocol === "http:" || parsed.protocol === "https:") {
        if (parsed.host === fallbackHost) {
          return `${parsed.protocol}//${parsed.host}`;
        }
      }
    } catch {
      // ignore malformed referer and use fallback
    }
  }

  return fallback;
}

function getSafeLogoutReturnTo(value: unknown, appOrigin: string): string {
  if (typeof value !== "string" || !value.trim()) {
    return appOrigin;
  }

  try {
    const parsed = new URL(value);
    const app = new URL(appOrigin);
    const sameHost = parsed.host === app.host;
    const sameLocalHostname =
      parsed.hostname === app.hostname &&
      (parsed.hostname === "localhost" || parsed.hostname === "127.0.0.1");
    const httpProtocol =
      parsed.protocol === "http:" || parsed.protocol === "https:";
    if ((sameHost || sameLocalHostname) && httpProtocol) {
      return parsed.toString();
    }
  } catch {
    // ignore malformed URL and use app origin fallback
  }

  return appOrigin;
}

function shouldUseSecureCookies(req: Request): boolean {
  const forwardedProto = req.headers["x-forwarded-proto"];
  const proto = Array.isArray(forwardedProto) ? forwardedProto[0] : forwardedProto;
  const isHttps = proto === "https" || req.protocol === "https";
  return process.env.NODE_ENV === "production" || isHttps;
}

function setSessionCookie(req: Request, res: Response, sid: string) {
  res.cookie(SESSION_COOKIE, sid, {
    httpOnly: true,
    secure: shouldUseSecureCookies(req),
    sameSite: "lax",
    path: "/",
    maxAge: SESSION_TTL,
  });
}

function setOidcCookie(req: Request, res: Response, name: string, value: string) {
  res.cookie(name, value, {
    httpOnly: true,
    secure: shouldUseSecureCookies(req),
    sameSite: "lax",
    path: "/",
    maxAge: OIDC_COOKIE_TTL,
  });
}

function getSafeReturnTo(value: unknown, appOrigin: string): string {
  if (typeof value !== "string" || !value.trim()) {
    return `${appOrigin}/app`;
  }

  // Allow trusted custom-scheme deep links for native mobile auth handoff.
  if (
    value.startsWith("mobile-app://") ||
    value.startsWith("exp://") ||
    value.startsWith("exps://")
  ) {
    return value;
  }

  if (value.startsWith("/") && !value.startsWith("//")) {
    return `${appOrigin}${value}`;
  }

  try {
    const parsed = new URL(value);
    const app = new URL(appOrigin);
    const sameHost = parsed.host === app.host;
    const sameLocalHostname =
      parsed.hostname === app.hostname &&
      (parsed.hostname === "localhost" || parsed.hostname === "127.0.0.1");
    const httpProtocol =
      parsed.protocol === "http:" || parsed.protocol === "https:";
    if ((sameHost || sameLocalHostname) && httpProtocol) {
      return parsed.toString();
    }
  } catch {
    // ignore malformed URL and fall back to app origin default
  }

  return `${appOrigin}/app`;
}

async function upsertUser(claims: Record<string, unknown>) {
  const userData = {
    id: claims.sub as string,
    email: (claims.email as string) || null,
    firstName: (claims.first_name as string) || null,
    lastName: (claims.last_name as string) || null,
    profileImageUrl: (claims.profile_image_url || claims.picture) as
      | string
      | null,
  };

  const [user] = await db
    .insert(usersTable)
    .values(userData)
    .onConflictDoUpdate({
      target: usersTable.id,
      set: {
        ...userData,
        updatedAt: new Date(),
      },
    })
    .returning();
  return user;
}

router.get("/me", (req: Request, res: Response) => {
  res.json(
    GetCurrentUserResponse.parse({
      user: req.isAuthenticated() ? req.user : null,
    }),
  );
});

router.get("/login", async (req: Request, res: Response) => {
  const config = await getOidcConfig();
  const callbackUrl = `${getOrigin(req)}/api/callback`;
  const callbackHost = new URL(callbackUrl).hostname;
  const isGoogleIssuer = ISSUER_URL.includes("accounts.google.com");
  const appOrigin = getAppOrigin(req);

  const returnTo = getSafeReturnTo(req.query.returnTo, appOrigin);

  const state = oidc.randomState();
  const nonce = oidc.randomNonce();
  const codeVerifier = oidc.randomPKCECodeVerifier();
  const codeChallenge = await oidc.calculatePKCECodeChallenge(codeVerifier);

  const authorizationParams: Record<string, string> = {
    redirect_uri: callbackUrl,
    scope: isGoogleIssuer
      ? "openid https://www.googleapis.com/auth/userinfo.email https://www.googleapis.com/auth/userinfo.profile"
      : "openid email profile offline_access",
    code_challenge: codeChallenge,
    code_challenge_method: "S256",
    prompt: "login consent",
    ...(isGoogleIssuer ? { access_type: "offline" } : {}),
    state,
    nonce,
  };

  if (isGoogleIssuer && isPrivateHostname(callbackHost)) {
    // Google requires these fields when using private-IP redirect URIs.
    authorizationParams.device_id = state;
    authorizationParams.device_name = "Recipe Genie Dev";
  }

  const redirectTo = oidc.buildAuthorizationUrl(config, authorizationParams);

  setOidcCookie(req, res, "code_verifier", codeVerifier);
  setOidcCookie(req, res, "nonce", nonce);
  setOidcCookie(req, res, "state", state);
  setOidcCookie(req, res, "return_to", returnTo);

  res.redirect(redirectTo.href);
});

// Query params are not validated because the OIDC provider may include
// parameters not expressed in the schema.
router.get("/callback", async (req: Request, res: Response) => {
  const config = await getOidcConfig();
  const callbackUrl = `${getOrigin(req)}/api/callback`;
  const appOrigin = getAppOrigin(req);
  const loginFallback = `/api/login?returnTo=${encodeURIComponent(`${appOrigin}/app`)}`;

  const codeVerifier = req.cookies?.code_verifier;
  const nonce = req.cookies?.nonce;
  const expectedState = req.cookies?.state;

  if (!codeVerifier || !expectedState) {
    res.redirect(loginFallback);
    return;
  }

  const currentUrl = new URL(
    `${callbackUrl}?${new URL(req.url, `http://${req.headers.host}`).searchParams}`,
  );

  let tokens: oidc.TokenEndpointResponse & oidc.TokenEndpointResponseHelpers;
  try {
    tokens = await oidc.authorizationCodeGrant(config, currentUrl, {
      pkceCodeVerifier: codeVerifier,
      expectedNonce: nonce,
      expectedState,
      idTokenExpected: true,
    });
  } catch {
    res.redirect(loginFallback);
    return;
  }

  const returnTo = getSafeReturnTo(req.cookies?.return_to, appOrigin);

  res.clearCookie("code_verifier", { path: "/" });
  res.clearCookie("nonce", { path: "/" });
  res.clearCookie("state", { path: "/" });
  res.clearCookie("return_to", { path: "/" });

  const claims = tokens.claims();
  if (!claims) {
    res.redirect(loginFallback);
    return;
  }

  const dbUser = await upsertUser(
    claims as unknown as Record<string, unknown>,
  );

  const now = Math.floor(Date.now() / 1000);
  const sessionData: SessionData = {
    user: {
      id: dbUser.id,
      email: dbUser.email,
      firstName: dbUser.firstName,
      lastName: dbUser.lastName,
      profileImageUrl: dbUser.profileImageUrl,
    },
    access_token: tokens.access_token,
    refresh_token: tokens.refresh_token,
    expires_at: tokens.expiresIn() ? now + tokens.expiresIn()! : claims.exp,
  };

  const sid = await createSession(sessionData);
  setSessionCookie(req, res, sid);

  if (
    returnTo.startsWith("mobile-app://") ||
    returnTo.startsWith("exp://") ||
    returnTo.startsWith("exps://")
  ) {
    try {
      const redirect = new URL(returnTo);
      redirect.searchParams.set("sid", sid);
      res.redirect(redirect.toString());
      return;
    } catch {
      // Fallback to default browser redirect if custom URL parsing fails.
    }
  }

  res.redirect(returnTo);
});

router.get("/auth/logout", async (req: Request, res: Response) => {
  const appOrigin = getAppOrigin(req);
  const returnTo = getSafeLogoutReturnTo(req.query.returnTo, appOrigin);

  const sid = getSessionId(req);
  await clearSession(res, sid);

  try {
    const config = await getOidcConfig();
    const endSessionUrl = oidc.buildEndSessionUrl(config, {
      client_id: getOidcClientId(),
      post_logout_redirect_uri: returnTo,
    });
    res.redirect(endSessionUrl.href);
  } catch {
    // Some providers (e.g. Google) may not expose RP-initiated logout.
    res.redirect(returnTo);
  }
});

router.post(
  "/mobile-auth/token-exchange",
  async (req: Request, res: Response) => {
    const parsed = ExchangeMobileAuthorizationCodeBody.safeParse(req.body);
    if (!parsed.success) {
      res.status(400).json({ error: "Missing or invalid required parameters" });
      return;
    }

    const { code, code_verifier, redirect_uri, state, nonce } = parsed.data;

    try {
      const config = await getMobileOidcConfig();

      const callbackUrl = new URL(redirect_uri);
      callbackUrl.searchParams.set("code", code);
      callbackUrl.searchParams.set("state", state);
      callbackUrl.searchParams.set("iss", ISSUER_URL);

      const tokens = await oidc.authorizationCodeGrant(config, callbackUrl, {
        pkceCodeVerifier: code_verifier,
        expectedNonce: nonce ?? undefined,
        expectedState: state,
        idTokenExpected: true,
      });

      const claims = tokens.claims();
      if (!claims) {
        res.status(401).json({ error: "No claims in ID token" });
        return;
      }

      const dbUser = await upsertUser(
        claims as unknown as Record<string, unknown>,
      );

      const now = Math.floor(Date.now() / 1000);
      const sessionData: SessionData = {
        user: {
          id: dbUser.id,
          email: dbUser.email,
          firstName: dbUser.firstName,
          lastName: dbUser.lastName,
          profileImageUrl: dbUser.profileImageUrl,
        },
        access_token: tokens.access_token,
        refresh_token: tokens.refresh_token,
        expires_at: tokens.expiresIn() ? now + tokens.expiresIn()! : claims.exp,
      };

      const sid = await createSession(sessionData);
      res.json(ExchangeMobileAuthorizationCodeResponse.parse({ token: sid }));
    } catch (err) {
      console.error("Mobile token exchange error:", err);
      res.status(500).json({ error: "Token exchange failed" });
    }
  },
);

let cachedDiscovery: { authorization_endpoint: string } | null = null;

router.get("/mobile-auth/config", async (_req: Request, res: Response) => {
  const clientId = getMobileOidcClientId();
  const isGoogleIssuer = ISSUER_URL.includes("accounts.google.com");
  const scope = isGoogleIssuer
    ? "openid https://www.googleapis.com/auth/userinfo.email https://www.googleapis.com/auth/userinfo.profile"
    : "openid email profile offline_access";

  if (!cachedDiscovery) {
    try {
      const discoveryUrl = `${ISSUER_URL.replace(/\/$/, "")}/.well-known/openid-configuration`;
      const resFetch = await fetch(discoveryUrl);
      const discovery = (await resFetch.json()) as { authorization_endpoint?: string };
      if (discovery.authorization_endpoint) {
        cachedDiscovery = { authorization_endpoint: discovery.authorization_endpoint };
      }
    } catch (e) {
      console.warn("OIDC discovery fetch failed, using default:", e);
    }
    if (!cachedDiscovery && isGoogleIssuer) {
      cachedDiscovery = {
        authorization_endpoint: "https://accounts.google.com/o/oauth2/v2/auth",
      };
    }
  }

  res.json({
    clientId,
    issuerUrl: ISSUER_URL,
    authorizationEndpoint: cachedDiscovery?.authorization_endpoint ?? `${ISSUER_URL.replace(/\/$/, "")}/oauth2/auth`,
    scope,
  });
});

router.post("/mobile-auth/logout", async (req: Request, res: Response) => {
  const sid = getSessionId(req);
  if (sid) {
    await deleteSession(sid);
  }
  res.json(LogoutMobileSessionResponse.parse({ success: true }));
});

export default router;
