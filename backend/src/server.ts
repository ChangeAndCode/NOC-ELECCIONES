import express from "express";
import cors from "cors";
import dotenv from "dotenv";
import { getMonitorStatus } from "./monitor/monitor.controller.js";
import { getRecentIncidents, getServiceHistory } from "./monitor/monitor-db.js";

dotenv.config();

const app = express();
const port = process.env.PORT || 3000;

app.use(cors());
app.use(express.json());

app.get("/health", (_req, res) => {
  res.json({
    status: "ok",
    service: "NOC Presupuesto Participativo API",
  });
});

app.get("/api/monitor/status", async (_req, res) => {
  res.json(await getMonitorStatus());
});

app.get("/api/incidents", async (req, res) => {
  const openOnly = req.query.open === "true";
  const incidents = await getRecentIncidents(openOnly);
  res.json({ total: incidents.length, incidents });
});

app.get("/api/services/:serviceId/history", async (req, res) => {
  const history = await getServiceHistory(req.params.serviceId);
  res.json({ serviceId: req.params.serviceId, total: history.length, history });
});

app.listen(port, () => {
  console.log(`Backend ejecutándose en http://localhost:${port}`);
});
