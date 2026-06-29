export type PageKind =
  | "dashboard"
  | "table"
  | "cards"
  | "calendar"
  | "form"
  | "about"
  | "floor"
  | "menu"
  | "kanban"
  | "report"
  | "invoice"
  | "qr"
  | "ai";

export type DemoPage = {
  path: string;
  label: string;
  icon: string;
  kind: PageKind;
  title: string;
  description: string;
  summaries?: { label: string; value: string; tone?: "coral" | "turquoise" | "muted" }[];
  chart?: { label: string; value: number }[];
  highlights?: { title: string; meta: string; status?: string; tone?: "coral" | "turquoise" | "muted" }[];
  columns?: string[];
  rows?: Record<string, string>[];
  cards?: { title: string; meta: string; value?: string; status?: string; tone?: "coral" | "turquoise" | "muted" }[];
  formFields?: string[];
  filters?: string[];
  cta?: string;
  about?: {
    catch: string;
    problems: string[];
    solutions: string[];
    button?: string;
  };
};

export type DemoConfig = {
  id: string;
  no: string;
  shortName: string;
  fullName: string;
  target: string;
  repo: string;
  banner: string;
  pages: DemoPage[];
};

const chart7 = [
  { label: "月", value: 58 },
  { label: "火", value: 72 },
  { label: "水", value: 64 },
  { label: "木", value: 86 },
  { label: "金", value: 78 },
  { label: "土", value: 94 },
  { label: "日", value: 88 },
];

const aboutButton = "https://shima-craft.com/#contact";
const sampleBanner = "このページはサンプルです。入力・保存などの実処理は行われません。画面レイアウトと導入イメージをご確認ください。";

const about = (
  catchCopy: string,
  problems: string[],
  solutions: string[],
  button = aboutButton,
) => ({ catch: catchCopy, problems, solutions, button });

