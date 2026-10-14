# 実装後の差分レビュー

2026-10-14取得のWeb Interface Guidelinesを参照。React Native / Expo Webの差分が対象。完全なWCAG監査や実機アクセシビリティ検証ではありません。

## apps/mobile/src/app/index.tsx / observations.tsx / today-facts.tsx

- 修正：予報・次の潮が最初の画面から見つからない。情報を先に置き、詳しい観測出典は開閉式へ。
- 確認：予報/観測/予測/参考値の区別、ゼロと未取得、古さ/更新失敗の文言、出典・日付の復帰操作。
- 確認：320/375/390/430pxの標準文字で横はみ出しなし。

## apps/mobile/src/app/explore.tsx

- 修正：すべて/空結果の意味が一致しない。通常の旅行語彙で探せない。
- 確認：検索ラベル/クリア/件数通知、48以上の操作、地域とカテゴリの交差、検索キーでキーボードを閉じる実装。

## apps/mobile/src/app/more.tsx / state.tsx

- 修正：メモの未保存離脱。入力時保存と直列化、成功/失敗の通知。
- 確認：ラベル/長さ制限/自動補完抑止、OSの文字拡大を禁止しない。

## apps/mobile/src/ui.tsx / app/safety.tsx

- 修正：地域変更の画面往復、Expo Webでの電話確認無反応、見出しの意味付け。
- 確認：ダイアログのフォーカス/閉じる/Escape、発信の確認キャンセル、装飾SVGを読み上げ対象外、本文の固定細字化なし。

## 未確認

iOS実機のVoiceOver/文字拡大/キーボード/safe area、AndroidのTalkBack、実機コントラスト/屋外、背景復帰/保存失敗。ブラウザviewportだけで合格としない。
