import { checkService } from "./check-service.js";
import { checkMongoDatabases } from "./check-mongodb.js";
import { checkAwsServices } from "./check-aws.js";
import { getConfiguredServices } from "./services.js";
import type { MonitorResponse } from "./types.js";

export async function getMonitorStatus(): Promise<MonitorResponse> {
  const [httpResults, mongoResults, awsResults] = await Promise.all([
    Promise.all(getConfiguredServices().map(checkService)),
    checkMongoDatabases(),
    checkAwsServices(),
  ]);
  const results = [...httpResults, ...mongoResults, ...awsResults];

  return {
    checkedAt: new Date().toISOString(),
    total: results.length,
    summary: {
      operational: results.filter(({ status }) => status === "OPERATIONAL").length,
      degraded: results.filter(({ status }) => status === "DEGRADED").length,
      down: results.filter(({ status }) => status === "DOWN").length,
      unknown: results.filter(({ status }) => status === "UNKNOWN").length,
    },
    services: results,
  };
}
