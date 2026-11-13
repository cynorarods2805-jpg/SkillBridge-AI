import "dotenv/config";
import express from "express";
import path from "node:path";
import fs from "node:fs";
import { fileURLToPath } from "node:url";
import { toNodeHandler } from "better-auth/node";
import { auth } from "./auth.js";
import { requireAuth, requireRole } from "./middleware.js";
import studentRoutes from "./routes/student.js";
import tpoRoutes from "./routes/tpo.js";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const app = express();

// Better Auth must be mounted BEFORE express.json() so it can read the raw body itself.
app.all("/api/auth/*splat", toNodeHandler(auth));

app.use(express.json({ limit: "1mb" }));

app.get("/api/health", (req, res) => res.json({ ok: true }));
app.use("/api/student", requireAuth, requireRole("student"), studentRoutes);
app.use("/api/tpo", requireAuth, requireRole("tpo"), tpoRoutes);
app.use("/api", (req, res) => res.status(404).json({ error: "Not found" }));

// In production the built React app is served by this same server.
const dist = path.join(__dirname, "..", "..", "client", "dist");
if (fs.existsSync(dist)) {
  app.use(express.static(dist));
  app.use((req, res) => res.sendFile(path.join(dist, "index.html")));
}

// eslint-disable-next-line no-unused-vars
app.use((err, req, res, next) => {
  if (err.name === "MulterError") {
    return res.status(400).json({ error: err.code === "LIMIT_FILE_SIZE" ? "File is too large (max 5 MB)." : err.message });
  }
  if (err.status) return res.status(err.status).json({ error: err.message });
  console.error(err);
  res.status(500).json({ error: "Something went wrong on the server. Please try again." });
});

const port = Number(process.env.PORT) || 3001;
app.listen(port, () => console.log(`SkillBridge AI API running on http://localhost:${port}`));
