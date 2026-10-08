import type { Request, Response } from 'express';
import crypto from 'node:crypto';

import { prisma } from './prisma-db';

export type SessionUser = {
  userId: string;
  email: string;
  name?: string;
  role?: string;
  teamId?: string;
};

export const SESSION_COOKIE = 'gamersify_session';

const SESSION_TTL = 1000 * 60 * 60 * 24 * 7;

function parseCookies(req: Request) {
  const header = req.headers.cookie || '';
  const cookies: Record<string, string> = {};

  for (const part of header.split(';')) {
    const [key, ...value] = part.trim().split('=');

    if (!key) continue;

    cookies[key] = decodeURIComponent(value.join('='));
  }

  return cookies;
}

export async function createSession(
  res: Response,
  user: SessionUser
) {
  const token = crypto.randomBytes(48).toString('hex');

  const expiresAt = new Date(
    Date.now() + SESSION_TTL
  );

  await prisma.session.create({
    data: {
      token,
      userId: user.userId,
      expiresAt,
    },
  });

  res.cookie(SESSION_COOKIE, token, {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'lax',
    maxAge: SESSION_TTL,
    path: '/',
  });

  return token;
}

export async function destroySession(
  req: Request,
  res: Response
) {
  const cookies = parseCookies(req);
  const token = cookies[SESSION_COOKIE];

  if (token) {
    await prisma.session.deleteMany({
      where: { token },
    });
  }

  res.clearCookie(SESSION_COOKIE, {
    httpOnly: true,
    sameSite: 'lax',
    secure: process.env.NODE_ENV === 'production',
    path: '/',
  });
}

export async function getSessionUser(
  req: Request
): Promise<SessionUser | null> {
  const cookies = parseCookies(req);
  const token = cookies[SESSION_COOKIE];

  if (!token) return null;

  const session = await prisma.session.findUnique({
    where: { token },
  });

  if (!session) return null;

  if (session.expiresAt.getTime() < Date.now()) {
    await prisma.session.delete({
      where: { id: session.id },
    });

    return null;
  }

  const admin = await prisma.adminUser.findUnique({
    where: { id: session.userId },
  });

  if (
    !admin ||
    !admin.active ||
    admin.deletedAt
  ) {
    await prisma.session.delete({
      where: { id: session.id },
    });

    return null;
  }

  return {
    userId: admin.id,
    email: admin.email,
    name: admin.name || undefined,
    role: admin.role,
    teamId: admin.teamId || undefined,
  };
}

export function requireAuth() {
  return async ({ req }: { req: Request }) => {
    const user = await getSessionUser(req);

    if (!user) {
      return {
        __type: 'error',
        message: 'Authentication required',
        status: 401,
      };
    }

    (req as any).user = user;
  };
}

export function requireAdminEmailAllowlist(
  emails: string[]
) {
  return async ({ req }: { req: Request }) => {
    const user = await getSessionUser(req);

    if (!user) {
      return {
        __type: 'error',
        message: 'Authentication required',
        status: 401,
      };
    }

    const allowed = emails.some(
      email =>
        email.toLowerCase() ===
        String(user.email || '').toLowerCase()
    );

    if (!allowed) {
      return {
        __type: 'error',
        message: 'Forbidden',
        status: 403,
      };
    }

    (req as any).user = user;
  };
}
