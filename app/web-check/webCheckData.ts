// Web導線かんたんチェック — 質問・カテゴリー・結果文の定義

export type AnswerValue = "yes" | "no" | "unknown";
export type CategoryKey = "information" | "conversion" | "website" | "operations";

export interface Question {
  id: number;
  text: string;
  category: CategoryKey;
}

export interface CategoryResult {
  heading: string;
  state: string;
  improvements: string[];
  approach: string;
  doNow: string;
}

export interface DiagnosisResult {
  primary: CategoryKey | "none";
  secondary: CategoryKey | null;
  primaryResult: CategoryResult | null;
  secondaryResult: CategoryResult | null;
  connectorText: string | null;
  isAllZero: boolean;
  zeroResult: CategoryResult;
}

// 8問の質問定義
export const QUESTIONS: Question[] = [
  {
    id: 1,
    text: "料金、営業時間、サービス内容などの情報が、ホームページ・Instagram・Googleマップなど複数の場所に分かれていますか？",
    category: "information",
  },
  {
    id: 2,
    text: "お客さまから、料金・場所・営業時間・持ち物など、同じ質問を繰り返し受けることがありますか？",
    category: "information",
  },
  {
    id: 3,
    text: "お客さまが、予約や問い合わせの方法に迷っていると感じることがありますか？",
    category: "conversion",
  },
  {
    id: 4,
    text: "InstagramやGoogleマップを見た後、次にどこへ進めばよいか分かりにくい状態ですか？",
    category: "conversion",
  },
  {
    id: 5,
    text: "現在のホームページは、スマートフォンで見づらい、または必要な情報を探しにくいと感じますか？",
    category: "website",
  },
  {
    id: 6,
    text: "現在のホームページに、古い情報や今の事業内容と合っていない部分がありますか？",
    category: "website",
  },
  {
    id: 7,
    text: "予約や問い合わせを、電話・DM・メール・紙など複数の方法で管理していますか？",
    category: "operations",
  },
  {
    id: 8,
    text: "問い合わせの対応状況や顧客情報を、担当者間で共有しにくいことがありますか？",
    category: "operations",
  },
];

// カテゴリー表示名
export const CATEGORY_NAMES: Record<CategoryKey, string> = {
  information: "掲載情報の整理",
  conversion: "問い合わせまでの導線",
  website: "ホームページの見やすさ",
  operations: "予約・問い合わせ管理",
};

// 同点時の優先順位（低インデックスが高優先）
export const CATEGORY_PRIORITY: CategoryKey[] = [
  "conversion",
  "information",
  "website",
  "operations",
];

