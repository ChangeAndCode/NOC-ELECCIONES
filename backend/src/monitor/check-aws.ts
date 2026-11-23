import { GetCallerIdentityCommand, STSClient } from "@aws-sdk/client-sts";
import { HeadBucketCommand, S3Client } from "@aws-sdk/client-s3";
import type { ServiceStatus } from "./types.js";

const timeoutMs = Number.parseInt(process.env.MONITOR_DEFAULT_TIMEOUT_MS ?? "10000", 10);

function awsService(id: string, name: string, status: ServiceStatus["status"], responseTimeMs: number | null, error: string | null): ServiceStatus {
  return {
    id,
    name,
    url: name,
    timeoutMs,
    status,
    responseTimeMs,
    httpStatus: null,
    checkedAt: new Date().toISOString(),
    error,
  };
}

export async function checkAwsServices(): Promise<ServiceStatus[]> {
  const region = process.env.AWS_REGION?.trim();
  const accessKeyId = process.env.AWS_ACCESS_KEY_ID?.trim();
  const secretAccessKey = process.env.AWS_SECRET_ACCESS_KEY?.trim();
  const bucket = process.env.AWS_S3_BUCKET?.trim();

  if (!region || !accessKeyId || !secretAccessKey) return [];

  const credentials = { accessKeyId, secretAccessKey };
  const sts = new STSClient({ region, credentials });
  const results: ServiceStatus[] = [];

  const identityStartedAt = performance.now();
  try {
    await sts.send(new GetCallerIdentityCommand({}));
    const responseTimeMs = Math.round(performance.now() - identityStartedAt);
    results.push(awsService("aws-credentials", "AWS IAM / Cuenta", responseTimeMs > 3000 ? "DEGRADED" : "OPERATIONAL", responseTimeMs, null));
  } catch (error) {
    results.push(awsService("aws-credentials", "AWS IAM / Cuenta", "DOWN", null, error instanceof Error ? error.message : "Error de autenticación AWS"));
  } finally {
    sts.destroy();
  }

  if (!bucket) return results;

  const s3 = new S3Client({ region, credentials });
  const bucketStartedAt = performance.now();
  try {
    await s3.send(new HeadBucketCommand({ Bucket: bucket }));
    const responseTimeMs = Math.round(performance.now() - bucketStartedAt);
    results.push(awsService("aws-s3", "AWS S3 Bucket", responseTimeMs > 3000 ? "DEGRADED" : "OPERATIONAL", responseTimeMs, null));
  } catch (error) {
    results.push(awsService("aws-s3", "AWS S3 Bucket", "DOWN", null, error instanceof Error ? error.message : "Error de acceso al bucket S3"));
  } finally {
    s3.destroy();
  }

  return results;
}
