import { type Request, type Response, type NextFunction } from "express";
import { getSessionId } from "../lib/auth";

export function requireAuth(req: Request, res: Response, next: NextFunction) {
  if (!req.isAuthenticated()) {
    const sid = getSessionId(req);
    res.status(401).json({
      error: sid ? "Unauthorized" : "No authorization header provided",
      message: sid
        ? "Session invalid or expired"
        : "Please include an Authorization header with a Bearer token",
    });
    return;
  }
  next();
}
