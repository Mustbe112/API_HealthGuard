import { Request, Response, RequestHandler } from "express";
import { z } from "zod";
import { prisma } from "../db/client";
import { hashPassword, verifyPassword } from "../utils/hash";
import { signToken } from "../utils/jwt";

const credentialsSchema = z.object({
  email: z.string().email(),
  password: z.string().min(8, "Password must be at least 8 characters"),
});

// Express 4 does not catch rejected promises from async handlers on its
// own — without this, a thrown error (e.g. DB connection drop) would
// leave the request hanging instead of reaching the error middleware.
function asyncHandler(fn: RequestHandler): RequestHandler {
  return (req, res, next) => Promise.resolve(fn(req, res, next)).catch(next);
}

async function signupHandler(req: Request, res: Response) {
  const parsed = credentialsSchema.safeParse(req.body);
  if (!parsed.success) {
    return res.status(400).json({ error: parsed.error.flatten() });
  }
  const { email, password } = parsed.data;

  const existing = await prisma.user.findUnique({ where: { email } });
  if (existing) {
    // Deliberately vague message — don't confirm/deny which emails exist.
    return res.status(409).json({ error: "Could not create account with these details" });
  }

  const passwordHash = await hashPassword(password);
  const user = await prisma.user.create({
    data: { email, passwordHash },
    select: { id: true, email: true, createdAt: true },
  });

  const token = signToken({ userId: user.id, email: user.email });
  return res.status(201).json({ user, token });
}

async function loginHandler(req: Request, res: Response) {
  const parsed = credentialsSchema.safeParse(req.body);
  if (!parsed.success) {
    return res.status(400).json({ error: parsed.error.flatten() });
  }
  const { email, password } = parsed.data;

  const user = await prisma.user.findUnique({ where: { email } });
  // Same generic error whether the email doesn't exist or the password is
  // wrong — avoids leaking which emails are registered.
  const genericError = () => res.status(401).json({ error: "Invalid email or password" });

  if (!user) return genericError();

  const valid = await verifyPassword(user.passwordHash, password);
  if (!valid) return genericError();

  const token = signToken({ userId: user.id, email: user.email });
  return res.status(200).json({
    user: { id: user.id, email: user.email, createdAt: user.createdAt },
    token,
  });
}

async function meHandler(req: Request, res: Response) {
  // req.user is set by requireAuth middleware
  const user = await prisma.user.findUnique({
    where: { id: req.user!.userId },
    select: { id: true, email: true, createdAt: true },
  });
  if (!user) return res.status(404).json({ error: "User not found" });
  return res.status(200).json({ user });
}

export const signup = asyncHandler(signupHandler);
export const login = asyncHandler(loginHandler);
export const me = asyncHandler(meHandler);