export const demos: DemoConfig[] = [
  makeCleaning(),
  makeCrm(),
  {
    id: "demo03",
    no: "03",
    shortName: "宿泊予約管理",
    fullName: "宿泊予約管理システム",
    target: "民泊・旅館向け",
    repo: "shima-craft-demo-reservation",
    banner: sampleBanner,
    pages: [
      {
        path: "/",
        label: "ダッシュボード",
        icon: "LayoutDashboard",
        kind: "dashboard",
        title: "本日の宿泊状況",
        description: "チェックイン、チェックアウト、稼働率を一画面で確認できます。",
        summaries: [
          { label: "本日チェックイン", value: "2件", tone: "coral" },
          { label: "本日チェックアウト", value: "1件" },
          { label: "現在の稼働室", value: "2室", tone: "turquoise" },
          { label: "今月の予約", value: "18件" },
        ],
        chart: chart7,
        highlights: [
          { title: "田中太郎様", meta: "15:00 チェックイン / 101号室", status: "到着待ち", tone: "coral" },
          { title: "佐藤花子様", meta: "10:00 チェックアウト / 102号室", status: "精算済み", tone: "turquoise" },
          { title: "山田一郎様", meta: "16:30 チェックイン / 103号室", status: "連絡済み" },
        ],
      },
      {
        path: "/calendar",
        label: "予約カレンダー",
        icon: "CalendarDays",
        kind: "calendar",
        title: "予約カレンダー",
        description: "日付ごとの予約件数とチェックイン数を確認できます。",
        highlights: [
          { title: "6/29", meta: "予約2件・チェックイン2件", status: "本日", tone: "coral" },
          { title: "6/30", meta: "予約1件・チェックイン0件", status: "空きあり" },
          { title: "7/5", meta: "週末予約3件", status: "混雑", tone: "turquoise" },
        ],
        formFields: ["ゲスト名", "チェックイン日", "チェックアウト日", "部屋番号", "人数", "料金", "備考"],
        cta: "予約追加",
      },
      {
        path: "/rooms",
        label: "部屋管理",
        icon: "BedDouble",
        kind: "cards",
        title: "部屋管理",
        description: "部屋ごとの収容人数、料金、現在の状態を管理します。",
        cards: [
          { title: "101号室", meta: "和室 / 2名 / 12,000円", status: "空室", tone: "turquoise" },
          { title: "102号室", meta: "洋室 / 4名 / 18,000円", status: "チェックイン中", tone: "coral" },
          { title: "103号室", meta: "特別室 / 6名 / 35,000円", status: "清掃中" },
        ],
        formFields: ["部屋名", "収容人数", "料金/泊", "状態"],
        cta: "部屋追加",
      },
      {
        path: "/guests",
        label: "ゲスト一覧",
        icon: "Users",
        kind: "table",
        title: "ゲスト一覧",
        description: "名前検索と宿泊履歴の確認ができます。",
        columns: ["名前", "連絡先", "宿泊回数", "最終宿泊日", "備考"],
        rows: [
          { 名前: "田中太郎", 連絡先: "090-1000-0001", 宿泊回数: "3回", 最終宿泊日: "2026/06/29", 備考: "海側希望" },
          { 名前: "佐藤花子", 連絡先: "090-1000-0002", 宿泊回数: "2回", 最終宿泊日: "2026/06/29", 備考: "朝食あり" },
          { 名前: "山田一郎", 連絡先: "090-1000-0003", 宿泊回数: "5回", 最終宿泊日: "2026/07/02", 備考: "リピーター" },
          { 名前: "鈴木美咲", 連絡先: "090-1000-0004", 宿泊回数: "1回", 最終宿泊日: "2026/07/05", 備考: "初回" },
          { 名前: "伊藤健", 連絡先: "090-1000-0005", 宿泊回数: "4回", 最終宿泊日: "2026/07/06", 備考: "送迎相談" },
        ],
        filters: ["名前検索"],
        cta: "ゲスト詳細",
      },
      {
        path: "/about",
        label: "サンプル紹介",
        icon: "Settings",
        kind: "about",
        title: "サンプル紹介",
        description: "宿泊予約管理サンプルの紹介ページです。",
        about: about(
          "予約管理を、もっとシンプルに。",
          ["LINEでの予約管理の取りこぼし", "ダブルブッキングのリスク", "稼働状況の把握困難"],
          ["予約をカレンダーで一元管理", "部屋ごとの状態を即確認", "ゲスト履歴を次回対応に活用"],
        ),
      },
    ],
  },
  {
    id: "demo04",
    no: "04",
    shortName: "備品・設備点検",
    fullName: "備品・設備点検チェックリスト",
    target: "宿泊施設・観光施設向け",
    repo: "shima-craft-demo-inspection",
    banner: sampleBanner,
    pages: [
      {
        path: "/",
        label: "ダッシュボード",
        icon: "LayoutDashboard",
        kind: "dashboard",
        title: "本日の点検状況",
        description: "スタッフがスマホでも確認しやすい点検ダッシュボードです。",
        summaries: [
          { label: "本日の完了率", value: "60%", tone: "turquoise" },
          { label: "未完了項目", value: "8件" },
          { label: "要補充備品", value: "1件", tone: "coral" },
          { label: "直近の点検日", value: "2026/06/29" },
        ],
        highlights: [
          { title: "101号室", meta: "全項目OK", status: "完了", tone: "turquoise" },
          { title: "102号室", meta: "シャンプー補充", status: "要対応", tone: "coral" },
          { title: "103号室", meta: "本日未実施", status: "未完了" },
          { title: "厨房", meta: "照明交換が必要", status: "要修理", tone: "coral" },
        ],
      },
      {
        path: "/check",
        label: "点検実施",
        icon: "ClipboardCheck",
        kind: "form",
        title: "点検実施",
        description: "エリアを選び、OK / 要補充 / 要修理を記録します。",
        formFields: ["エリア", "アメニティ", "設備", "清潔", "備品", "備考"],
        cards: [
          { title: "アメニティ", meta: "タオル / シャンプー / ボディソープ / ドライヤー / スリッパ", status: "3択" },
          { title: "設備", meta: "エアコン / テレビ / Wi-Fi / 照明", status: "3択" },
          { title: "清潔", meta: "ベッド / バス・トイレ / 床 / 窓", status: "3択" },
        ],
        cta: "点検完了として記録する",
      },
      {
        path: "/alerts",
        label: "要対応",
        icon: "AlertTriangle",
        kind: "table",
        title: "要対応リスト",
        description: "要補充・要修理のみを抽出します。",
        columns: ["エリア", "項目名", "種別", "記録日時", "対応状況"],
        rows: [
          { エリア: "102号室", 項目名: "シャンプー", 種別: "要補充", 記録日時: "2026/06/29 09:20", 対応状況: "未対応" },
          { エリア: "厨房", 項目名: "照明", 種別: "要修理", 記録日時: "2026/06/29 08:50", 対応状況: "未対応" },
        ],
        filters: ["全件", "要補充のみ", "要修理のみ"],
        cta: "対応済みにする",
      },
      {
        path: "/history",
        label: "点検履歴",
        icon: "History",
        kind: "calendar",
        title: "点検履歴",
        description: "日付とエリアで点検記録を確認し、CSV出力できます。",
        highlights: [
          { title: "6/29", meta: "101完了・102要補充・厨房要修理", status: "5件" },
          { title: "6/28", meta: "全エリア完了", status: "完了", tone: "turquoise" },
          { title: "6/27", meta: "共用部に備品補充あり", status: "要確認", tone: "coral" },
        ],
        filters: ["101号室", "102号室", "103号室", "共用部", "厨房"],
        cta: "CSV出力",
      },
      {
        path: "/about",
        label: "サンプル紹介",
        icon: "Settings",
        kind: "about",
        title: "サンプル紹介",
        description: "備品・設備点検サンプルの紹介ページです。",
        about: about(
          "点検漏れを、なくす。",
          ["紙チェックリストの紛失", "抜け漏れによるクレーム", "備品切れの把握遅れ"],
          ["スマホで点検を即記録", "要補充・要修理を一覧化", "履歴をCSVで確認"],
        ),
      },
    ],
  },
  {
    id: "demo05",
    no: "05",
    shortName: "口コミ収集・Google誘導",
    fullName: "口コミ収集・Google誘導システム",
    target: "全業種向け",
    repo: "shima-craft-demo-review",
    banner: sampleBanner,
    pages: [
      {
        path: "/",
        label: "ダッシュボード",
        icon: "LayoutDashboard",
        kind: "dashboard",
        title: "口コミ状況",
        description: "評価内訳とGoogle誘導クリックを見える化します。",
        summaries: [
          { label: "総口コミ数", value: "20件" },
          { label: "平均評価", value: "4.1", tone: "turquoise" },
          { label: "今月の新規口コミ", value: "6件" },
          { label: "Google誘導クリック", value: "14回", tone: "coral" },
        ],
        chart: [
          { label: "5", value: 100 },
          { label: "4", value: 50 },
          { label: "3", value: 30 },
          { label: "2", value: 10 },
          { label: "1", value: 10 },
        ],
        highlights: [
          { title: "田中様", meta: "施術が丁寧で安心できました。", status: "5星", tone: "turquoise" },
          { title: "佐藤様", meta: "説明が分かりやすかったです。", status: "4星" },
          { title: "山田様", meta: "待ち時間が少し長かったです。", status: "3星", tone: "coral" },
        ],
      },
      {
        path: "/reviews",
        label: "口コミ一覧",
        icon: "Star",
        kind: "table",
        title: "口コミ一覧",
        description: "評価別・返信状況で口コミを確認できます。",
        columns: ["投稿日", "お客様名", "評価", "コメント抜粋", "掲載先", "返信"],
        rows: [
          { 投稿日: "2026/06/29", お客様名: "田中様", 評価: "5星", コメント抜粋: "体が軽くなりました", 掲載先: "アンケート", 返信: "未返信" },
          { 投稿日: "2026/06/27", お客様名: "佐藤様", 評価: "4星", コメント抜粋: "丁寧でした", 掲載先: "Google", 返信: "返信済み" },
          { 投稿日: "2026/06/25", お客様名: "山田様", 評価: "3星", コメント抜粋: "待ち時間が長い", 掲載先: "アンケート", 返信: "未返信" },
        ],
        filters: ["全件", "高評価", "低評価", "未返信"],
        cta: "詳細",
      },
      {
        path: "/form",
        label: "アンケート",
        icon: "MessageSquare",
        kind: "form",
        title: "アンケートフォーム",
        description: "高評価だけGoogleマップへの導線を表示する公開フォームです。",
        formFields: ["お名前（任意）", "評価", "コメント"],
        cards: [
          { title: "4〜5星の場合", meta: "Googleマップにも書いてもらえると嬉しいです", status: "誘導表示", tone: "turquoise" },
          { title: "1〜3星の場合", meta: "改善してまいります", status: "Googleリンク非表示", tone: "coral" },
        ],
        cta: "送信する",
      },
      {
        path: "/links",
        label: "QR・リンク",
        icon: "Send",
        kind: "qr",
        title: "QRコード・リンク管理",
        description: "アンケートフォームのURLとQRコードを管理します。",
        cards: [
          { title: "会計時", meta: "会計後にスタッフから案内" },
          { title: "テーブル置き", meta: "卓上POPから読み取り" },
          { title: "名刺裏", meta: "ショップカードに掲載" },
          { title: "LINEで送る", meta: "来店後メッセージに添付" },
        ],
        cta: "コピー",
      },
      {
        path: "/about",
        label: "サンプル紹介",
        icon: "Settings",
        kind: "about",
        title: "サンプル紹介",
        description: "口コミ収集サンプルの紹介ページです。",
        about: about(
          "良い口コミを、もっと増やす。",
          ["口コミを依頼するタイミングの難しさ", "低評価がGoogleに直結するリスク"],
          ["アンケートで自然に声を集める", "高評価のみGoogle投稿を促す", "返信テンプレで対応を効率化"],
        ),
      },
    ],
  },
];

