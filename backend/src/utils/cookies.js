import jwt from "jsonwebtoken";

const DAY_MS = 24 * 60 * 60 * 1000;

export function cookieOptions() {
  const isProd = process.env.NODE_ENV === "production";
  return {
    httpOnly: true,
    secure: isProd,
    sameSite: isProd ? "none" : "lax",
    maxAge: DAY_MS,
    path: "/",
  };
}

export function clearCookieOptions() {
  const opts = cookieOptions();
  delete opts.maxAge;
  return opts;
}

export function signToken(userId) {
  return jwt.sign({ id: userId }, process.env.JWT_SECRET, {
    expiresIn: process.env.JWT_EXPIRES_IN || "1d",
  });
}
