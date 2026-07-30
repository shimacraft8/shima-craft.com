"use client";

export default function ErrorPage({ reset }: { reset: () => void }) {
  return <main style={{ minHeight: "70vh", display: "grid", placeItems: "center", padding: 24, textAlign: "center" }}><div><h1>潮と空の情報を表示できませんでした</h1><p>通信状況を確認して、もう一度お試しください。</p><button type="button" onClick={reset}>再読み込み</button></div></main>;
}
