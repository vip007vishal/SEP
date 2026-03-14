import app from "./app";
import { env } from "./utils/env";
import { initExamService } from "./services/examService";

const bootstrap = async () => {
  await initExamService();

  if (process.argv.includes("--init-only")) {
    console.log("Database schema initialized successfully.");
    process.exit(0);
  }

  app.listen(env.port, () => {
    console.log(`Smart Exam Planner backend running on port ${env.port}`);
  });
};

bootstrap().catch((error) => {
  console.error("Failed to start backend:", error);
  process.exit(1);
});
