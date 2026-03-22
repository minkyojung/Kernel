import "dotenv/config";
import https from "https";
import fs from "fs";
import path from "path";
import express from "express";
import instagramAuth from "./auth/instagram";
import { getDb } from "./db/schema";

const app = express();
const PORT = Number(process.env.PORT) || 3000;

// Initialize DB on startup
getDb();

// Routes
app.use(instagramAuth);

// Health check
app.get("/", (_req, res) => {
  res.json({ status: "ok", message: "Istanbul — Creator Analytics Connector" });
});

// Load self-signed certs for local HTTPS
const certsDir = path.join(__dirname, "../certs");
const keyPath = path.join(certsDir, "localhost-key.pem");
const certPath = path.join(certsDir, "localhost.pem");

if (!fs.existsSync(keyPath) || !fs.existsSync(certPath)) {
  console.error(
    "Missing TLS certs. Run:\n" +
    "  mkcert -install && mkdir -p certs && mkcert -key-file certs/localhost-key.pem -cert-file certs/localhost.pem localhost",
  );
  process.exit(1);
}

const server = https.createServer(
  {
    key: fs.readFileSync(keyPath),
    cert: fs.readFileSync(certPath),
  },
  app,
);

server.listen(PORT, () => {
  console.log(`\nServer running at https://localhost:${PORT}`);
  console.log(`\nConnect Instagram: https://localhost:${PORT}/auth/instagram\n`);
});
