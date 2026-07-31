# firebase-admin 依存の全件棚卸しと REST置換設計

2026-07-30。実装前レビュー用。**まだ何も実装していない。**

## 対象ファイル（10ファイル、直接importしている全て）

`lib/firebase/admin.ts`（基盤） / `lib/auth/session.ts` / `app/api/auth/session/route.ts` /
`app/login/actions.ts` / `lib/members/repo.ts` / `lib/members/login.ts` /
`lib/members/invitations.ts` / `lib/members/executions.ts` / `lib/members/admin-ops.ts` /
`lib/members/admin-queries.ts`

---

## 1. 機能別インベントリ（10項目）

### A. `lib/firebase/admin.ts` — Admin SDK初期化

1. **用途**: `firebase-admin/app`・`/auth`・`/firestore`の初期化とキャッシュ。他9ファイル全ての基盤。
2. **呼び出し元**: 他9ファイル全て（`adminAuth()`/`adminDb()`経由）。
3. **認証要否**: サービスアカウント資格情報（`FIREBASE_CLIENT_EMAIL`/`FIREBASE_PRIVATE_KEY`）必須。
4. **権限**: 管理者権限（サービスアカウント＝Firebase Admin相当、Security Rulesを全てバイパス）。
5. **Auth REST置換可否**: 該当なし（この層自体が置換対象＝下記「基盤設計」で新設）。
6. **Firestore REST置換可否**: 同上。
7. **クライアントSDK移動可否**: 不可（サービスアカウント権限はクライアントに出せない）。
8. **セキュリティ注意**: **ここが全ての土台**。JWT検証・REST認証を誤ると認可全体が崩れる。最優先で最も慎重な実装が必要。
9. **必要テスト**: JWT署名検証（正常/改ざん/期限切れ/kid不一致）、OAuth2トークン交換の異常系（レート制限・失効鍵）。
10. **想定改修量**: **大**。新規モジュール2本（JWT検証・サービスアカウントOAuth2）が全ての土台になる。

### B. `lib/auth/session.ts` — セッションCookie発行・検証

1. **用途**: ログインCookieの作成・検証・削除。ID Token検証／Session Cookie発行・検証。
2. **呼び出し元**: `app/api/auth/session/route.ts`, `app/login/actions.ts`, `lib/auth/access.ts`（`getViewer`経由で実質全ページ）。
3. **認証要否**: `verifyIdTokenStrict`はクライアントのID Tokenが入力。`createSessionCookieFromIdToken`はAdmin権限必須。
4. **権限**: 一般ユーザー（検証系）＋管理者権限（Session Cookie発行はAdmin専用API）。
5. **Auth REST置換可否**: **可**。ID Token検証はJWKS+Web Cryptoで完全代替可（後述「基盤設計」）。
6. **Firestore REST置換可否**: 該当なし。
7. **クライアントSDK移動可否**: 不可（HttpOnly Cookieはサーバー側でのみ発行・検証すべき＝XSS対策上も必須）。
8. **セキュリティ注意**: **重要な設計変更点**。現行の`createSessionCookie`はFirebase Admin SDK固有の非公開プロトコル（IDトークンとは別形式・署名者が異なる`session.firebase.google.com`発行のJWT）で、Cloudflare側では作れない。**後述の「セッション方式の変更」を参照**（挙動は維持、内部実装のみ変更）。
9. **必要テスト**: auth_time鮮度チェック、Cookie改ざん検知、有効期限境界値。
10. **想定改修量**: 中〜大（関数シグネチャは維持できるが内部実装は全面書き換え）。

### C. `app/api/auth/session/route.ts` / `app/login/actions.ts` — ログイン/ログアウトAPI

1. **用途**: POST=ログイン（ID Token検証→会員判定→Cookie発行）、DELETE/Server Action=ログアウト（Cookie削除＋**全リフレッシュトークン失効**）。
2. **呼び出し元**: ログインUI（`app/login/`配下）、ログアウトボタン。
3. **認証要否**: ログインはID Token必須。ログアウトは現在のSession Cookie必須。
4. **権限**: 一般ユーザー。
5. **Auth REST置換可否**: **可**。ID Token検証は上記B、`revokeRefreshTokens`はIdentity Toolkit Admin REST（`accounts:update` + `validSince`）で代替可。
6. **Firestore REST置換可否**: 該当なし（`resolveLogin`経由でmembers/systemConfigに触れるが、それは項目Eの範囲）。
7. **クライアントSDK移動可否**: 不可（Cookie操作・トークン失効は必ずサーバー側）。
8. **セキュリティ注意**: `revokeRefreshTokens`は「全端末からログアウト」を保証する重要機能。REST実装でも必ず維持する。
9. **必要テスト**: 不正Origin拒否、無効ID Token拒否、ログアウト後にセッションが本当に無効化されること。
10. **想定改修量**: 小（呼び出し先の実装が変わるだけで、このファイル自体のロジックはほぼ不変）。

