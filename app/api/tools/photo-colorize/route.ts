import { NextResponse } from "next/server";

export const runtime = "nodejs";

/**
 * 旧・サーバー側カラー化API（Replicate中継）は廃止済み。
 * カラー化は /tools/photo-colorize のページ内（ブラウザ内推論）で完結し、
 * 画像がサーバーへ送信されることはなくなった。
 * 古いクライアントやブックマークからの呼び出しには 410 Gone を返す。
 */
export async function POST(): Promise<NextResponse> {
  return NextResponse.json(
    {
      success: false,
      errorCode: "ENDPOINT_RETIRED",
      userMessage:
        "この機能は新しい方式へ移行しました。ページを再読み込みしてから、もう一度お試しください。",
      retryable: false,
    },
    { status: 410 }
  );
}
