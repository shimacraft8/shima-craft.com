import { readFile, writeFile, mkdir, copyFile } from "node:fs/promises";
import { resolve } from "node:path";
import { build } from "esbuild";
import { parseTideText } from "../packages/core/src/index.ts";
const root=resolve(import.meta.dirname,"..");
const out=resolve(root,"dist/public/amami-life");
await mkdir(resolve(out,"assets"),{recursive:true});
await mkdir(resolve(root,"worker"),{recursive:true});
await writeFile(resolve(root,"worker/tides.json"),JSON.stringify(parseTideText(await readFile(resolve(root,"server/data/O9-2026.txt"),"utf8"))));
await build({entryPoints:[resolve(root,"packages/core/src/index.ts")],bundle:true,format:"esm",platform:"browser",outfile:resolve(out,"core.js")});
await build({entryPoints:[resolve(root,"packages/core/src/usage.ts")],bundle:true,format:"esm",platform:"browser",outfile:resolve(out,"usage.js")});
for(const name of ["app.js","sky-map.js","leaflet.css","style.css","theme-tokens.css","shimacraft.css","apple-refinement.css","shimacraft.js"]) {
  let text=await readFile(resolve(root,"web",name),"utf8");
  if(name.endsWith(".css")) text=text.replaceAll('url("/assets/','url("/amami-life/assets/');
  await writeFile(resolve(out,name),text);
}
let html=await readFile(resolve(root,"web/shimacraft.html"),"utf8");
html=html.replace('<html lang="ja" data-theme-mode="ink-only">','<html lang="ja" data-theme-mode="ink-only" data-release="public">')
 .replace('<meta name="robots" content="noindex,nofollow" />','<meta name="robots" content="index,follow" /><link rel="canonical" href="https://shima-craft.com/" />')
 .replace('SHIMA CRAFT × AMAMI LIFE — トップページ案','AMAMI LIFE｜奄美の今日・天気・潮汐・交通｜SHIMA CRAFT')
 .replace('SHIMA CRAFTのトップ組み込み案。AMAMI LIFEで奄美の今日を知る、旅と暮らしの道具。ローカル確認専用。','奄美大島の今日を、ここから。気象庁の天気・観測気温、潮汐予測、交通・防災の公式情報。旅行者と島民のためのAMAMI LIFE。制作：SHIMA CRAFT。')
 .replaceAll('トップ組み込み案 ·','気象庁の情報を加工表示 ·')
 .replaceAll('https://shima-craft.com/#','/studio#')
 .replaceAll('（公開中のサイト・別タブ）','（制作サービス・別タブ）')
 .replaceAll('ローカル確認用。サービスのリンクは公開中のSHIMA CRAFTへ移動します。','制作サービス・写真・映像のご相談はSHIMA CRAFTへ。')
 .replace(/(href|src)="\/(leaflet\.css|theme-tokens\.css|style\.css|shimacraft\.css|apple-refinement\.css|app\.js|shimacraft\.js)"/g,'$1="/amami-life/$2"');
html=html.replaceAll('src="/assets/', 'src="/amami-life/assets/');
html=html.replace('<main id="content" tabindex="-1"></main>','<main id="content" tabindex="-1"><noscript><h1>奄美の今日・AMAMI LIFE</h1><p>表示にはJavaScriptが必要です。</p><a href="https://www.jma.go.jp/bosai/">気象庁の公式情報</a><p><a href="/studio">SHIMA CRAFTの制作サービス</a></p></noscript></main>');
await writeFile(resolve(out,"index.html"),html);
await copyFile(resolve(root,"web/assets/paper.svg"),resolve(out,"assets/paper.svg"));
for (const name of ["shimacraft-logo.png", "shimacraft-logo-white.png", "shimacraft-logo-white-red.svg"]) await copyFile(resolve(root,"web/assets",name),resolve(out,"assets",name));
await copyFile(resolve(root,"web/public-privacy.html"),resolve(out,"privacy.html"));
console.log("Public assets built; local QA/demo files and credentials excluded.");

await copyFile(resolve(root,"web/assets/suncalc-LICENSE.txt"),resolve(out,"assets/suncalc-LICENSE.txt"));

await copyFile(resolve(root,"web/assets/leaflet-LICENSE.txt"),resolve(out,"assets/leaflet-LICENSE.txt"));
await mkdir(resolve(out,"assets/leaflet"),{recursive:true});
for(const name of ["layers.png","layers-2x.png","marker-icon.png","marker-icon-2x.png","marker-shadow.png"]) await copyFile(resolve(root,"web/assets/leaflet",name),resolve(out,"assets/leaflet",name));
