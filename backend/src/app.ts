import express from "express";
import cors from "cors";
import authRoutes from "./routes/auth";
import rpcRoutes from "./routes/rpc";
import { env } from "./utils/env";

const app = express();

app.use(cors({
  origin: env.frontendOrigin.split(",").map((value) => value.trim()),
}));

app.use(express.json({ limit: "20mb" }));
app.use(express.urlencoded({ extended: true, limit: "20mb" }));

app.get("/api/health", (_req, res) => {
  res.json({ status: "ok", timestamp: new Date().toISOString() });
});

app.use("/api/auth", authRoutes);
app.use("/api/rpc", rpcRoutes);

export default app;