### D. `lib/members/repo.ts` — Firestore基本CRUD＋マッパー

1. **用途**: `members`/`invitations`/`executions`/`logs`/`audit`のデータ変換、`getMember`/`findMemberByEmail`/`touchLastLogin`。
2. **呼び出し元**: `login.ts`, `access.ts`, `admin-ops.ts`, `admin-queries.ts`ほぼ全域。
3. **認証要否**: Admin権限（Rulesをバイパスして直接読み書き）。
4. **権限**: 管理者権限相当（deny-all Rulesの下で機能する前提）。
5. **Firestore REST置換可否**: **可**。単純なdocument get・`where`1条件・`set(merge)`はFirestore REST APIの`documents.get`/`documents.patch`で素直に代替可。
6. （5と同じ観点のため統合）
7. **クライアントSDK移動可否**: 不可（Rules下では読めない設計のため）。
8. **セキュリティ注意**: `Timestamp`/`FieldValue`の型変換をREST版（ISO文字列⇔Firestore `timestampValue`、`serverTimestamp`は書き込み時の`fieldTransforms`）で正確に再現する必要。
9. **必要テスト**: 既存の型変換テストをREST版データ構造に対応させて再利用。
10. **想定改修量**: 中（マッパー関数自体は流用可、データ取得元のみ差し替え）。

### E. `lib/members/login.ts` — ログイン可否判定・初期admin作成

1. **用途**: 会員判定、招待claim、**初期管理者の冪等ブートストラップ（Firestore transaction）**、`setCustomUserClaims`。
2. **呼び出し元**: `app/api/auth/session/route.ts`のPOST。
3. **認証要否**: Admin権限。
4. **権限**: 管理者権限（admin作成という強い操作）。
5. **Auth REST置換可否**: `setCustomUserClaims`は`accounts:update`の`customAttributes`で可。
6. **Firestore REST置換可否**: **可だが要注意**。`db.runTransaction`はFirestore RESTの`BeginTransaction`→`documents.get`（transaction指定）→`Commit`で代替可能。二重実行防止のロック挙動を正確に再現する必要。
7. **クライアントSDK移動可否**: 不可。
8. **セキュリティ注意**: **最重要**。初期管理者作成は誤ると権限昇格の穴になる。transaction的排他制御を弱めてはいけない。
9. **必要テスト**: 同時リクエストでも管理者が複数作られないこと（競合テスト）、`INITIAL_ADMIN_EMAIL`不一致時の拒否。
10. **想定改修量**: 大（transactionロジックの再現が肝）。

### F. `lib/members/invitations.ts` — 招待発行/claim/失効

1. **用途**: 招待CRUD、`claimInvitation`（**Firestore transaction**：member作成＋invitation更新＋adminCount更新を原子的に実行）。
2. **呼び出し元**: `app/admin/actions.ts`, `lib/members/login.ts`。
3. **認証要否**: Admin権限（作成・失効は管理者操作、claimはログインフロー内部）。
4. **権限**: 管理者権限（create/resend/revoke）＋一般ユーザー起点（claim、ただしサーバー内部処理）。
5. **Auth REST置換可否**: 該当なし。
6. **Firestore REST置換可否**: **可だが要注意**（Eと同じtransaction代替パターン）。
7. **クライアントSDK移動可否**: 不可。
8. **セキュリティ注意**: メール一致確認・二重claim防止のロジックを完全に維持する必要。
9. **必要テスト**: 期限切れ・失効済み・二重claim・メール不一致の全分岐。
10. **想定改修量**: 大（`claimInvitation`のtransactionが最も複雑な部類）。

### G. `lib/members/executions.ts` — カラー化実行履歴