const extraDemos: DemoConfig[] = [
  makeRetention(),
  makeMenu(),
  makeSeat(),
  makeSales(),
  makeConstruction(),
  makeReport(),
  makeInvoice(),
  makeTask(),
  makeInquiry(),
  makeAiWriter(),
];

demos.push(...extraDemos);

function makeCleaning(): DemoConfig {
  return {
    id: "demo01",
    no: "01",
    shortName: "清掃完了報告",
    fullName: "清掃完了報告システム",
    target: "民泊・ホテル向け",
    repo: "shima-craft-demo-cleaning",
    banner: sampleBanner,
    pages: [
      {
        path: "/",
        label: "ダッシュボード",
        icon: "LayoutDashboard",
        kind: "dashboard",
        title: "本日の清掃状況",
        description: "総部屋数、完了、未完了、確認待ちを一画面で確認できます。",
        summaries: [
          { label: "総部屋数", value: "6室" },
          { label: "完了", value: "1室", tone: "turquoise" },
          { label: "未完了", value: "3室", tone: "coral" },
          { label: "確認待ち", value: "1室" },
        ],
        chart: chart7,
        highlights: [
          { title: "101号室", meta: "担当: 田中さん / 10:20", status: "確認済み", tone: "turquoise" },
          { title: "102号室", meta: "担当: 佐藤さん / 11:05", status: "完了", tone: "coral" },
          { title: "103号室", meta: "担当: 山田さん", status: "清掃中" },
          { title: "104号室", meta: "担当未定", status: "未着手" },
        ],
      },
      {
        path: "/report",
        label: "清掃報告",
        icon: "ClipboardCheck",
        kind: "form",
        title: "清掃完了報告",
        description: "スタッフがスマホからチェックリスト、備考、写真メモを送信できます。",
        formFields: [
          "部屋番号",
          "担当スタッフ名",
          "ベッドメイク完了",
          "トイレ・バス清掃完了",
          "ゴミ回収完了",
          "アメニティ補充完了",
          "窓・床清掃完了",
          "備考・特記事項",
          "写真メモ",
        ],
        cards: [
          { title: "写真アップロード想定", meta: "最大3枚の写真プレビュー枠を想定", status: "表示例" },
          { title: "送信後の反映", meta: "確認待ちとしてオーナー確認画面に表示", status: "デモ操作", tone: "turquoise" },
        ],
        cta: "完了報告を送る",
      },
      {
        path: "/owner",
        label: "オーナー確認",
        icon: "CheckSquare",
        kind: "cards",
        title: "オーナー確認画面",
        description: "確認待ちの報告を承認し、過去7日分の履歴を確認できます。",
        cards: [
          { title: "102号室", meta: "担当: 佐藤さん / チェック5項目完了 / 備考あり", status: "確認待ち", tone: "coral" },
          { title: "101号室", meta: "担当: 田中さん / 写真2枚 / 問題なし", status: "確認済み", tone: "turquoise" },
          { title: "前日履歴", meta: "105号室・106号室を確認済み", status: "履歴" },
        ],
        cta: "確認OK",
      },
      {
        path: "/staff",
        label: "スタッフ",
        icon: "Users",
        kind: "table",
        title: "スタッフ管理",
        description: "担当部屋数と今日の完了件数を管理します。",
        columns: ["名前", "担当部屋数", "今日の完了件数", "ステータス"],
        rows: [
          { 名前: "田中さん", 担当部屋数: "2室", 今日の完了件数: "1件", ステータス: "稼働中" },
          { 名前: "佐藤さん", 担当部屋数: "2室", 今日の完了件数: "1件", ステータス: "確認待ち" },
          { 名前: "山田さん", 担当部屋数: "2室", 今日の完了件数: "0件", ステータス: "清掃中" },
        ],
        cta: "スタッフ追加",
      },
      aboutPage(
        "清掃完了を、見える化する。",
        ["清掃完了の口頭確認が多い", "LINEの写真や報告が流れる", "オーナー確認に時間がかかる"],
        ["スマホから完了報告", "写真とチェック項目を一元化", "オーナー確認まで履歴化"],
      ),
    ],
  };
}