// カテゴリーごとの結果文
export const CATEGORY_RESULTS: Record<CategoryKey, CategoryResult> = {
  information: {
    heading: "掲載情報を整理することを優先するとよさそうです",
    state:
      "料金、営業時間、サービス内容などが複数の場所に分かれているため、お客さまが必要な情報を探しにくくなっている可能性があります。",
    improvements: [
      "料金・営業時間・サービス内容を一か所にまとめる",
      "古い情報や重複した情報を整理する",
      "よくある質問を掲載する",
    ],
    approach:
      "まずは掲載する情報を整理し、必要な内容をまとめたホームページや案内ページを整える方法があります。",
    doNow:
      "ホームページ、Instagram、Googleマップに掲載している営業時間・料金・問い合わせ先が一致しているか確認してみてください。",
  },
  conversion: {
    heading: "問い合わせまでの流れを整えることを優先するとよさそうです",
    state:
      "サービスに興味を持っても、予約や問い合わせの方法が分かりにくく、途中で離れてしまう可能性があります。",
    improvements: [
      "問い合わせボタンや連絡先を見つけやすくする",
      "予約・問い合わせ方法を一か所にまとめる",
      "InstagramやGoogleマップから案内ページへつなぐ",
    ],
    approach:
      "ホームページ全体を作り直す前に、問い合わせページやフォーム、案内の流れを整える方法があります。",
    doNow:
      "初めて訪れた人の目線で、InstagramやGoogleマップから問い合わせ先まで迷わず進めるか確認してみてください。",
  },
  website: {
    heading: "現在のホームページを見直すタイミングかもしれません",
    state:
      "スマートフォンでの読みづらさや、古い情報、必要な情報の探しにくさが、サービス理解や問い合わせの妨げになっている可能性があります。",
    improvements: [
      "スマートフォンでの表示を確認する",
      "情報の順番やメニューを整理する",
      "古い内容や不要なページを見直す",
    ],
    approach:
      "全面リニューアルだけでなく、トップページや問い合わせ周辺を優先して改修する方法もあります。",
    doNow:
      "自分のホームページをスマートフォンで開き、料金・営業時間・問い合わせ先を30秒以内に見つけられるか確認してみてください。",
  },
  operations: {
    heading: "予約や問い合わせの管理方法も整理するとよさそうです",
    state:
      "受付方法や顧客情報が複数の場所に分かれているため、確認漏れや対応状況の把握が難しくなっている可能性があります。",
    improvements: [
      "問い合わせの受付窓口を整理する",
      "必要な内容を決まった形式で受け取る",
      "対応状況や履歴を確認できるようにする",
    ],
    approach:
      "まずは問い合わせフォームとメール通知から始め、必要に応じて予約や顧客管理の仕組みを検討する方法があります。",
    doNow:
      "現在の問い合わせ方法をすべて書き出し、どこで受け付け、誰が確認し、どこへ記録しているか整理してみてください。",
  },
};

// 全0点の場合の専用結果
export const ZERO_RESULT: CategoryResult = {
  heading: "現在の情報発信や導線に、大きな困りごとは少なそうです",
  state:
    "今回の回答では、大きな課題は見つかりませんでした。情報が古くなっていないか、問い合わせ方法が分かりやすいかを定期的に確認すると安心です。",
  improvements: [],
  approach: "",
  doNow:
    "ホームページ、Instagram、Googleマップに掲載している営業時間・料金・問い合わせ先が一致しているか確認してみてください。",
};

// 主結果×副結果 の組み合わせ補足文（12パターン）
export const COMBO_TEXT: Partial<Record<string, string>> = {
  information_conversion:
    "料金やサービス内容が分かりにくいことで、お客さまが問い合わせ方法を探すところまで進みにくくなっている可能性があります。",
  information_website:
    "情報が複数の場所に分散していることに加え、ホームページ自体の見やすさも影響している可能性があります。",
  information_operations:
    "情報整理と同時に、問い合わせを受け取る仕組みもあわせて見直すと、対応がスムーズになりやすくなります。",
  conversion_information:
    "InstagramやGoogleマップで興味を持ってもらえても、料金やサービス内容、問い合わせ方法を確認する場所が分かりにくくなっている可能性があります。",
  conversion_website:
    "問い合わせまでの流れが分かりにくいことに加え、ホームページ自体の見やすさも見直すことで改善につながりやすくなります。",
  conversion_operations:
    "問い合わせへの入口を整えながら、受け取った問い合わせをスムーズに管理できる仕組みも検討するとよさそうです。",
  website_information:
    "ホームページを見直す際に、掲載する情報の整理もあわせて行うと、探しやすく伝わりやすいページになりやすくなります。",
  website_conversion:
    "ホームページの見やすさを改善しながら、問い合わせまでの流れも整えることで、行動につながりやすくなります。",
  website_operations:
    "ホームページを整備しながら、問い合わせや予約の受付・管理方法もあわせて見直すとよさそうです。",
  operations_information:
    "受け取った問い合わせを管理しやすくしながら、掲載情報を整理することで、問い合わせ前の疑問も減らしやすくなります。",
  operations_conversion:
    "管理方法を整えるとともに、問い合わせへの導線もあわせて見直すと、対応の手間が減りやすくなります。",
  operations_website:
    "問い合わせ管理の改善とあわせて、ホームページの見やすさも見直すと、問い合わせ前の理解が深まりやすくなります。",
};
