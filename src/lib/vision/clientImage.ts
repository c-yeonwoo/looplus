"use client";

import type { SceneType } from "../types";

/**
 * 생성된 장면 이미지를 프로필에 담기 전에 줄인다.
 *
 * 원본은 1MP PNG 라 data URL 이 1~2MB 다. 4장이면 localStorage 한도(5MB)를 넘고,
 * Supabase 의 visions.scenes jsonb 도 불필요하게 부푼다. 비전보드는 카드 크기로만
 * 보이므로 768px WebP 면 충분하다 (장당 50~100KB).
 */
const MAX_WIDTH = 768;
const QUALITY = 0.82;

export async function shrinkImage(dataUrl: string): Promise<string> {
  const img = await loadImage(dataUrl);
  const scale = Math.min(1, MAX_WIDTH / img.width);
  const w = Math.max(1, Math.round(img.width * scale));
  const h = Math.max(1, Math.round(img.height * scale));
  const canvas = document.createElement("canvas");
  canvas.width = w;
  canvas.height = h;
  const ctx = canvas.getContext("2d");
  if (!ctx) return dataUrl;
  ctx.drawImage(img, 0, 0, w, h);
  const webp = canvas.toDataURL("image/webp", QUALITY);
  // 아주 오래된 브라우저는 webp 를 못 만들고 png 를 돌려준다 — 그땐 jpeg 로
  return webp.startsWith("data:image/webp") ? webp : canvas.toDataURL("image/jpeg", QUALITY);
}

function loadImage(src: string): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.onload = () => resolve(img);
    img.onerror = () => reject(new Error("이미지를 읽지 못했어요."));
    img.src = src;
  });
}

export async function isVisionImageEnabled(): Promise<boolean> {
  try {
    const res = await fetch("/api/vision-image");
    if (!res.ok) return false;
    const json = (await res.json()) as { enabled?: boolean };
    return Boolean(json.enabled);
  } catch {
    return false;
  }
}

/** 실패 사유를 사용자에게 그대로 보여줄 수 있는 에러 */
export class VisionImageError extends Error {}

export async function generateSceneImage(
  type: SceneType,
  text: string,
  why?: string,
): Promise<string> {
  const res = await fetch("/api/vision-image", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ type, text, why }),
  });
  const json = (await res.json().catch(() => ({}))) as { dataUrl?: string; error?: string };
  if (!res.ok || !json.dataUrl) {
    throw new VisionImageError(json.error ?? "이미지를 만들지 못했어요.");
  }
  return shrinkImage(json.dataUrl);
}
