const jwt = require("jsonwebtoken");
require("dotenv").config();

const JWT_SECRET = process.env.JWT_SECRET;
if (!JWT_SECRET) {
  console.error("❌ Error: JWT_SECRET environment variable is not set");
  console.error("   Please set JWT_SECRET in your .env file or environment");
  process.exit(1);
}

const token = jwt.sign(
  {
    id: "founder",
    email: "admin@ketdik.com",
    role: "super_admin"
  },
  JWT_SECRET,
  { 
    expiresIn: "30d",
    issuer: "visabuddy-api",
    audience: "visabuddy-app"
  }
);

console.log("\n✅ JWT Token Generated:\n");
console.log("=".repeat(80));
console.log(token);
console.log("=".repeat(80));
console.log("\n📝 Usage:");
console.log("  Authorization: Bearer " + token);
console.log("\n");

