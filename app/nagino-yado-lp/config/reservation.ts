/**
 * 予約URL設定
 *
 * 実案件への切り替えは BOOKING_URL を変更するだけで完了します。
 * コンポーネント内に直接URLを書かないでください。
 */
export const reservationConfig = {
  // 実案件では ここを予約システムのURLに変更する
  bookingUrl: '/nagino-yado-lp/demo-booking',

  // 予約システム名（ボタンのaria-labelや注記に使用）
  systemName: '外部予約システム',

  // 予約ボタン周辺の注記
  externalNotice: 'これは制作サンプルです。実案件では既存の予約システムへ接続します。',

  // CTAボタン文言
  ctaLabel: '空室を確認する',
  ctaSubLabel: '公式サイトから予約する',

  // 固定CTAボタン文言（モバイル）
  stickyCtaLabel: '空室を確認する',
}
