import app from "./app";
import { env } from "./utils/env";
import { loadDb, saveDb } from "./store/db";

const db = loadDb();
saveDb(db);

app.listen(env.port, () => {
  console.log(`Smart Exam Planner backend running on port ${env.port}`);
});
