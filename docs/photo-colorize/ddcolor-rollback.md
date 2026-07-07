# DDColor 高品質モード ロールバック手順

デプロイ: main `d21e5c6`（2026-07-07）／ロールバック先: `f19e7f4`（DDColor導入前）

DDColorの導入は「カラー化パイプラインへの追加」であり、認証・会員制・他ページには一切触れていません。
不具合時は以下のいずれかで即座に戻せます。

## 方法A: Vercelダッシュボードで即時ロールバック（最速・推奨）
1. Vercel → プロジェクト `shima-craft-com` → Deployments
2. `f19e7f4` の1つ前の本番デプロイ（DDColor導入前）を開く
3. 「⋯」→ **Promote to Production**（または Instant Rollback）
   → 数十秒で本番が旧状態に戻る（コードはそのまま）

## 方法B: gitで打ち消しコミット
```bash
cd "/Users/hiroshikento/Documents/SHIMA CRAFT"
git checkout main && git pull
git revert --no-edit d21e5c6   # DDColorコミットのみを打ち消す
git push origin main            # Vercelが自動再デプロイ
```
revert すると `/tools/photo-colorize` は DDColor 導入前（siggraph17 のみ）に戻る。
モデルファイル（public/models/ddcolor_*）は残るが参照されなくなるだけで無害。

## 部分的な緊急対応（コードを戻さず標準モードのみにする）
`app/tools/photo-colorize/PhotoColorizeClient.tsx` の
`useState<ColorizeQuality>("high")` を `"standard"` に変えて push すると、
既定が標準(siggraph17)に戻り、DDColorはユーザーが明示選択したときのみ使われる。

## 影響範囲（戻す/戻さないの判断材料）
- 追加のみ: `lib/colorization/browser/`（モデルレジストリ・DDColor経路）、
  `public/models/ddcolor_*`（分割モデル）、UIの品質トグル。
- 不変: 認証・会員制・管理画面・API・SEO・他ページ・siggraph17(標準)経路。
- 既存の siggraph17 は「標準」モードとしてそのまま動作し続ける。
