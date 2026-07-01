import type {
  ColorizationProvider,
  ColorizeProviderInput,
  ColorizeProviderResult,
} from "@/lib/colorization/types";

/**
 * DDColor (piddnad/ddcolor) の Replicate 上のモデル情報。
 * predict() の入出力は公式リポジトリ (demo/cog_predict.py) を確認して固定した:
 *   input:  { image: Path, model_size: "large" | "tiny" = "large" }
 *   output: Path（単一の画像URL）
 * バージョンは REPLICATE_DDCOLOR_VERSION で上書き可能。
 * 参照: https://github.com/piddnad/DDColor/blob/master/demo/cog_predict.py
 *       https://replicate.com/piddnad/ddcolor/versions
 */
export const DDCOLOR_MODEL = "piddnad/ddcolor";
export const DDCOLOR_DEFAULT_VERSION =
  "ca494ba129e44e45f661d6ece83c4c98a9a7c774309beca01429b58fce8aa695";

const PREDICTIONS_URL = "https://api.replicate.com/v1/predictions";
const POLL_INTERVAL_MS = 1000;
/** Replicate はAPI経由の入出力を既定で1時間後に自動削除する。結果URLを永久リンクとして扱わないこと。 */

type ReplicatePrediction = {
  id: string;
  status: "starting" | "processing" | "succeeded" | "failed" | "canceled";
  output?: string | string[] | null;
  urls?: { get?: string };
  error?: unknown;
};

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

function extractResultUrl(output: ReplicatePrediction["output"]): string | null {
  if (typeof output === "string" && output) return output;
  if (Array.isArray(output) && typeof output[0] === "string" && output[0]) return output[0];
  return null;
}

export class ReplicateColorizationProvider implements ColorizationProvider {
  constructor(
    private readonly fetchImpl: typeof fetch = fetch,
    private readonly pollBudgetMs = 50_000
  ) {}

  async colorize(
    input: ColorizeProviderInput,
    options: { signal: AbortSignal }
  ): Promise<ColorizeProviderResult> {
    const token = process.env.REPLICATE_API_TOKEN;
    if (!token) {
      return { ok: false, code: "SERVICE_DISABLED" };
    }
    const version = process.env.REPLICATE_DDCOLOR_VERSION || DDCOLOR_DEFAULT_VERSION;
    const dataUri = `data:${input.mimeType};base64,${input.imageBuffer.toString("base64")}`;

    let prediction: ReplicatePrediction;
    try {
      const createRes = await this.fetchImpl(PREDICTIONS_URL, {
        method: "POST",
        headers: {
          Authorization: `Bearer ${token}`,
          "Content-Type": "application/json",
          Prefer: "wait=30",
        },
        body: JSON.stringify({
          version,
          input: { image: dataUri, model_size: "large" },
        }),
        signal: options.signal,
      });

      if (createRes.status === 401 || createRes.status === 403) {
        return { ok: false, code: "SERVICE_DISABLED" };
      }
      if (!createRes.ok) {
        return { ok: false, code: "MODEL_FAILED" };
      }
      prediction = (await createRes.json()) as ReplicatePrediction;
    } catch (err) {
      if (isAbortError(err)) return { ok: false, code: "MODEL_TIMEOUT" };
      return { ok: false, code: "MODEL_FAILED" };
    }

    const deadline = Date.now() + this.pollBudgetMs;
    try {
      while (prediction.status !== "succeeded" && prediction.status !== "failed" && prediction.status !== "canceled") {
        if (Date.now() > deadline) {
          return { ok: false, code: "MODEL_TIMEOUT" };
        }
        await sleep(POLL_INTERVAL_MS);
        const pollUrl = prediction.urls?.get;
        if (!pollUrl) return { ok: false, code: "MODEL_FAILED" };
        const pollRes = await this.fetchImpl(pollUrl, {
          headers: { Authorization: `Bearer ${token}` },
          signal: options.signal,
        });
        if (!pollRes.ok) return { ok: false, code: "MODEL_FAILED" };
        prediction = (await pollRes.json()) as ReplicatePrediction;
      }
    } catch (err) {
      if (isAbortError(err)) return { ok: false, code: "MODEL_TIMEOUT" };
      return { ok: false, code: "MODEL_FAILED" };
    }

    if (prediction.status !== "succeeded") {
      return { ok: false, code: "MODEL_FAILED" };
    }

    const resultUrl = extractResultUrl(prediction.output);
    if (!resultUrl) return { ok: false, code: "MODEL_FAILED" };

    return { ok: true, resultUrl, model: DDCOLOR_MODEL, version };
  }
}

function isAbortError(err: unknown): boolean {
  return err instanceof Error && err.name === "AbortError";
}
