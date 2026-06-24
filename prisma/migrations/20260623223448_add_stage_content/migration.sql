-- RedefineTables
PRAGMA defer_foreign_keys=ON;
PRAGMA foreign_keys=OFF;
CREATE TABLE "new_Stage" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "roadmapId" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "description" TEXT NOT NULL,
    "objectives" TEXT NOT NULL DEFAULT '[]',
    "subModules" TEXT NOT NULL DEFAULT '[]',
    "resources" TEXT NOT NULL DEFAULT '[]',
    "content" TEXT NOT NULL DEFAULT '',
    "estimatedHours" INTEGER NOT NULL DEFAULT 2,
    "status" TEXT NOT NULL DEFAULT 'not_started',
    "orderIndex" INTEGER NOT NULL,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "Stage_roadmapId_fkey" FOREIGN KEY ("roadmapId") REFERENCES "Roadmap" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);
INSERT INTO "new_Stage" ("createdAt", "description", "estimatedHours", "id", "objectives", "orderIndex", "resources", "roadmapId", "status", "subModules", "title", "updatedAt") SELECT "createdAt", "description", "estimatedHours", "id", "objectives", "orderIndex", "resources", "roadmapId", "status", "subModules", "title", "updatedAt" FROM "Stage";
DROP TABLE "Stage";
ALTER TABLE "new_Stage" RENAME TO "Stage";
PRAGMA foreign_keys=ON;
PRAGMA defer_foreign_keys=OFF;
