import { fromNodeHeaders } from "better-auth/node";
import { auth } from "./auth.js";

export class HttpError extends Error {
  constructor(status, message) {
    super(message);
    this.status = status;
  }
}
export const bad = (msg) => {
  throw new HttpError(400, msg);
};

export async function requireAuth(req, res, next) {
  const session = await auth.api.getSession({ headers: fromNodeHeaders(req.headers) });
  if (!session) return res.status(401).json({ error: "Please sign in to continue." });
  req.user = session.user;
  next();
}

export const requireRole = (role) => (req, res, next) =>
  req.user.role === role ? next() : res.status(403).json({ error: `This area is only for ${role === "tpo" ? "placement officers" : "students"}.` });
