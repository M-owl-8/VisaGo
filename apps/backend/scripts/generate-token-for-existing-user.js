const jwt = require("jsonwebtoken");
require("dotenv").config();

const JWT_SECRET = process.env.JWT_SECRET;
if (!JWT_SECRET) {
  console.error("❌ Error: JWT_SECRET environment variable is not set");
  console.error("   Please set JWT_SECRET in your .env file or environment");
  process.exit(1);
}

// Use the real user ID that exists in the database
// This is for yeger9889@gmail.com who is super_admin
const userId = "cmif22w2j00006zxehywqq9kd";
const email = "yeger9889@gmail.com";
const role = "super_admin";

const token = jwt.sign(
  {
    id: userId,
    email: email,
    role: role
  },
  JWT_SECRET,
  { 
    expiresIn: "30d",
    issuer: "visabuddy-api",
    audience: "visabuddy-app"
  }
);

console.log("\n✅ JWT Token Generated (Using Real User ID):\n");
console.log("=".repeat(80));
console.log("User Information:");
console.log(`  User ID: ${userId}`);
console.log(`  Email: ${email}`);
console.log(`  Role: ${role}`);
console.log("=".repeat(80));
console.log("\nToken:");
console.log(token);
console.log("\n" + "=".repeat(80));
console.log("\n📝 Usage in Thunder Client:");
console.log("  Authorization: Bearer " + token);
console.log("\n");