1. **用途**: 実行レコード作成・イベント記録（**batched write**：複数ドキュメントを原子的に書き込み）。
2. **呼び出し元**: `app/api/colorize/executions/route.ts`, `app/api/colorize/events/route.ts`。
3. **認証要否**: Admin権限（IDOR防止のためuserId一致をサーバー側で検証）。
4. **権限**: 一般ユーザー（ただし書き込み自体はAdmin権限で実行）。
5. **Auth REST置換可否**: 該当なし。
6. **Firestore REST置換可否**: **可**。`db.batch()`はFirestore RESTの`documents:commit`に複数`writes`を積めば単純に代替可（transactionより簡単、読み取りを伴わないため）。
7. **クライアントSDK移動可否**: 不可（userId偽装防止のため必ずセッションのuidをサーバーで使う）。
8. **セキュリティ注意**: `execSnap.data()!.userId !== uid`のIDORチェックを維持。
9. **必要テスト**: 他人のexecutionIdへの操作が拒否されること。
10. **想定改修量**: 中（transactionより単純）。

### H. `lib/members/admin-ops.ts` — 管理者による会員変更・監査ログ

1. **用途**: 会員のrole/status変更（**Firestore transaction**＋監査ログ書き込みを同一トランザクションで実行、fail-closed設計）、Firebase Auth側の同期（`updateUser(disabled)`, `setCustomUserClaims`, `revokeRefreshTokens`）。
2. **呼び出し元**: `app/admin/actions.ts`。
3. **認証要否**: Admin権限必須（`requireAdmin()`で事前ガード、呼び出し元で確認）。
4. **権限**: **管理者権限操作そのもの**。
5. **Auth REST置換可否**: `updateUser`/`setCustomUserClaims`/`revokeRefreshTokens`は全て`accounts:update`系で可。
6. **Firestore REST置換可否**: **可だが最重要**。「最後の有効admin」を消せない排他制御をtransactionで維持する必要。
7. **クライアントSDK移動可否**: 不可。
8. **セキュリティ注意**: **このファイルの改修が全体で最もリスクが高い**。admin降格・停止・削除のロジックを1文字でも間違えると権限昇格または管理者ロックアウトにつながる。
9. **必要テスト**: 「最後のadmin」を降格・停止・削除できないこと（境界値・競合）、監査ログが必ず書かれること（fail-closed）。
10. **想定改修量**: **最大**。最も慎重なレビューが必要な箇所。

### I. `lib/members/admin-queries.ts` — 管理画面の一覧・検索・集計

1. **用途**: ページネーション付き一覧（`where`＋`orderBy`＋`startAfter`カーソル）、前方一致検索（`orderBy`+`startAt`/`endAt`）、**count集計クエリ**（`.count().get()`）。
2. **呼び出し元**: `app/admin/`配下の一覧・ダッシュボードページ全て。
3. **認証要否**: Admin権限。
4. **権限**: 管理者権限（一覧・統計の閲覧）。
5. **Auth REST置換可否**: 該当なし。
6. **Firestore REST置換可否**: **可**。`runQuery`（構造化クエリ：filter/orderBy/startAt/limit）と`runAggregationQuery`（count）で代替可。カーソルページネーション（`startAfterDoc`）はdocument参照の再構築が必要。
7. **クライアントSDK移動可否**: 不可。
8. **セキュリティ注意**: 検索・一覧に個人情報（メール等）が含まれるため、Admin認証済みルートからのみ呼ばれることを維持。
9. **必要テスト**: ページネーションの境界（最終ページ）、複合フィルタの組み合わせ。
10. **想定改修量**: 中〜大（クエリ構築ロジックの書き換えが多いが、複雑な排他制御はない）。

---

## 2. 基盤設計（REST置換の核）

### 2-1. サービスアカウントOAuth2アクセストークン取得（Web Crypto）

既存の`FIREBASE_CLIENT_EMAIL`/`FIREBASE_PRIVATE_KEY`をそのまま使う（新しい秘密情報は不要）。

1. JWTアサーション（`{iss: client_email, scope: "...", aud: "https://oauth2.googleapis.com/token", exp, iat}`）をWeb Crypto `crypto.subtle.sign("RSASSA-PKCS1-v1_5", ...)`でRS256署名。
2. `POST https://oauth2.googleapis.com/token`（`grant_type=urn:ietf:params:oauth:grant-type:jwt-bearer`）でアクセストークンと交換。
3. トークン（有効期限1時間）をメモリキャッシュし、期限間際に再取得。
4. 必要スコープ: `https://www.googleapis.com/auth/identitytoolkit`（Auth Admin操作用）、`https://www.googleapis.com/auth/datastore`（Firestore用）。

### 2-2. ID Token検証（署名・aud・iss・sub・exp・auth_time）