function makeCrm(): DemoConfig {
  return {
    id: "demo02",
    no: "02",
    shortName: "顧客カルテ・予約管理",
    fullName: "顧客カルテ・予約管理システム",
    target: "整体院・美容院向け",
    repo: "shima-craft-demo-crm",
    banner: sampleBanner,
    pages: [
      {
        path: "/",
        label: "ダッシュボード",
        icon: "LayoutDashboard",
        kind: "dashboard",
        title: "本日の予約と顧客状況",
        description: "予約、顧客数、来店履歴をサロン向けに整理します。",
        summaries: [
          { label: "本日の予約", value: "5件", tone: "coral" },
          { label: "今月の新規顧客", value: "8名" },
          { label: "総顧客数", value: "128名", tone: "turquoise" },
          { label: "直近7日の来店", value: "24件" },
        ],
        chart: chart7,
        highlights: [
          { title: "10:00 田中 美咲", meta: "60分整体 / 担当: 佐々木", status: "本日", tone: "coral" },
          { title: "11:30 佐藤 健太", meta: "骨盤矯正 / 担当: 山本", status: "予約" },
          { title: "17:30 中村 陽子", meta: "ネイル / 担当: 田村", status: "予約", tone: "turquoise" },
        ],
      },
      {
        path: "/customers",
        label: "顧客一覧",
        icon: "Users",
        kind: "table",
        title: "顧客一覧",
        description: "名前・カナ検索、来店状況フィルター、新規登録ができます。",
        columns: ["名前", "カナ", "電話番号", "最終来店日", "来店回数", "担当スタッフ"],
        rows: [
          { 名前: "田中 美咲", カナ: "タナカ ミサキ", 電話番号: "090-1234-5678", 最終来店日: "2026/06/20", 来店回数: "15回", 担当スタッフ: "佐々木" },
          { 名前: "佐藤 健太", カナ: "サトウ ケンタ", 電話番号: "090-2345-6789", 最終来店日: "2026/06/18", 来店回数: "8回", 担当スタッフ: "山本" },
          { 名前: "山田 花子", カナ: "ヤマダ ハナコ", 電話番号: "090-3456-7890", 最終来店日: "2026/06/21", 来店回数: "22回", 担当スタッフ: "佐々木" },
          { 名前: "鈴木 一郎", カナ: "スズキ イチロウ", 電話番号: "090-4567-8901", 最終来店日: "2026/05/12", 来店回数: "3回", 担当スタッフ: "田村" },
          { 名前: "伊藤 さくら", カナ: "イトウ サクラ", 電話番号: "090-5678-9012", 最終来店日: "2026/06/19", 来店回数: "11回", 担当スタッフ: "山本" },
          { 名前: "渡辺 大輔", カナ: "ワタナベ ダイスケ", 電話番号: "090-6789-0123", 最終来店日: "2026/04/18", 来店回数: "6回", 担当スタッフ: "佐々木" },
          { 名前: "中村 陽子", カナ: "ナカムラ ヨウコ", 電話番号: "090-7890-1234", 最終来店日: "2026/06/22", 来店回数: "30回", 担当スタッフ: "田村" },
          { 名前: "小林 翔", カナ: "コバヤシ ショウ", 電話番号: "090-8901-2345", 最終来店日: "2026/06/03", 来店回数: "2回", 担当スタッフ: "山本" },
        ],
        filters: ["全員", "今月来店", "3ヶ月以上未来店"],
        cta: "新規顧客登録",
      },
      {
        path: "/calendar",
        label: "予約カレンダー",
        icon: "CalendarDays",
        kind: "calendar",
        title: "予約カレンダー",
        description: "月曜始まりの週表示を想定した予約カレンダーです。",
        highlights: [
          { title: "10:00", meta: "田中 美咲 / 60分整体", status: "佐々木", tone: "coral" },
          { title: "13:00", meta: "山田 花子 / ヘッドスパ", status: "佐々木" },
          { title: "17:30", meta: "中村 陽子 / ネイル", status: "田村", tone: "turquoise" },
        ],
        formFields: ["顧客名", "日付", "開始時刻", "施術メニュー", "担当スタッフ", "備考"],
        cta: "予約追加",
      },
      {
        path: "/records",
        label: "カルテ記録",
        icon: "ClipboardCheck",
        kind: "form",
        title: "カルテ記録",
        description: "顧客ごとの来店履歴、施術メモ、次回提案を保存できます。",
        formFields: ["顧客名", "来店日", "メニュー", "担当者", "体の状態・気になる箇所", "施術内容", "次回提案", "料金"],
        cards: [
          { title: "2026-06-20", meta: "腰痛・肩こり / 骨盤調整・肩甲骨周り / 次回: 2週間後推奨", status: "田中 美咲", tone: "coral" },
          { title: "2026-06-05", meta: "産後の骨盤ゆがみ / 骨盤ベルト使用・股関節調整 / 次回: 3週間後", status: "田中 美咲" },
          { title: "2026-05-21", meta: "全身疲労感 / 全身ほぐし・足裏反射区 / 次回: 2週間後", status: "田中 美咲", tone: "turquoise" },
        ],
        cta: "カルテを保存",
      },
      aboutPage(
        "顧客管理を、もっとシンプルに。",
        ["紙のカルテ管理", "LINE予約の取りこぼし", "リピーター把握の難しさ"],
        ["顧客情報とカルテを一元管理", "予約状況をカレンダーで確認", "来店履歴から次回提案につなげる"],
      ),
    ],
  };
}

function makeRetention(): DemoConfig {
  return {
    id: "demo06",
    no: "06",
    shortName: "LINE再来店促進",
    fullName: "LINE再来店促進システム",
    target: "サロン・飲食店向け",
    repo: "shima-craft-demo-retention",
    banner: sampleBanner,
    pages: [
      dashboard("LINE再来店ダッシュボード", "休眠顧客と直近配信を確認します。", [
        ["配信リスト人数", "15人"],
        ["今月の配信数", "4件"],
        ["開封率", "68%"],
        ["来店につながった件数", "6件"],
      ], [
        ["佐藤花子様", "最終来店から42日", "要フォロー"],
        ["山田一郎様", "最終来店から76日", "休眠"],
        ["鈴木美咲様", "キャンペーン配信済み", "送信済み"],
      ]),
      tablePage("/customers", "顧客リスト", "Users", "顧客リスト", "経過日数でステータスを自動判定します。", ["名前", "最終来店日", "来店回数", "経過日数", "ステータス"], [
        ["田中太郎", "2026/06/20", "8回", "9日", "アクティブ"],
        ["佐藤花子", "2026/05/18", "5回", "42日", "要フォロー"],
        ["山田一郎", "2026/04/14", "3回", "76日", "休眠"],
      ], "メッセージ送信"),
      cardsPage("/templates", "テンプレート", "MessageSquare", "メッセージテンプレート", "変数タグを使ったLINE文面を管理します。", [
        ["再来店フォロー", "しばらくお会いできていませんが、お体はいかがですか？", "{お名前}"],
        ["キャンペーン案内", "今月限定キャンペーンのご案内です。", "{最終来店日}"],
        ["1ヶ月経過", "前回ご来店から1ヶ月が経ちました。次回のご予約はいかがでしょうか？", "{経過日数}"],
      ], "テンプレート追加"),
      tablePage("/history", "配信履歴", "Calendar", "配信履歴", "月別に配信状況を確認できます。", ["配信日", "対象顧客名", "使用テンプレ", "ステータス"], [
        ["2026/06/29", "佐藤花子", "再来店フォロー", "送信済み"],
        ["2026/06/26", "山田一郎", "キャンペーン案内", "送信済み"],
        ["2026/06/20", "鈴木美咲", "1ヶ月経過", "送信済み"],
      ], "月別フィルター"),
      aboutPage("一度来たお客様を、もう一度。", ["来店してもLINE登録してもらえない", "フォロー連絡が手間", "休眠顧客の把握が難しい"], ["最終来店日で自動抽出", "テンプレートで素早く送信", "履歴で効果を確認"]),
    ],
  };
}

