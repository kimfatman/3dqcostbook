import express, { type Express } from "express";

export const PUBLIC_REQUEST_BODY_LIMIT = "1mb";
export const MEDIA_REQUEST_BODY_LIMIT = "5mb";

/** 媒体上传使用专用途径与独立上限，普通 API 不应为其承担 50MB 的攻击面。 */
export function registerPublicRequestBodyParsers(app: Express) {
  app.use(express.json({ limit: PUBLIC_REQUEST_BODY_LIMIT }));
  app.use(express.urlencoded({ limit: PUBLIC_REQUEST_BODY_LIMIT, extended: true }));
}
