// SHIMA CRAFT本体リポジトリ用: ビルド前に環境変数からゲーム用config.jsを生成する。
// 配置先: 本体リポジトリの scripts/generate-amami-config.mjs
// package.jsonに追加: "prebuild": "node scripts/generate-amami-config.mjs"
// Vercelの環境変数 AMAMI_EMBED_API_KEY にHTTPリファラー制限済みのEmbed APIキーを設定する。
// 未設定ならデモ景観モードで公開される(サイトは壊れない)。
import { writeFile, mkdir } from 'node:fs/promises';
import path from 'node:path';

const key = (process.env.AMAMI_EMBED_API_KEY ?? '').trim();
const dir = path.resolve('public', 'amami-road-quest', 'play');
await mkdir(dir, { recursive: true });
await writeFile(
  path.join(dir, 'config.js'),
  `// generated at build time - do not commit\nwindow.__AMAMI_CONFIG__ = { embedApiKey: ${JSON.stringify(key)} };\n`
);
console.log(`amami config generated (embed key: ${key ? 'set' : 'empty -> demo mode'})`);
