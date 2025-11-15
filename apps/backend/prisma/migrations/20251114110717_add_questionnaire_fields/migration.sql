-- RedefineTables
PRAGMA defer_foreign_keys=ON;
PRAGMA foreign_keys=OFF;
CREATE TABLE "new_User" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "email" TEXT NOT NULL,
    "googleId" TEXT,
    "firstName" TEXT,
    "lastName" TEXT,
    "phone" TEXT,
    "passwordHash" TEXT,
    "avatar" TEXT,
    "language" TEXT NOT NULL DEFAULT 'en',
    "timezone" TEXT,
    "currency" TEXT NOT NULL DEFAULT 'USD',
    "emailVerified" BOOLEAN NOT NULL DEFAULT false,
    "bio" TEXT,
    "questionnaireCompleted" BOOLEAN NOT NULL DEFAULT false,
    "role" TEXT NOT NULL DEFAULT 'user',
    "resetToken" TEXT,
    "resetTokenExpiry" DATETIME,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL
);
INSERT INTO "new_User" ("avatar", "createdAt", "currency", "email", "emailVerified", "firstName", "googleId", "id", "language", "lastName", "passwordHash", "phone", "resetToken", "resetTokenExpiry", "role", "timezone", "updatedAt") SELECT "avatar", "createdAt", "currency", "email", "emailVerified", "firstName", "googleId", "id", "language", "lastName", "passwordHash", "phone", "resetToken", "resetTokenExpiry", "role", "timezone", "updatedAt" FROM "User";
DROP TABLE "User";
ALTER TABLE "new_User" RENAME TO "User";
CREATE UNIQUE INDEX "User_email_key" ON "User"("email");
CREATE UNIQUE INDEX "User_googleId_key" ON "User"("googleId");
CREATE INDEX "User_email_idx" ON "User"("email");
CREATE INDEX "User_googleId_idx" ON "User"("googleId");
CREATE INDEX "User_role_idx" ON "User"("role");
PRAGMA foreign_keys=ON;
PRAGMA defer_foreign_keys=OFF;
