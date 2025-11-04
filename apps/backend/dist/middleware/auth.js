"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.generateToken = exports.authenticateToken = void 0;
const jsonwebtoken_1 = __importDefault(require("jsonwebtoken"));
const authenticateToken = (req, res, next) => {
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
    jsonwebtoken_1.default.verify(token, jwtSecret, (err, decoded) => {
        if (err) {
            console.error("Token verification failed:", err.message);
            return res.status(403).json({ error: "Forbidden", message: "Invalid or expired token" });
        }
        req.userId = decoded.id;
        req.user = { id: decoded.id, email: decoded.email };
        next();
    });
};
exports.authenticateToken = authenticateToken;
const generateToken = (userId, email) => {
    const jwtSecret = process.env.JWT_SECRET;
    if (!jwtSecret) {
        throw new Error("JWT_SECRET is not defined in environment variables!");
    }
    return jsonwebtoken_1.default.sign({ id: userId, email }, jwtSecret, { expiresIn: "7d" });
};
exports.generateToken = generateToken;
//# sourceMappingURL=auth.js.map