function makeMenu(): DemoConfig {
  return {
    id: "demo07",
    no: "07",
    shortName: "メニュー・料金管理",
    fullName: "メニュー・料金管理システム",
    target: "飲食店・カフェ向け",
    repo: "shima-craft-demo-menu",
    banner: sampleBanner,
    pages: [
      dashboard("管理ダッシュボード", "HPに反映するメニュー更新状況を確認します。", [["総メニュー数", "18品"], ["カテゴリ数", "4件"], ["最終更新日時", "2026/06/29 10:20"], ["非公開メニュー", "2品"]], [["島コーヒー", "価格を更新", "公開"], ["黒糖チーズケーキ", "説明文を更新", "公開"], ["季節のセット", "表示をOFF", "非公開"]], "/admin"),
      tablePage("/admin/menus", "メニュー管理", "UtensilsCrossed", "メニュー管理", "画像URL、表示状態、並び順を管理します。", ["画像", "メニュー名", "カテゴリ", "価格", "表示状態", "並び順"], [
        ["サムネイル", "島コーヒー", "コーヒー", "520円", "公開", "1"],
        ["サムネイル", "黒糖ラテ", "コーヒー", "620円", "公開", "2"],
        ["サムネイル", "季節のケーキ", "デザート", "680円", "非公開", "3"],
      ], "メニュー追加"),
      tablePage("/admin/categories", "カテゴリ管理", "Tag", "カテゴリ管理", "カテゴリの表示順を上へ/下へで調整できます。", ["カテゴリ名", "メニュー数", "表示順", "アクション"], [
        ["コーヒー", "5品", "1", "上へ / 下へ"],
        ["フード", "5品", "2", "上へ / 下へ"],
        ["デザート", "4品", "3", "上へ / 下へ"],
        ["セット", "4品", "4", "上へ / 下へ"],
      ], "カテゴリ追加"),
      {
        path: "/menu",
        label: "HPプレビュー",
        icon: "Eye",
        kind: "menu",
        title: "HP向けメニュープレビュー",
        description: "お客様向けページに表示される状態を確認できます。",
        cards: [
          { title: "島コーヒー", meta: "香ばしい深煎りブレンド", value: "520円", status: "コーヒー" },
          { title: "黒糖ラテ", meta: "奄美黒糖を使った人気ドリンク", value: "620円", status: "コーヒー" },
          { title: "ガパオライス", meta: "ランチに人気のプレート", value: "980円", status: "フード" },
          { title: "黒糖チーズケーキ", meta: "濃厚でやさしい甘さ", value: "680円", status: "デザート" },
        ],
      },
      aboutPage("メニューの更新を、自分でできるように。", ["制作会社に頼むたびに費用が発生", "更新が遅れてお客様に迷惑", "季節メニューの切り替えが大変"], ["管理画面で即更新", "非公開切替で準備中も安心", "HP表示をプレビュー確認"]),
    ],
  };
}

function makeSeat(): DemoConfig {
  return {
    id: "demo08",
    no: "08",
    shortName: "席予約・順番待ち",
    fullName: "席予約・順番待ち管理システム",
    target: "飲食店向け",
    repo: "shima-craft-demo-seat",
    banner: sampleBanner,
    pages: [
      { path: "/", label: "フロアマップ", icon: "LayoutDashboard", kind: "floor", title: "フロアマップ", description: "テーブルA〜Hの状態を色で確認できます。", summaries: [{ label: "本日の残席数", value: "3席" }, { label: "現在の順番待ち", value: "2組", tone: "coral" }] },
      tablePage("/reservations", "予約管理", "CalendarDays", "予約管理", "本日の予約を時間軸で確認します。", ["時刻", "名前", "人数", "テーブル", "連絡先", "ステータス"], [["11:30", "田中様", "2名", "A", "090-2000-0001", "確定"], ["12:15", "佐藤様", "4名", "D", "090-2000-0002", "来店済み"], ["18:30", "山田様", "3名", "F", "090-2000-0003", "確定"]], "予約追加"),
      tablePage("/waiting", "順番待ち", "Users", "順番待ちリスト", "登録順に番号を振り、呼び出し状況を管理します。", ["順番", "名前", "人数", "待機開始", "経過時間"], [["1", "鈴木様", "2名", "12:05", "18分"], ["2", "伊藤様", "3名", "12:12", "11分"]], "順番待ち登録"),
      calendarPage("/calendar", "予約カレンダー", "CalendarDays", "予約カレンダー", [["6/29", "予約6件", "本日"], ["6/30", "予約3件", "余裕あり"], ["7/5", "予約8件", "混雑"]]),
      aboutPage("予約管理を、電話から解放する。", ["電話対応で手が離せない", "ダブルブッキング", "予約状況の把握が困難"], ["予約と順番待ちを一元化", "席状態をフロアで可視化", "スマホ・タブレットで操作"]),
    ],
  };
}

