import { migrateDb } from "../src/lib/db/client";
import { workerLoop } from "../src/lib/jobs/worker";

migrateDb();
workerLoop().catch((err) => {
  console.error(err);
  process.exit(1);
});