1. Google公開鍵: `https://www.googleapis.com/robot/v1/metadata/x509/securetoken@system.gserviceaccount.com`（x509、`kid`ごとに複数鍵、`Cache-Control`ヘッダーのTTLに従いキャッシュ）。
2. JWTヘッダーの`kid`で鍵を選択→`crypto.subtle.importKey`→`crypto.subtle.verify("RSASSA-PKCS1-v1_5", ...)`で署名検証。
3. クレーム検証: `aud === FIREBASE_PROJECT_ID`、`iss === "https://securetoken.google.com/" + FIREBASE_PROJECT_ID`、`sub`が非空文字列かつ`user_id`と一致、`exp > now`、`iat`が未来でない、`auth_time <= now`。
4. 単なるBase64デコードでは絶対に済ませない（ユーザー指示通り）。

### 2-3. セッション方式の変更（挙動維持・内部実装変更）

現行の`createSessionCookie`はAdmin SDK固有の非公開プロトコルで、REST単体では再現不可。
**代替設計**: サインイン時にFirebase Auth REST（`accounts:signInWithIdp`等、クライアント側は現行のGoogleサインインのまま）から得られる**リフレッシュトークン**をHttpOnly Cookieに保存する（Session Cookieの代わり）。

- リクエストごとに、Cookie内のリフレッシュトークンを`POST https://securetoken.googleapis.com/v1/token`（`grant_type=refresh_token`）で新しいID Tokenに交換し、上記2-2で検証する。
- 直近取得分は短時間メモリキャッシュ可（毎リクエストでの交換を避ける）。
- 有効期限: リフレッシュトークンは長期間有効（現行の5日Cookieと同等以上に設定可能。`revokeRefreshTokens`で失効させれば即座に無効化される点は同じ）。
- ログアウト時の「全端末で無効化」は、Identity Toolkit Admin RESTの`accounts:update`（`validSince`を現在時刻に設定）で実現（現行の`revokeRefreshTokens`と同じ効果）。
- **外部から見た挙動（Cookie名・有効期限・ログイン維持期間・全端末ログアウト）は変更しない**。内部トークン形式のみ変わる。

### 2-4. Firestore REST クライアント（新規モジュール）

`https://firestore.googleapis.com/v1/projects/{project}/databases/(default)/documents` を基点に:

- **get**: `GET .../documents/{path}`
- **query**: `POST .../documents:runQuery`（`structuredQuery`でwhere/orderBy/startAt/limit/startAfterを表現）
- **count集計**: `POST .../documents:runAggregationQuery`
- **単純書き込み**: `PATCH .../documents/{path}`（`updateMask`＋`?currentDocument.exists=true`等で条件付き更新）
- **batched write**: `POST .../documents:commit`（複数`writes`を1リクエストに積む。読み取り不要）
- **transaction**: `POST .../documents:beginTransaction` → 対象docを`transaction`指定で`get` → `POST .../documents:commit`（`transaction`ID指定、失敗時はリトライ）
- **フィールド変換**: `serverTimestamp`は`fieldTransforms`の`setToServerValue: REQUEST_TIME`、`increment`は`fieldTransforms`の`increment`
- 型変換: Firestore REST値表現（`stringValue`/`timestampValue`/`integerValue`等）⇔アプリの型、を`repo.ts`の既存マッパーと同じ責務範囲で新規に書く。

### 2-5. Auth Admin REST（新規モジュール）

`https://identitytoolkit.googleapis.com/v1/projects/{project}` を基点に、2-1のアクセストークンで認証:

- `accounts:update`（`localId`指定）: `customAttributes`（custom claims）、`disableUser`（アカウント無効化）、`validSince`（全トークン失効）
- 上記いずれも既存の`setCustomUserClaims`/`updateUser`/`revokeRefreshTokens`と1対1対応。

---

## 3. 総合評価

- **実装規模**: 新規モジュール4本（サービスアカウントOAuth2／ID Token検証／Firestore RESTクライアント／Auth Admin RESTクライアント）＋既存10ファイルの内部差し替え。関数シグネチャ・戻り値型は可能な限り維持し、呼び出し元（ページ・API route）への影響を最小化する方針。
- **最もリスクが高い箇所**: `admin-ops.ts`（管理者権限の付与・剥奪、最後のadmin保護）と`login.ts`（初期管理者ブートストラップ）。この2つはtransaction的排他制御の正確な再現が生命線。
- **既存Firestoreデータ・Authユーザー・セキュリティルールへの変更**: なし（読み書きの実装方式が変わるのみ、スキーマ・ルールは無変更）。
- **管理者権限の強度**: 低下させない。custom claims・Firestore role/accountStatus・ADMIN_EMAIL_ALLOWLISTの三重チェック構造を維持する。
