import { migrateDb, closeDb } from "../src/lib/db/client";
import { getDatabasePath } from "../src/lib/env";

migrateDb();
console.log(`Migrated database at ${getDatabasePath()}`);
closeDb();
