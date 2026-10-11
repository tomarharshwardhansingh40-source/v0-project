import jwt from "jsonwebtoken";

export function requireAuth(req, res, next) {
  const token = req.cookies?.token;
  if (!token) {
    return res.status(401).json({ error: "Not logged in or session expired" });
  }

  try {
    const payload = jwt.verify(token, process.env.JWT_SECRET);
    if (!payload?.id) {
      return res.status(401).json({ error: "Not logged in or session expired" });
    }
    req.user = { id: payload.id };
    return next();
  } catch {
    return res.status(401).json({ error: "Not logged in or session expired" });
  }
}
