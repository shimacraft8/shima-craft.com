/**
 * Groq Vision 色ヒント API。
 *
 * 会員向け機能として、白黒写真のサムネイルを受け取り Groq (Llama 4 Scout) で解析し、
 * 各セマンティック領域（人物の肌・軍服・背景の樹木 等）の期待される色を
 * CIE Lab ab 値として返す。
 *
 * この値を ONNX モデルの推定結果にブレンドすることで、歴史的・文脈的に正確な
 * 色が反映された仕上がりを実現する。
 *
 * 画像はこのルートからのみ Groq API へ送信される。
 * 画像はサーバーに保存しない。Groq の利用規約に従い処理される。
 *
 * 匿名ユーザーはアクセス不可（COLORIZE_ENABLED=false 時も 503 を返す）。
 */

import { NextRequest, NextResponse } from "next/server";
import Groq from "groq-sdk";
import { isSameOrigin } from "@/lib/http/origin";
import { getViewer } from "@/lib/auth/access";
import type { ColorHintPayload } from "@/lib/colorization/colorHints";

export const runtime = "nodejs";
export const maxDuration = 30;

const ALLOWED_MIME_TYPES = ["image/jpeg", "image/png", "image/webp"] as const;
type AllowedMimeType = (typeof ALLOWED_MIME_TYPES)[number];

const HINT_PROMPT = `You are analyzing a black and white photograph to provide colorization guidance.

Examine the image carefully. Identify the subject matter, time period, cultural context, and all major semantic regions visible.

Return ONLY a valid JSON object — no explanation, no markdown, no code fence. Use this exact structure:
{
  "scene": "one concise sentence describing the scene, period, and context",
  "regions": [
    {
      "label": "region name",
      "luminanceMin": <number 0-100>,
      "luminanceMax": <number 0-100>,
      "aTarget": <CIE a* value, integer -50 to 50>,
      "bTarget": <CIE b* value, integer -50 to 50>,
      "weight": <blend strength 0.15 to 0.45>
    }
  ]
}

CIE Lab color reference — use as starting points, adjust for context:
| Color | a* | b* |
|---|---|---|
| East Asian skin, outdoor sunlight | 10 | 22 |
| Caucasian skin, outdoor sunlight | 14 | 18 |
| Caucasian skin, indoor warm light | 15 | 22 |
| Dark leather (helmets, boots) | 8 | 18 |
| Military olive drab (WWII-era) | -3 | 14 |
| Japanese WWII khaki uniform | 2 | 16 |
| Forest green / foliage | -18 | 16 |
| Clear sky (daytime) | -4 | -28 |
| Overcast sky | -2 | -5 |
| Sandy / khaki terrain | 3 | 22 |
| White / off-white fabric | 1 | 6 |
| Neutral gray | 0 | 0 |
| Dark shadow | 0 | 0 |
| Red (brick, blood) | 35 | 15 |
| Blue water | -8 | -20 |
| Brown earth / dirt | 5 | 20 |

Luminance zones in CIE L* (0=black, 100=white):
- 0–15: deep shadow / black (use weight 0.1, a=0, b=0 for pure blacks)
- 15–38: dark midtone (hair, dark clothing, deep shadows)
- 38–58: midtone (uniforms, jackets, medium-toned subjects)
- 58–76: bright midtone (faces, skin, medium backgrounds)
- 76–90: light (sky, bright backgrounds, light fabric)
- 90–100: highlight / near-white (white fabric, specular highlights)

Rules:
- Provide exactly 4–7 regions covering all major areas
- Avoid overlapping luminance ranges; arrange them to cover 0–100 completely
- Use weight 0.15–0.25 for uncertain regions, 0.30–0.45 for clearly identifiable subjects
- For deep shadows (L 0–15), always use a=0, b=0, weight=0.15
- For pure whites/highlights (L 90–100), always use a=1, b=5, weight=0.20
- Be historically accurate: research the specific period, military branch, nationality`;

