import { NextResponse } from "next/server";
import { getAmamiWeather } from "@/app/lib/amami-tide/weather";

export const revalidate = 3600;

export async function GET(): Promise<NextResponse> {
  const weather = await getAmamiWeather();
  if (!weather) {
    return NextResponse.json(
      { message: "天気情報を取得できませんでした。時間をおいて再度お試しください。" },
      { status: 503, headers: { "Cache-Control": "public, max-age=300" } },
    );
  }
  return NextResponse.json(weather, {
    headers: { "Cache-Control": "public, s-maxage=3600, stale-while-revalidate=21600" },
  });
}