function makeSales(): DemoConfig {
  return baseBusinessDemo("demo09", "09", "売上・在庫管理", "売上・在庫かんたん管理システム", "飲食店・小売店向け", "shima-craft-demo-sales", "売上と在庫を、一画面で。", ["Excelの手入力が面倒", "在庫切れに気づかない", "月次売上の集計に時間がかかる"], [
    dashboard("売上ダッシュボード", "売上と在庫アラートを確認します。", [["本日の売上", "58,400円"], ["今月の売上", "1,248,000円"], ["在庫アラート", "4件"], ["今月の仕入れ額", "362,000円"]], [["牛乳", "残り2本", "残少"], ["テイクアウト容器", "在庫0", "切れ"], ["黒糖", "最低在庫を下回っています", "残少"]]),
    tablePage("/sales", "売上記録", "TrendingUp", "売上記録", "売上入力、月別・カテゴリ別フィルター、CSV出力を備えています。", ["日付", "金額", "カテゴリ", "備考"], [["2026/06/29", "58,400円", "フード", "ランチ好調"], ["2026/06/28", "72,800円", "ドリンク", "週末"], ["2026/06/27", "48,100円", "テイクアウト", "通常"]], "売上を追加"),
    tablePage("/inventory", "在庫管理", "Package", "在庫管理", "在庫数を増減し、仕入れ記録へつなげます。", ["品名", "在庫数", "単位", "最低在庫", "状態"], [["牛乳", "2", "本", "5", "残少"], ["コーヒー豆", "8", "kg", "4", "十分"], ["テイクアウト容器", "0", "箱", "2", "切れ"]], "商品追加"),
    dashboardPage("/reports", "レポート", "FileText", "レポート", "期間別サマリーとカテゴリ比率を確認します。", [["合計", "412,600円"], ["日平均", "58,943円"], ["最高売上日", "6/28"], ["最低売上日", "6/24"]], [["フード", "52%", "主力"], ["ドリンク", "31%", "伸長"], ["テイクアウト", "17%", "安定"]]),
  ]);
}

function makeConstruction(): DemoConfig {
  return baseBusinessDemo("demo10", "10", "工事進捗・現場タスク", "工事進捗・現場タスク管理システム", "工務店・建設向け", "shima-craft-demo-construction", "現場の進捗を、いつでもどこでも。", ["電話で進捗確認", "タスクの抜け漏れ", "現場写真がLINEに散在"], [
    dashboard("工事進捗ダッシュボード", "案件別進捗と遅延タスクを見える化します。", [["進行中案件", "5件"], ["今週完了予定", "2件"], ["遅延タスク", "3件"], ["担当スタッフ", "4名"]], [["外壁リフォーム", "進捗72%", "工事中"], ["店舗改装", "期限超過タスクあり", "遅延"], ["屋根工事", "写真提出待ち", "確認"]]),
    cardsPage("/projects", "案件管理", "Building2", "案件管理", "案件カードから詳細、タスク、写真へ進めます。", [["外壁リフォーム", "施主: 田中様 / 進捗72%", "工事中"], ["新築住宅", "施主: 佐藤様 / 進捗45%", "着工"], ["店舗改装", "施主: 島カフェ / 進捗88%", "工事中"]], "案件追加"),
    { ...tablePage("/tasks", "タスク管理", "CheckSquare", "タスク管理", "リストとカンバンを切り替えて全案件のタスクを管理します。", ["案件名", "タスク名", "担当者", "期限", "ステータス", "優先度"], [["店舗改装", "電気配線確認", "佐藤", "2026/06/28", "作業中", "高"], ["屋根工事", "写真アップロード", "田中", "2026/06/29", "未着手", "中"], ["水回りリノベ", "完了確認", "山田", "2026/07/02", "未着手", "低"]], "タスク追加"), kind: "kanban" },
    cardsPage("/photos", "現場写真", "Camera", "現場写真管理", "写真アップロードとコメントを案件ごとに保存します。", [["着工前", "外壁リフォーム / 北面", "保存済み"], ["工事中", "店舗改装 / 厨房", "保存済み"], ["完工後", "水回りリノベ / 洗面台", "確認待ち"]], "写真を追加"),
  ]);
}

function makeReport(): DemoConfig {
  return baseBusinessDemo("demo11", "11", "施工写真・報告書生成", "施工写真・報告書自動生成システム", "工務店・点検業者向け", "shima-craft-demo-report", "現場写真を撮るだけで、報告書ができる。", ["写真の案件別整理が大変", "報告書作成に2〜3時間かかる", "メール添付が煩雑"], [
    dashboard("報告書ダッシュボード", "写真数と報告書の進捗を確認します。", [["今月の報告書", "8件"], ["登録写真総数", "42枚"], ["未完了報告書", "2件"], ["今週の撮影", "16件"]], [["外壁点検報告書", "写真12枚", "作成済み"], ["屋根工事報告書", "写真9枚", "未完了"], ["店舗改装報告書", "写真15枚", "作成済み"]]),
    formPage("/upload", "写真アップロード", "Camera", "写真アップロード", "案件・フェーズごとに写真とコメントを保存します。", ["案件選択", "撮影フェーズ", "写真アップロード", "コメント", "位置情報"], "保存して次の案件へ"),
    { ...formPage("/generate", "報告書生成", "FileText", "報告書生成", "登録済み写真をフェーズ別に整理し、A4縦の印刷プレビューを作ります。", ["案件選択", "報告書タイトル", "作成日", "担当者", "施主名"], "PDFとして保存（仮）"), kind: "report" },
    tablePage("/reports", "報告書一覧", "FolderOpen", "報告書一覧", "作成済み報告書のプレビューと削除ができます。", ["案件名", "作成日", "担当者", "写真枚数", "アクション"], [["外壁点検", "2026/06/29", "佐藤", "12枚", "プレビュー"], ["店舗改装", "2026/06/22", "田中", "15枚", "プレビュー"]], "プレビュー"),
  ]);
}

