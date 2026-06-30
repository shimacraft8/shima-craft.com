/**
 * 動画・画像のパス管理
 *
 * Higgsfieldで生成した素材のパスを一元管理します。
 * ファイルを差し替える際はここを変更するだけで全コンポーネントに反映されます。
 */
export const mediaAssets = {
  hero: {
    video: '/nagino-yado/videos/scene-a-approach.mp4',
    poster: '/nagino-yado/hero-poster.jpg',
    alt: '緑の植物の小道の先に佇む凪ノ宿 AMAMIのヴィラ外観',
  },
  interior: {
    video: '/nagino-yado/videos/scene-b-interior.mp4',
    poster: '/nagino-yado/interior-poster.jpg',
    alt: 'テラスから室内へと続く開放的な空間',
  },
  evening: {
    video: '/nagino-yado/videos/scene-c-evening.mp4',
    poster: '/nagino-yado/evening-poster.jpg',
    alt: '夕暮れ時の静かなテラスと差し込む光',
  },
  gallery: {
    bedroom: {
      src: '/nagino-yado/bedroom.jpg',
      alt: '落ち着いたクイーンサイズのベッドルーム。木の家具と柔らかな光',
    },
    kitchen: {
      src: '/nagino-yado/kitchen.jpg',
      alt: '清潔感のあるキッチン。IHコンロと調理器具が揃う',
    },
    terrace: {
      src: '/nagino-yado/terrace.jpg',
      alt: 'ウッドデッキのテラス。チェアとテーブルでゆっくり過ごせる',
    },
    bathroom: {
      src: '/nagino-yado/bathroom.jpg',
      alt: 'バスタブとシャワーを備えたゆとりあるバスルーム',
    },
    quiet: {
      src: '/nagino-yado/quiet-moment.jpg',
      alt: '宿の静かな一角。午後の光が差し込む様子',
    },
  },
  ogp: '/nagino-yado/ogp.jpg',
}
