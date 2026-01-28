import express from "express";
import http from "http";
import { Server } from "socket.io";
import sqlite3 from "sqlite3";
import path from "path";
import { fileURLToPath } from "url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const PORT = process.env.PORT || 3000;
const ACCESS_CODE = process.env.ACCESS_CODE || "WATERWOUTEN26";
const PIN_TTL_MINUTES = Number(process.env.PIN_TTL_MINUTES || 90);

const BOUNDS = {
  minLat: 52.21466,
  minLng: 4.92528,
  maxLat: 52.25315,
  maxLng: 4.98058,
};

const app = express();
app.use(express.json());
app.use(express.static(path.join(__dirname, "public")));

const server = http.createServer(app);
const io = new Server(server);

const db = new sqlite3.Database("pins.db");

db.run(`
  CREATE TABLE IF NOT EXISTS pins (
    id TEXT PRIMARY KEY,
    lat REAL,
    lng REAL,
    created_at INTEGER
  )
`);

function inBounds(lat, lng) {
  return (
    lat >= BOUNDS.minLat &&
    lat <= BOUNDS.maxLat &&
    lng >= BOUNDS.minLng &&
    lng <= BOUNDS.maxLng
  );
}

app.get("/api/pins", (req, res) => {
  if (req.headers["x-access-code"] !== ACCESS_CODE) {
    return res.status(401).end();
  }
  const cutoff = Date.now() - PIN_TTL_MINUTES * 60000;
  db.all(
    "SELECT * FROM pins WHERE created_at > ?",
    [cutoff],
    (_, rows) => res.json({ pins: rows })
  );
});

app.post("/api/pins", (req, res) => {
  if (req.headers["x-access-code"] !== ACCESS_CODE) {
    return res.status(401).end();
  }
  const { lat, lng } = req.body;
  if (!inBounds(lat, lng)) return res.status(400).end();

  const pin = {
    id: Math.random().toString(36).substring(2),
    lat,
    lng,
    created_at: Date.now(),
  };

  db.run(
    "INSERT INTO pins VALUES (?, ?, ?, ?)",
    Object.values(pin),
    () => {
      io.emit("pin:new", pin);
      res.json({ pin });
    }
  );
});

io.on("connection", () => {});
server.listen(PORT);
