import { MongoClient, type Db } from "mongodb";
import type { MonitorResponse } from "./types.js";

let client: MongoClient | null = null;
let database: Db | null = null;

export async function getMonitorDatabase(): Promise<Db | null> {
  const uri = process.env.MONITOR_DB_URI?.trim();
  const databaseName = process.env.MONITOR_DB_NAME?.trim();
  if (!uri || !databaseName) return null;

  if (!database) {
    client = new MongoClient(uri, {
      serverSelectionTimeoutMS: 10000,
    });
    await client.connect();
    database = client.db(databaseName);
  }

  return database;
}

export async function persistMonitoringResult(result: MonitorResponse) {
  const db = await getMonitorDatabase();
  if (!db) return false;

  const checks = db.collection("health_checks");
  const incidents = db.collection("incidents");
  const services = db.collection("monitored_services");
  const checkedAt = new Date(result.checkedAt);

  for (const service of result.services) {
    await services.updateOne(
      { serviceId: service.id },
      {
        $set: {
          serviceId: service.id,
          name: service.name,
          updatedAt: checkedAt,
        },
        $setOnInsert: { createdAt: checkedAt },
      },
      { upsert: true },
    );

    await checks.insertOne({
      serviceId: service.id,
      name: service.name,
      status: service.status,
      responseTimeMs: service.responseTimeMs,
      httpStatus: service.httpStatus,
      error: service.error,
      checkedAt,
    });

    const openIncident = await incidents.findOne({
      serviceId: service.id,
      recoveredAt: null,
    });

    if (service.status !== "OPERATIONAL" && !openIncident) {
      await incidents.insertOne({
        serviceId: service.id,
        name: service.name,
        status: service.status,
        startedAt: checkedAt,
        recoveredAt: null,
        durationSeconds: null,
        lastError: service.error,
        lastCheckedAt: checkedAt,
      });
    } else if (service.status !== "OPERATIONAL" && openIncident) {
      await incidents.updateOne(
        { _id: openIncident._id },
        {
          $set: {
            status: service.status,
            lastError: service.error,
            lastCheckedAt: checkedAt,
          },
        },
      );
    } else if (service.status === "OPERATIONAL" && openIncident) {
      const durationSeconds = Math.max(
        0,
        Math.round((checkedAt.getTime() - openIncident.startedAt.getTime()) / 1000),
      );
      await incidents.updateOne(
        { _id: openIncident._id },
        {
          $set: {
            status: "RECOVERED",
            recoveredAt: checkedAt,
            durationSeconds,
            lastCheckedAt: checkedAt,
          },
        },
      );
    }
  }

  return true;
}

export async function getRecentIncidents(openOnly = false, limit = 50) {
  const db = await getMonitorDatabase();
  if (!db) return [];
  const filter = openOnly ? { recoveredAt: null } : {};
  return db.collection("incidents").find(filter).sort({ startedAt: -1 }).limit(limit).toArray();
}

export async function getServiceHistory(serviceId: string, limit = 100) {
  const db = await getMonitorDatabase();
  if (!db) return [];
  return db.collection("health_checks").find({ serviceId }).sort({ checkedAt: -1 }).limit(limit).toArray();
}
