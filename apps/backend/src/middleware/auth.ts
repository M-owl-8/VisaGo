import { Request, Response, NextFunction } from "express";
import jwt from "jsonwebtoken";

declare global {
  namespace Express {
    interface Request {
      userId?: string;
      user?: { id: string; email: string };
    }
  }
}

export const authenticateToken = (req: Request, res: Response, next: NextFunction) => {
  const authHeader = req.headers["authorization"];
  const token = authHeader && authHeader.split(" ")[1]; // Bearer TOKEN

  if (!token) {
    return res.status(401).json({ error: "Unauthorized", message: "No token provided" });
  }

  jwt.verify(token, process.env.JWT_SECRET || "your-secret-key", (err: any, decoded: any) => {
    if (err) {
      console.error("Token verification failed:", err.message);
      return res.status(403).json({ error: "Forbidden", message: "Invalid or expired token" });
    }

    req.userId = decoded.id;
    req.user = { id: decoded.id, email: decoded.email };
    next();
  });
};

export const generateToken = (userId: string, email: string): string => {
  return jwt.sign(
    { id: userId, email },
    process.env.JWT_SECRET || "your-secret-key",
    { expiresIn: "7d" }
  );
};