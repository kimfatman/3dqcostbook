import { GetObjectCommand, HeadBucketCommand, PutObjectCommand, S3Client } from "@aws-sdk/client-s3";
import { getSignedUrl } from "@aws-sdk/s3-request-presigner";

const DEFAULT_MEDIA_PREFIX = "costbook-media/v1";

function safeSegment(value: string) {
  const normalized = value.trim().replace(/[^a-zA-Z0-9_-]/g, "");
  if (!normalized) throw new Error("Invalid media key segment");
  return normalized;
}

export function buildCosMediaKey(input: { workspaceId: string; subjectId: string; kind: "user_avatar" | "workspace_logo" | "cost_card_image"; assetId: string; extension: "jpg" | "png" | "webp" }) {
  const prefix = (process.env.COS_MEDIA_PREFIX || DEFAULT_MEDIA_PREFIX).replace(/^\/+|\/+$/g, "");
  return `${prefix}/workspaces/${safeSegment(input.workspaceId)}/${input.kind}/${safeSegment(input.subjectId)}/${safeSegment(input.assetId)}.${input.extension}`;
}

function getCosConfig() {
  const region = process.env.COS_REGION;
  const bucket = process.env.COS_BUCKET;
  const accessKeyId = process.env.TENCENT_SECRET_ID;
  const secretAccessKey = process.env.TENCENT_SECRET_KEY;
  if (!region || !bucket || !accessKeyId || !secretAccessKey) throw new Error("COS media storage is not configured");
  return { region, bucket, accessKeyId, secretAccessKey };
}

export async function verifyCosMediaStorage() {
  const config = getCosConfig();
  const client = new S3Client({
    region: config.region,
    endpoint: `https://cos.${config.region}.myqcloud.com`,
    credentials: { accessKeyId: config.accessKeyId, secretAccessKey: config.secretAccessKey },
  });
  await client.send(new HeadBucketCommand({ Bucket: config.bucket }));
  return { bucket: config.bucket, region: config.region };
}

function createCosClient() {
  const config = getCosConfig();
  return { config, client: new S3Client({ region: config.region, endpoint: `https://cos.${config.region}.myqcloud.com`, credentials: { accessKeyId: config.accessKeyId, secretAccessKey: config.secretAccessKey } }) };
}

export async function putCosMedia(input: { storageKey: string; body: Buffer; mimeType: string }) {
  const { config, client } = createCosClient();
  await client.send(new PutObjectCommand({ Bucket: config.bucket, Key: input.storageKey, Body: input.body, ContentType: input.mimeType, ACL: "private" }));
}

export async function getCosMediaUrl(storageKey: string) {
  const { config, client } = createCosClient();
  return getSignedUrl(client, new GetObjectCommand({ Bucket: config.bucket, Key: storageKey }), { expiresIn: 300 });
}