function makeInvoice(): DemoConfig {
  return baseBusinessDemo("demo12", "12", "見積・請求書発行", "かんたん見積・請求書発行システム", "工務店・個人事業主向け", "shima-craft-demo-invoice", "見積から請求まで、一つの画面で。", ["Excelテンプレートの管理が大変", "見積から請求の転記ミス", "未入金の管理が漏れる"], [
    dashboard("書類ダッシュボード", "見積・請求・未入金を確認します。", [["今月の見積", "5件"], ["今月の請求", "3件"], ["未入金合計", "286,000円"], ["今月の売上", "612,000円"]], [["INV-2026-003", "286,000円 / 未入金", "要確認"], ["EST-2026-004", "承認済み", "請求書作成可"], ["EST-2026-005", "作成中", "下書き"]]),
    { ...tablePage("/estimates", "見積書作成", "FileText", "見積書作成", "明細行の小計、税率、合計を自動計算します。", ["番号", "作成日", "相手先", "金額", "ステータス"], [["EST-2026-001", "2026/06/12", "田中工務店", "180,000円", "承認済み"], ["EST-2026-002", "2026/06/18", "島カフェ", "240,000円", "送付済み"], ["EST-2026-003", "2026/06/21", "山田商店", "98,000円", "失注"]], "新規見積書を作成"), kind: "invoice" },
    tablePage("/invoices", "請求書作成", "Receipt", "請求書作成", "入金状況を色分けし、見積から請求書を作成できます。", ["番号", "請求日", "相手先", "金額", "入金状況"], [["INV-2026-001", "2026/06/15", "田中工務店", "180,000円", "入金済み"], ["INV-2026-002", "2026/06/24", "島カフェ", "286,000円", "未入金"], ["INV-2026-003", "2026/06/27", "鈴木設備", "146,000円", "一部入金"]], "新規請求書を作成"),
    tablePage("/clients", "取引先管理", "Users", "取引先管理", "取引先ごとに過去の見積・請求書を確認します。", ["社名", "担当者", "連絡先", "取引回数", "最終取引日"], [["田中工務店", "田中様", "099-000-0001", "8回", "2026/06/24"], ["島カフェ", "佐藤様", "099-000-0002", "4回", "2026/06/27"], ["鈴木設備", "鈴木様", "099-000-0003", "5回", "2026/06/20"]], "取引先追加"),
  ]);
}

function makeTask(): DemoConfig {
  return baseBusinessDemo("demo13", "13", "スタッフ向けタスク管理", "スタッフ向けタスク管理システム", "全業種向け", "shima-craft-demo-task", "誰が何をやるか、一目で分かる。", ["口頭でのタスク指示が抜け漏れる", "進捗確認のたびに声をかける必要がある", "スタッフ間の仕事量が偏る"], [
    dashboard("タスクダッシュボード", "本日のタスクとスタッフ別完了率を確認します。", [["本日のタスク", "12件"], ["完了済み", "7件"], ["未完了", "5件"], ["期限超過", "2件"]], [["田中", "完了率80%", "良好"], ["佐藤", "本日期限3件", "確認"], ["山田", "期限超過1件", "要対応"]]),
    { ...tablePage("/tasks", "タスク一覧", "CheckSquare", "タスク一覧", "リスト表示とカンバン表示を切り替えます。", ["タスク名", "担当者", "期限", "優先度", "ステータス"], [["開店準備チェック", "田中", "2026/06/29", "高", "作業中"], ["売上集計", "佐藤", "2026/06/29", "中", "未着手"], ["在庫確認", "山田", "2026/06/30", "低", "完了"]], "タスク追加"), kind: "kanban" },
    cardsPage("/recurring", "定期タスク", "Calendar", "定期タスク", "毎日・毎週・毎月のテンプレートから今日のタスクを生成します。", [["開店準備チェック", "毎日 09:00", "有効"], ["週次売上集計", "毎週月曜", "有効"], ["月次在庫確認", "毎月末", "有効"]], "今日のタスクを生成"),
    tablePage("/staff", "スタッフ管理", "Users", "スタッフ管理", "スタッフ別の担当数と完了率を確認します。", ["名前", "担当タスク数", "完了数", "完了率", "今日の担当"], [["田中", "8件", "6件", "75%", "3件"], ["佐藤", "7件", "5件", "71%", "4件"], ["山田", "6件", "4件", "67%", "2件"], ["鈴木", "5件", "4件", "80%", "3件"]], "スタッフ追加"),
  ]);
}

function makeInquiry(): DemoConfig {
  return baseBusinessDemo("demo14", "14", "問い合わせ管理", "問い合わせ管理・返信テンプレシステム", "全業種向け", "shima-craft-demo-inquiry", "問い合わせ対応を、もっとスムーズに。", ["同じ内容の返信を何度も書いている", "対応漏れが発生する", "担当者が休むと対応できない"], [
    dashboard("問い合わせダッシュボード", "未対応件数と対応状況を確認します。", [["未対応件数", "7件"], ["対応済み件数", "8件"], ["今月の問い合わせ", "20件"], ["平均対応時間", "2.4時間"]], [["料金について", "山田様 / 優先度高", "未対応"], ["予約変更", "佐藤様 / 本日中", "対応中"], ["キャンセル相談", "田中様", "未対応"]]),
    tablePage("/inquiries", "問い合わせ一覧", "MessageSquare", "問い合わせ一覧", "行を選ぶと詳細サイドパネルで返信文を作成できます。", ["受信日時", "件名", "お客様名", "種別", "ステータス", "担当者"], [["2026/06/29 10:30", "料金について", "山田様", "料金関連", "未対応", "佐藤"], ["2026/06/29 09:10", "予約変更", "佐藤様", "予約関連", "対応中", "田中"], ["2026/06/28 17:40", "キャンセル相談", "田中様", "キャンセル関連", "完了", "山田"]], "詳細"),
    cardsPage("/templates", "テンプレート", "Reply", "テンプレート管理", "カテゴリ別に件名と本文を保存し、コピーできます。", [["予約関連", "ご予約内容の確認について", "{お客様名}"], ["料金関連", "料金プランのご案内", "{日付}"], ["クレーム対応", "ご意見へのお詫びと対応", "{担当者名}"]], "テンプレート追加"),
    tablePage("/faq", "FAQ管理", "FileText", "よくある質問管理", "HPに掲載するFAQの公開状態を管理できます。", ["質問", "回答", "カテゴリ", "公開状態"], [["営業時間は？", "9:00〜18:00です", "一般案内", "公開"], ["キャンセル料は？", "前日50%、当日100%です", "キャンセル", "公開"], ["駐車場は？", "店舗前に3台分あります", "一般案内", "非公開"]], "FAQ追加"),
  ]);
}

