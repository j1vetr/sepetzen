import jwt from 'jsonwebtoken';
import { randomBytes } from 'crypto';
import { db } from './db';
import { refreshTokens, users, adminUsers } from '@shared/schema';
import { eq, and, isNull, gt } from 'drizzle-orm';

const JWT_SECRET = process.env.JWT_SECRET || process.env.SESSION_SECRET || 'polen-stone-jwt-secret-2026';
const ACCESS_TOKEN_EXPIRY = '15m';
const REFRESH_TOKEN_EXPIRY_DAYS = 7;

export interface JwtPayload {
  userId?: string;
  adminUserId?: string;
  email: string;
  type: 'user' | 'admin';
}

export function generateAccessToken(payload: JwtPayload): string {
  return jwt.sign(payload, JWT_SECRET, { expiresIn: ACCESS_TOKEN_EXPIRY });
}

export function verifyAccessToken(token: string): JwtPayload | null {
  try {
    return jwt.verify(token, JWT_SECRET) as JwtPayload;
  } catch {
    return null;
  }
}

export async function generateRefreshToken(
  payload: JwtPayload,
  userAgent?: string,
  ipAddress?: string
): Promise<string> {
  const token = randomBytes(64).toString('hex');
  const expiresAt = new Date();
  expiresAt.setDate(expiresAt.getDate() + REFRESH_TOKEN_EXPIRY_DAYS);

  await db.insert(refreshTokens).values({
    userId: payload.userId || null,
    adminUserId: payload.adminUserId || null,
    token,
    expiresAt,
    userAgent,
    ipAddress,
  });

  return token;
}

export interface RefreshResult {
  payload: JwtPayload;
  newRefreshToken: string;
}

export async function validateAndRotateRefreshToken(
  token: string,
  userAgent?: string,
  ipAddress?: string
): Promise<RefreshResult | null> {
  const [refreshToken] = await db
    .select()
    .from(refreshTokens)
    .where(
      and(
        eq(refreshTokens.token, token),
        isNull(refreshTokens.revokedAt),
        gt(refreshTokens.expiresAt, new Date())
      )
    )
    .limit(1);

  if (!refreshToken) {
    return null;
  }

  // Revoke the old token immediately (rotation)
  await db
    .update(refreshTokens)
    .set({ revokedAt: new Date() })
    .where(eq(refreshTokens.token, token));

  let payload: JwtPayload | null = null;

  if (refreshToken.userId) {
    const [user] = await db.select().from(users).where(eq(users.id, refreshToken.userId)).limit(1);
    if (!user) return null;
    payload = { userId: user.id, email: user.email, type: 'user' };
  } else if (refreshToken.adminUserId) {
    const [admin] = await db.select().from(adminUsers).where(eq(adminUsers.id, refreshToken.adminUserId)).limit(1);
    if (!admin) return null;
    payload = { adminUserId: admin.id, email: admin.username, type: 'admin' };
  }

  if (!payload) {
    return null;
  }

  // Generate a new refresh token
  const newRefreshToken = await generateRefreshToken(payload, userAgent, ipAddress);

  return { payload, newRefreshToken };
}

// Legacy function for backward compatibility (does not rotate)
export async function validateRefreshToken(token: string): Promise<JwtPayload | null> {
  const [refreshToken] = await db
    .select()
    .from(refreshTokens)
    .where(
      and(
        eq(refreshTokens.token, token),
        isNull(refreshTokens.revokedAt),
        gt(refreshTokens.expiresAt, new Date())
      )
    )
    .limit(1);

  if (!refreshToken) {
    return null;
  }

  if (refreshToken.userId) {
    const [user] = await db.select().from(users).where(eq(users.id, refreshToken.userId)).limit(1);
    if (!user) return null;
    return { userId: user.id, email: user.email, type: 'user' };
  }

  if (refreshToken.adminUserId) {
    const [admin] = await db.select().from(adminUsers).where(eq(adminUsers.id, refreshToken.adminUserId)).limit(1);
    if (!admin) return null;
    return { adminUserId: admin.id, email: admin.username, type: 'admin' };
  }

  return null;
}

export async function revokeRefreshToken(token: string): Promise<void> {
  await db
    .update(refreshTokens)
    .set({ revokedAt: new Date() })
    .where(eq(refreshTokens.token, token));
}

export async function revokeAllUserTokens(userId: string): Promise<void> {
  await db
    .update(refreshTokens)
    .set({ revokedAt: new Date() })
    .where(and(eq(refreshTokens.userId, userId), isNull(refreshTokens.revokedAt)));
}

export async function revokeAllAdminTokens(adminUserId: string): Promise<void> {
  await db
    .update(refreshTokens)
    .set({ revokedAt: new Date() })
    .where(and(eq(refreshTokens.adminUserId, adminUserId), isNull(refreshTokens.revokedAt)));
}

export function setAuthCookies(
  res: any,
  accessToken: string,
  refreshToken: string,
  isProduction: boolean
): void {
  const cookieOptions = {
    httpOnly: true,
    secure: isProduction,
    sameSite: isProduction ? 'strict' as const : 'lax' as const,
    path: '/',
  };

  res.cookie('access_token', accessToken, {
    ...cookieOptions,
    maxAge: 15 * 60 * 1000,
  });

  res.cookie('refresh_token', refreshToken, {
    ...cookieOptions,
    maxAge: REFRESH_TOKEN_EXPIRY_DAYS * 24 * 60 * 60 * 1000,
  });
}

export function clearAuthCookies(res: any): void {
  res.clearCookie('access_token', { path: '/' });
  res.clearCookie('refresh_token', { path: '/' });
}

// Cart token for anonymous shopping carts
const CART_TOKEN_EXPIRY_DAYS = 30;

export function generateCartToken(): string {
  return randomBytes(32).toString('hex');
}

export function setCartTokenCookie(res: any, cartToken: string, isProduction: boolean): void {
  res.cookie('cart_token', cartToken, {
    httpOnly: true,
    secure: isProduction,
    sameSite: isProduction ? 'strict' as const : 'lax' as const,
    path: '/',
    maxAge: CART_TOKEN_EXPIRY_DAYS * 24 * 60 * 60 * 1000,
  });
}

export function getOrCreateCartToken(req: any, res: any): string {
  let cartToken = req.cookies?.cart_token;
  if (!cartToken) {
    cartToken = generateCartToken();
    const isProduction = process.env.NODE_ENV === 'production';
    setCartTokenCookie(res, cartToken, isProduction);
  }
  return cartToken;
}
