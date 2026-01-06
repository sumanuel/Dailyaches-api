import { createError } from "h3";
import jwt from "jsonwebtoken";

export type JwtPayload = {
  sub: string;
  email: string;
};

export function signAccessToken(payload: JwtPayload) {
  const config = useRuntimeConfig();
  const secret = config.jwtSecret;
  const expiresIn = (config.jwtExpiresIn ||
    "7d") as jwt.SignOptions["expiresIn"];

  if (!secret) {
    throw createError({
      statusCode: 500,
      statusMessage: "JWT_SECRET is not configured",
    });
  }

  return jwt.sign(
    payload,
    secret as jwt.Secret,
    { algorithm: "HS256", expiresIn } as jwt.SignOptions
  );
}

export function verifyAccessToken(token: string): JwtPayload {
  const config = useRuntimeConfig();
  const secret = config.jwtSecret;

  if (!secret) {
    throw createError({
      statusCode: 500,
      statusMessage: "JWT_SECRET is not configured",
    });
  }

  try {
    const decoded = jwt.verify(token, secret as jwt.Secret, {
      algorithms: ["HS256"],
    });
    if (typeof decoded !== "object" || decoded === null) {
      throw new Error("Invalid token payload");
    }
    const { sub, email } = decoded as any;
    if (!sub || !email) throw new Error("Missing token fields");
    return { sub: String(sub), email: String(email) };
  } catch {
    throw createError({
      statusCode: 401,
      statusMessage: "Invalid or expired token",
    });
  }
}