function makeAiWriter(): DemoConfig {
  return {
    id: "demo15",
    no: "15",
    shortName: "AI投稿文・DM文生成",
    fullName: "AI投稿文・DM文自動作成ツール",
    target: "全業種・集客強化向け",
    repo: "shima-craft-demo-ai-writer",
    banner: sampleBanner,
    pages: [
      dashboard("AIライターダッシュボード", "生成履歴と使い方のレイアウトを確認します。", [["生成履歴", "5件"], ["テンプレート", "3件"], ["保存済み", "4件"], ["接続状態", "サンプル表示"]], [["業種と内容を入れる", "目的に合わせた入力項目を表示", "STEP 1"], ["文章の生成結果を見る", "サンプル文でレイアウト確認", "STEP 2"], ["コピーして投稿", "運用導線を画面上で確認", "STEP 3"]]),
      { path: "/generate", label: "文章生成", icon: "Wand2", kind: "ai", title: "文章生成", description: "業種、内容、トーンを選ぶ画面レイアウトのサンプルです。" },
      tablePage("/history", "生成履歴", "History", "生成履歴", "保存履歴の見え方を確認できます。", ["生成日時", "タイプ", "業種", "生成テキスト冒頭"], [["2026/06/29 10:00", "Instagram投稿文", "カフェ", "夏限定メニューのお知らせです"], ["2026/06/28 16:20", "LINE配信文", "整体院", "今月の空き状況について"], ["2026/06/27 11:10", "営業DM", "工務店", "施工事例のご案内です"]], "再利用"),
      cardsPage("/templates", "テンプレート", "FileText", "プロンプトテンプレート", "よく使う入力パターンを保存できます。", [["夏キャンペーン", "カフェ / Instagram投稿文 / 夏の限定メニュー", "標準"], ["再来店促進", "整体院 / LINE配信文 / 予約案内", "標準"], ["施工事例紹介", "工務店 / Googleビジネス投稿 / 施工写真", "標準"]], "テンプレート保存"),
      aboutPage("投稿文を考える時間を、ゼロにする。", ["毎日のSNS投稿ネタ切れ", "文章を考える時間がない", "同じような投稿になりがち"], ["条件入力だけで文章生成", "履歴から再利用", "テンプレートで運用を型化"]),
    ],
  };
}

function baseBusinessDemo(
  id: string,
  no: string,
  shortName: string,
  fullName: string,
  target: string,
  repo: string,
  catchCopy: string,
  problems: string[],
  pages: DemoPage[],
): DemoConfig {
  return {
    id,
    no,
    shortName,
    fullName,
    target,
    repo,
    banner: sampleBanner,
    pages: [
      ...pages,
      aboutPage(catchCopy, problems, ["入力を一元管理", "抜け漏れを一覧で確認", "履歴を残して改善に使う"]),
    ],
  };
}

function dashboard(
  titleOrPath: string,
  descriptionOrLabel: string,
  summariesOrIcon: string[][] | string,
  highlightsOrTitle: string[][] | string,
  defaultPath = "/",
): DemoPage {
  if (Array.isArray(summariesOrIcon)) {
    return {
      path: defaultPath,
      label: defaultPath === "/" ? "ダッシュボード" : descriptionOrLabel,
      icon: "LayoutDashboard",
      kind: "dashboard",
      title: titleOrPath,
      description: descriptionOrLabel,
      summaries: summariesOrIcon.map(([label, value], index) => ({ label, value, tone: index === 0 ? "coral" : index === 1 ? "turquoise" : undefined })),
      chart: chart7,
      highlights: (highlightsOrTitle as string[][]).map(([title, meta, status], index) => ({ title, meta, status, tone: index === 1 ? "coral" : index === 0 ? "turquoise" : undefined })),
    };
  }
  return {
    path: titleOrPath,
    label: descriptionOrLabel,
    icon: summariesOrIcon,
    kind: "dashboard",
    title: highlightsOrTitle as string,
    description: defaultPath,
    summaries: [],
  };
}

function tablePage(path: string, label: string, icon: string, title: string, description: string, columns: string[], rows: string[][], cta: string): DemoPage {
  return {
    path,
    label,
    icon,
    kind: "table",
    title,
    description,
    columns,
    rows: rows.map((row) => Object.fromEntries(columns.map((column, index) => [column, row[index] ?? ""]))),
    filters: ["全件", "未対応", "完了"],
    cta,
  };
}

function dashboardPage(path: string, label: string, icon: string, title: string, description: string, summaries: string[][], highlights: string[][]): DemoPage {
  return {
    path,
    label,
    icon,
    kind: "dashboard",
    title,
    description,
    summaries: summaries.map(([summaryLabel, value], index) => ({ label: summaryLabel, value, tone: index === 0 ? "coral" : index === 1 ? "turquoise" : undefined })),
    chart: chart7,
    highlights: highlights.map(([highlightTitle, meta, status], index) => ({ title: highlightTitle, meta, status, tone: index === 0 ? "turquoise" : index === 1 ? "coral" : undefined })),
  };
}

function cardsPage(path: string, label: string, icon: string, title: string, description: string, rows: string[][], cta: string): DemoPage {
  return {
    path,
    label,
    icon,
    kind: "cards",
    title,
    description,
    cards: rows.map(([title, meta, status], index) => ({ title, meta, status, tone: index === 0 ? "turquoise" : index === 1 ? "coral" : undefined })),
    cta,
  };
}

function calendarPage(path: string, label: string, icon: string, title: string, rows: string[][]): DemoPage {
  return {
    path,
    label,
    icon,
    kind: "calendar",
    title,
    description: "月表示カレンダーで日付ごとの件数を確認します。",
    highlights: rows.map(([title, meta, status], index) => ({ title, meta, status, tone: index === 0 ? "coral" : undefined })),
  };
}

function formPage(path: string, label: string, icon: string, title: string, description: string, fields: string[], cta: string): DemoPage {
  return { path, label, icon, kind: "form", title, description, formFields: fields, cta };
}

function aboutPage(catchCopy: string, problems: string[], solutions: string[], button = aboutButton): DemoPage {
  return {
    path: "/about",
    label: "サンプル紹介",
    icon: "Settings",
    kind: "about",
    title: "サンプル紹介",
    description: "導入イメージの紹介ページです。",
    about: about(catchCopy, problems, solutions, button),
  };
}
