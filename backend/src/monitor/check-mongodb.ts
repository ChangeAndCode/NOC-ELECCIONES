import { MongoClient } from "mongodb";
import type { ServiceStatus } from "./types.js";

export async function checkMongoDatabases(): Promise<ServiceStatus[]> {
  const uri = process.env.APP_MONGODB_URI?.trim();
  const databases = (process.env.APP_MONGODB_DATABASES ?? "")
    .split(",")
    .map((name) => name.trim())
    .filter(Boolean);

  if (!uri || databases.length === 0) return [];

  const client = new MongoClient(uri, {
    serverSelectionTimeoutMS: Number.parseInt(
      process.env.MONITOR_DEFAULT_TIMEOUT_MS ?? "10000",
      10,
    ),
  });

  try {
    await client.connect();

    return await Promise.all(
      databases.map(async (databaseName): Promise<ServiceStatus> => {
        const checkedAt = new Date().toISOString();
        const startedAt = performance.now();

        try {
          await client.db(databaseName).command({ ping: 1 });
          const responseTimeMs = Math.round(performance.now() - startedAt);

          return {
            id: `mongodb-${databaseName}`,
            name: `MongoDB - ${databaseName}`,
            url: databaseName,
            timeoutMs: 0,
            status: responseTimeMs > 3000 ? "DEGRADED" : "OPERATIONAL",
            responseTimeMs,
            httpStatus: null,
            checkedAt,
            error: null,
          };
        } catch (error) {
          return {
            id: `mongodb-${databaseName}`,
            name: `MongoDB - ${databaseName}`,
            url: databaseName,
            timeoutMs: 0,
            status: "DOWN",
            responseTimeMs: null,
            httpStatus: null,
            checkedAt,
            error: error instanceof Error ? error.message : "Error desconocido",
          };
        }
      }),
    );
  } catch (error) {
    const message = error instanceof Error ? error.message : "Error de conexión con MongoDB";
    return databases.map((databaseName) => ({
      id: `mongodb-${databaseName}`,
      name: `MongoDB - ${databaseName}`,
      url: databaseName,
      timeoutMs: 0,
      status: "DOWN" as const,
      responseTimeMs: null,
      httpStatus: null,
      checkedAt: new Date().toISOString(),
      error: message,
    }));
  } finally {
    await client.close().catch(() => undefined);
  }
}
