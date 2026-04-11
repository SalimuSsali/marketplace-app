import { S3Client, PutObjectCommand } from "@aws-sdk/client-s3";

/**
 * Cloudflare R2 uses the S3 API. Configure in .env.local (see .env.example).
 * In the R2 dashboard: create a bucket, an API token with Object Read & Write,
 * and enable public access via an r2.dev subdomain or a custom domain.
 */

/** S3 API hostname — not valid for browser image URLs. */
export function isR2ApiEndpointUrl(url) {
  return /r2\.cloudflarestorage\.com/i.test(String(url ?? ""));
}

export function getR2Config() {
  const accountId = process.env.R2_ACCOUNT_ID?.trim();
  const accessKeyId = process.env.R2_ACCESS_KEY_ID?.trim();
  const secretAccessKey = process.env.R2_SECRET_ACCESS_KEY?.trim();
  const bucket = process.env.R2_BUCKET_NAME?.trim();
  const publicBaseUrl = process.env.R2_PUBLIC_BASE_URL?.trim().replace(/\/$/, "");
  if (!accountId || !accessKeyId || !secretAccessKey || !bucket || !publicBaseUrl) {
    return null;
  }
  if (isR2ApiEndpointUrl(publicBaseUrl)) {
    return null;
  }
  return { accountId, accessKeyId, secretAccessKey, bucket, publicBaseUrl };
}

/** @param {{ accountId: string, accessKeyId: string, secretAccessKey: string, bucket: string, publicBaseUrl: string }} config */
export function getR2Client(config) {
  return new S3Client({
    region: "auto",
    endpoint: `https://${config.accountId}.r2.cloudflarestorage.com`,
    credentials: {
      accessKeyId: config.accessKeyId,
      secretAccessKey: config.secretAccessKey,
    },
  });
}

/** @param {{ publicBaseUrl: string }} config */
export function publicUrlForKey(config, key) {
  const k = String(key).replace(/^\//, "");
  return `${config.publicBaseUrl}/${k}`;
}

/** @param {{ accountId: string, accessKeyId: string, secretAccessKey: string, bucket: string, publicBaseUrl: string }} config */
export async function uploadImageToR2(config, key, body, contentType) {
  const client = getR2Client(config);
  await client.send(
    new PutObjectCommand({
      Bucket: config.bucket,
      Key: key,
      Body: body,
      ContentType: contentType,
      CacheControl: "public, max-age=31536000, immutable",
    })
  );
  return publicUrlForKey(config, key);
}
