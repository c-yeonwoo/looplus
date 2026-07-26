import { NextResponse } from "next/server";
import { SCENE_META, type SceneType } from "@/lib/types";
import { buildScenePrompt } from "@/lib/vision/prompt";

/**
 * 비전보드 장면 이미지 생성 (Gemini).
 *
 * 키는 서버에만 둔다 — NEXT_PUBLIC_ 로 내보내면 번들에 박혀 누구나 쓸 수 있다.
 * 키가 없으면 501 을 주고, 클라이언트는 GET 으로 미리 물어보고 버튼을 숨긴다.
 */

/**
 * GET 은 요청에 의존하지 않아 Next 가 빌드 시점에 정적으로 굳힐 수 있다.
 * 그러면 키를 나중에 넣어도 enabled:false 가 박힌 채 배포된다.
 */
export const dynamic = "force-dynamic";

const ENDPOINT = "https://generativelanguage.googleapis.com/v1beta/models";
const DEFAULT_MODEL = "gemini-3-pro-image";
/** 한 사람이 창을 열어두고 계속 눌러도 키가 녹지 않게 */
const RATE_LIMIT = { max: 12, windowMs: 60 * 60 * 1000 };

const hits = new Map<string, number[]>();

function apiKey(): string | undefined {
  return process.env.GEMINI_API_KEY?.trim() || undefined;
}

function rateLimited(ip: string): boolean {
  const now = Date.now();
  const recent = (hits.get(ip) ?? []).filter((t) => now - t < RATE_LIMIT.windowMs);
  if (recent.length >= RATE_LIMIT.max) {
    hits.set(ip, recent);
    return true;
  }
  recent.push(now);
  hits.set(ip, recent);
  // 오래된 항목이 쌓이지 않게 가끔 청소
  if (hits.size > 500) {
    for (const [k, v] of hits) {
      if (v.every((t) => now - t >= RATE_LIMIT.windowMs)) hits.delete(k);
    }
  }
  return false;
}

function clientIp(req: Request): string {
  const fwd = req.headers.get("x-forwarded-for");
  return fwd?.split(",")[0]?.trim() || req.headers.get("x-real-ip") || "unknown";
}

export function GET() {
  return NextResponse.json({ enabled: Boolean(apiKey()) });
}

export async function POST(req: Request) {
  const key = apiKey();
  if (!key) {
    return NextResponse.json(
      { error: "이미지 생성이 꺼져 있어요. 관리자에게 문의해 주세요." },
      { status: 501 },
    );
  }
  if (rateLimited(clientIp(req))) {
    return NextResponse.json(
      { error: "잠시 뒤에 다시 시도해 주세요. (시간당 생성 한도)" },
      { status: 429 },
    );
  }

  let body: { type?: string; text?: string; why?: string };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "잘못된 요청이에요." }, { status: 400 });
  }

  const type = body.type as SceneType;
  if (!type || !(type in SCENE_META)) {
    return NextResponse.json({ error: "알 수 없는 장면이에요." }, { status: 400 });
  }
  const text = (body.text ?? "").slice(0, 500);
  if (!text.trim()) {
    return NextResponse.json(
      { error: "먼저 장면을 한 줄 적어 주세요." },
      { status: 400 },
    );
  }

  const model = process.env.GEMINI_IMAGE_MODEL?.trim() || DEFAULT_MODEL;
  let res: Response;
  try {
    res = await fetch(`${ENDPOINT}/${model}:generateContent`, {
      method: "POST",
      headers: { "Content-Type": "application/json", "x-goog-api-key": key },
      body: JSON.stringify({
        contents: [
          { parts: [{ text: buildScenePrompt(type, text, (body.why ?? "").slice(0, 300)) }] },
        ],
        generationConfig: {
          responseModalities: ["TEXT", "IMAGE"],
          imageConfig: { aspectRatio: "16:9" },
        },
      }),
      signal: AbortSignal.timeout(60_000),
    });
  } catch {
    return NextResponse.json(
      { error: "이미지 생성 서버에 연결하지 못했어요. 잠시 뒤 다시 시도해 주세요." },
      { status: 502 },
    );
  }

  if (!res.ok) {
    const detail = await res.text().catch(() => "");
    console.error("[vision-image] gemini 실패", res.status, detail.slice(0, 500));
    return NextResponse.json(
      { error: "이미지를 만들지 못했어요. 잠시 뒤 다시 시도해 주세요." },
      { status: 502 },
    );
  }

  const json = (await res.json()) as {
    candidates?: { content?: { parts?: { inlineData?: { mimeType?: string; data?: string } }[] } }[];
  };
  const inline = json.candidates?.[0]?.content?.parts?.find((p) => p.inlineData?.data)?.inlineData;
  if (!inline?.data) {
    // 안전 필터에 걸리면 이미지 없이 텍스트만 온다
    return NextResponse.json(
      { error: "이 문장으로는 이미지를 만들지 못했어요. 다르게 적어 보세요." },
      { status: 422 },
    );
  }

  return NextResponse.json({
    dataUrl: `data:${inline.mimeType ?? "image/png"};base64,${inline.data}`,
  });
}
