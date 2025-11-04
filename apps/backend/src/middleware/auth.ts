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

  const jwtSecret = process.env.JWT_SECRET;
  if (!jwtSecret) {
    console.error("🔴 CRITICAL: JWT_SECRET is not defined in environment variables!");
    return res.status(500).json({ 
      error: "Internal Server Error", 
      message: "Server configuration error" 
    });
  }

  jwt.verify(token, jwtSecret, (err: any, decoded: any) => {
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
  const jwtSecret = process.env.JWT_SECRET;
  if (!jwtSecret) {
    throw new Error("JWT_SECRET is not defined in environment variables!");
  }

  return jwt.sign(
    { id: userId, email },
    jwtSecret,
    { expiresIn: "7d" }
  );
};