function isValidPayload(data: unknown): data is ColorHintPayload {
  if (!data || typeof data !== "object") return false;
  const d = data as Record<string, unknown>;
  if (typeof d.scene !== "string") return false;
  if (!Array.isArray(d.regions) || d.regions.length < 2 || d.regions.length > 10) return false;
  return d.regions.every((r: unknown) => {
    if (!r || typeof r !== "object") return false;
    const region = r as Record<string, unknown>;
    return (
      typeof region.label === "string" &&
      typeof region.luminanceMin === "number" &&
      typeof region.luminanceMax === "number" &&
      typeof region.aTarget === "number" &&
      typeof region.bTarget === "number" &&
      typeof region.weight === "number" &&
      region.luminanceMin >= 0 &&
      region.luminanceMax <= 100 &&
      region.luminanceMax > region.luminanceMin &&
      region.aTarget >= -60 &&
      region.aTarget <= 60 &&
      region.bTarget >= -60 &&
      region.bTarget <= 60 &&
      region.weight >= 0 &&
      region.weight <= 0.6
    );
  });
}

export async function POST(request: NextRequest): Promise<NextResponse> {
  if (!isSameOrigin(request)) {
    return NextResponse.json({ ok: false, reason: "BAD_ORIGIN" }, { status: 403 });
  }

  if (process.env.COLORIZE_ENABLED === "false") {
    return NextResponse.json({ ok: false, reason: "SERVICE_UNAVAILABLE" }, { status: 503 });
  }

  if (!process.env.GROQ_API_KEY) {
    return NextResponse.json({ ok: false, reason: "NOT_CONFIGURED" }, { status: 503 });
  }

  const viewer = await getViewer();
  if (viewer.kind === "anonymous") {
    return NextResponse.json({ ok: false, reason: "MEMBERS_ONLY" }, { status: 403 });
  }
  if (!viewer.canColorize) {
    return NextResponse.json({ ok: false, reason: "FORBIDDEN" }, { status: 403 });
  }

  let body: { image?: unknown; mimeType?: unknown };
  try {
    const raw = await request.text();
    if (raw.length > 300_000) {
      return NextResponse.json({ ok: false, reason: "IMAGE_TOO_LARGE" }, { status: 413 });
    }
    body = JSON.parse(raw) as { image?: unknown; mimeType?: unknown };
  } catch {
    return NextResponse.json({ ok: false, reason: "INVALID_JSON" }, { status: 400 });
  }

  const imageData = typeof body.image === "string" ? body.image : null;
  const mimeType = ALLOWED_MIME_TYPES.includes(body.mimeType as AllowedMimeType)
    ? (body.mimeType as AllowedMimeType)
    : null;

  if (!imageData || !mimeType) {
    return NextResponse.json({ ok: false, reason: "MISSING_IMAGE" }, { status: 400 });
  }

  try {
    const groq = new Groq({ apiKey: process.env.GROQ_API_KEY });

    const response = await groq.chat.completions.create({
      model: "meta-llama/llama-4-scout-17b-16e-instruct",
      max_tokens: 1024,
      messages: [
        {
          role: "user",
          content: [
            {
              type: "image_url",
              image_url: { url: `data:${mimeType};base64,${imageData}` },
            },
            {
              type: "text",
              text: HINT_PROMPT,
            },
          ],
        },
      ],
    });

    const text = response.choices[0]?.message?.content?.trim() ?? "";

    const jsonMatch = text.match(/\{[\s\S]*\}/);
    if (!jsonMatch) {
      console.warn("[colorize-hint] no JSON in Groq response:", text.slice(0, 200));
      return NextResponse.json({ ok: false, reason: "PARSE_FAILED" }, { status: 500 });
    }

    let hints: unknown;
    try {
      hints = JSON.parse(jsonMatch[0]);
    } catch {
      console.warn("[colorize-hint] JSON parse failed:", jsonMatch[0].slice(0, 200));
      return NextResponse.json({ ok: false, reason: "PARSE_FAILED" }, { status: 500 });
    }

    if (!isValidPayload(hints)) {
      console.warn("[colorize-hint] payload validation failed:", JSON.stringify(hints).slice(0, 300));
      return NextResponse.json({ ok: false, reason: "INVALID_PAYLOAD" }, { status: 500 });
    }

    return NextResponse.json({ ok: true, hints });
  } catch (err) {
    console.error("[colorize-hint] Groq API error:", String(err));
    return NextResponse.json({ ok: false, reason: "API_ERROR" }, { status: 500 });
  }
}
