# 追加改修・収録拡張の状況

## 完了したローカル変更

- 先行39項目すべての透過イラストを用意し、一覧・詳細へ反映。新規34項目の画像を実写真参照で生成し、白背景の一覧で目視確認。
- ハブv2: 交差しない体、頭1つ・尾1本。ヒメハブv2: 胴体の融合を解消。オビトカゲモドキv3: 真上の構図で前脚2本と後脚2本を分離。v1/v2の不採用画像は選択していない。
- ルリカケスv2: 細い胴、長い首/尾、黒い目元。環境省資料でカラス科を確認し本文へ明記。
- `data/illustration-choices.json` で採用を明示。生成ファイルの存在だけで採用しない。`docs/illustration-review.json` に確認記録を残した。専門家による形態監修は未実施。
- ユーザー提供248名称を全件保存。クジラ2名称を含む。外来種/ハイとヒャン/鳥類の亜種/和名表記を確認待ちとして区別。38名称に既存解説あり、210名称は未編集。
- WebPは最大約110 KiB/点。写真の権利表示・画像タブ・純白背景・ロゴなしを維持。

## 検証

ローカルビルド: 42ページ（ホーム/紹介/出典+39詳細）、123公開ファイル。Node組込みテスト12件成功（リンク・画像実在、出典、写真ライセンス、Worker範囲とヘッダー、404/HEAD、秘密情報検査、採用画像の取り違え防止、候補リスト区分）。画像の解剖学的正しさを自動試験で証明するものではない。

ブラウザ: PC1440幅、スマホ390/320幅で修正画像の表示、横はみ出しなし、実写タブ切替を確認。ローカルのconsole error/warnは確認範囲で0件。iOS/Android実機、Safari、VoiceOverは未確認。

## 公開・GitHub

本番初版0.1.0は https://shima-craft.com/wildlife/ 。Cloudflare専用Worker `shima-craft-amami-wildlife` version `55128f9c-6a0a-4296-ac0b-26f4c7b80b25`。SHIMA CRAFTの既存トップ/制作Workerは変更していない。

初版は `shimacraft8/shima-craft.com` の `codex/amami-wildlife-20261101` へpush成功（940535af5b3ba5ff594ea3bc64ed7354f7e02f50）。今回の画像更新0.1.1はローカルのみ。

初版HTTP検査は91件中48件成功、43件は失敗として記録。HTMLは200/リリース一致でも本文ハッシュまたはCSP判定が一致せず、原因の追加切り分けが残る。ブラウザで初版は表示できたが、全HTTP検証成功とは扱わない。確認のための追加curl通信が自動承認レビューの利用上限で実行されず、再公開・追加pushは実行していない。安全性による拒否ではない。レビュー機構を迂回しない。

## 次に残る作業

1. 公開HTMLのハッシュ/CSP判定不一致を調査し、0.1.1の対象アカウント/zone/Workerを再確認して公開する。
2. 248候補の一次資料照合。種・亜種・別名、島別の在来/移入/迷鳥/過去記録を分離。
3. 魚類25候補と追加鳥類の記録を元ページで検証して解説化。未確認名を自動的に図鑑の実在種として昇格させない。
4. 残り候補の実写真リサーチ、透過イラスト制作、再利用可能な実写写真の追加。ザトウクジラ・マッコウクジラは台帳追加済みだが解説/画像未実装。
5. 全動物の網羅にはクモ・甲殻類・軟体動物・サンゴ等を含む追加目録が必要。現段階で「全種収録済み」と告知しない。

## 参照

- カラス科: https://kyushu.env.go.jp/okinawa/awcc/animal.html
- 哺乳類の追加照合: https://www.rinya.maff.go.jp/kyusyu/keikaku/hogorin/shinrin_seitaikei/amamigunntou.html
- 群島のクジラ/イルカ資料: https://www.vill.yamato.lg.jp/kikaku/kurashi/kankyo/shizentaiken/documents/14_wakyaamami.pdf （17MBでWeb閲覧ツールの容量制限。本文未確認）
- ザトウクジラの季節来遊: https://www.setouchi-welcome.com/nature
- 大浜海岸のマッコウクジラ骨格: https://ohama.marutani-amami.com/ocean-exhibition-hall （座礁記録と常時の生息を混同しない）
