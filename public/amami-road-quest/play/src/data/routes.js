export const ROUTES = [
  {
    id: 'airport-ayamaru',
    code: 'QUEST 01',
    title: '空港から海の絶景へ',
    shortTitle: '奄美空港 → あやまる岬',
    subtitle: '北部の海岸ルートを予習',
    icon: '🌊',
    difficulty: 1,
    duration: '約3分',
    theme: ['#72d2df', '#1f8d82'],
    scene: 'coast',
    titleEarned: '北部ルートの冒険者',
    waypoints: [
      [28.43060, 129.71300], [28.43520, 129.71600], [28.44230, 129.71860],
      [28.45020, 129.72160], [28.45960, 129.72330], [28.46840, 129.72210], [28.47340, 129.72020]
    ],
    checkpoints: [
      { progress: .20, title: '空港エリアを出発', description: 'ここから北部の海沿いへ向かいます。周囲の交通に注意して進みましょう。', icon: '✈️', points: 100 },
      { progress: .48, title: '海岸ルートに接近', description: '景色が開ける区間です。実際の運転では景色に気を取られず、安全を優先してください。', icon: '🌴', points: 150 },
      { progress: .76, title: '目的地の入口を確認', description: 'ゴールが近づきました。駐車場や入口の位置を事前に確認しておくと安心です。', icon: '📍', points: 200 }
    ],
    quiz: {
      progress: .61,
      question: '旅行前のルート予習で、最も大切なのは？',
      choices: ['景色だけを覚える', '曲がり角・入口・安全上の注意を確認する', '最短時間だけを見る'],
      correct: 1,
      explanation: '正解！ 実際の道で迷いやすい分岐や入口、安全上の注意を確認することが重要です。',
      points: 200
    }
  },
  {
    id: 'airport-amami-park',
    code: 'QUEST 02',
    title: '島文化へのファーストクエスト',
    shortTitle: '奄美空港 → 奄美パーク',
    subtitle: '到着後の短時間ルート',
    icon: '🎨',
    difficulty: 1,
    duration: '約2分',
    theme: ['#f7c75e', '#f27963'],
    scene: 'field',
    titleEarned: '島文化の入口を知る者',
    waypoints: [
      [28.43060,129.71300], [28.42780,129.70720], [28.42370,129.70130],
      [28.41910,129.69630], [28.41460,129.69140]
    ],
    checkpoints: [
      { progress: .24, title: '空港を離れました', description: '短いルートでも、出口と最初の分岐を知っておくと到着直後の不安が減ります。', icon: '🧭', points: 100 },
      { progress: .54, title: '中間地点を通過', description: '現在地と進行方向を地図で照らし合わせてみましょう。', icon: '🗺️', points: 150 },
      { progress: .82, title: 'ゴール周辺です', description: '目的地名だけでなく、実際の入口位置も確認しましょう。', icon: '🏁', points: 200 }
    ],
    quiz: {
      progress: .67,
      question: '到着直後の移動で確認しておくと安心なのは？',
      choices: ['出口直後の分岐', 'SNSの投稿数', 'お土産の価格だけ'],
      correct: 0,
      explanation: '正解！ 最初の分岐を把握しておくと、慣れない土地でも落ち着いて移動できます。',
      points: 200
    }
  },
  {
    id: 'airport-naze',
    code: 'QUEST 03',
    title: '北部から名瀬へロングドライブ',
    shortTitle: '奄美空港 → 名瀬市街地',
    subtitle: '島の主要移動を体験',
    icon: '🚙',
    difficulty: 2,
    duration: '約5分',
    theme: ['#5da6c9', '#0d5b55'],
    scene: 'mountain',
    titleEarned: '島縦断ドライバー',
    waypoints: [
      [28.43060,129.71300], [28.41700,129.68600], [28.40500,129.65700],
      [28.39400,129.62300], [28.38600,129.59000], [28.38100,129.55500],
      [28.37750,129.52600], [28.38100,129.50100]
    ],
    checkpoints: [
      { progress: .18, title: '北部エリアを進行中', description: '長距離ルートでは、休憩候補と残り時間も確認しておきましょう。', icon: '☀️', points: 100 },
      { progress: .49, title: 'ルートの中間地点', description: 'カーブが続く想定の区間です。実走時は速度を抑え、前方を確認してください。', icon: '⛰️', points: 180 },
      { progress: .80, title: '市街地が近づきました', description: '交通量や交差点が増えるため、案内表示を落ち着いて確認しましょう。', icon: '🏙️', points: 220 }
    ],
    quiz: {
      progress: .63,
      question: '長距離ルートを事前確認するとき、追加で見るべきものは？',
      choices: ['休憩候補と所要時間', '写真映えだけ', '目的地名の読み方だけ'],
      correct: 0,
      explanation: '正解！ 距離が長いほど、休憩場所や到着時間の見通しが大切です。',
      points: 250
    }
  },
  {
    id: 'naze-mangrove',
    code: 'QUEST 04',
    title: '名瀬から南の自然へ',
    shortTitle: '名瀬 → マングローブ周辺',
    subtitle: '山と川へ向かうルート',
    icon: '🛶',
    difficulty: 2,
    duration: '約4分',
    theme: ['#61b67a', '#0d5b55'],
    scene: 'forest',
    titleEarned: 'マングローブへの旅人',
    waypoints: [
      [28.38100,129.50100], [28.35300,129.48700], [28.32600,129.47200],
      [28.29800,129.46100], [28.26900,129.45200], [28.24000,129.44500], [28.21800,129.44400]
    ],
    checkpoints: [
      { progress: .21, title: '市街地を離れます', description: '市街地から自然の多いエリアへ。通信状況や帰路も意識しておきましょう。', icon: '🌿', points: 100 },
      { progress: .52, title: '自然エリアを進行中', description: '野生生物や地域の暮らしに配慮し、実走時は静かな運転を心がけましょう。', icon: '🐦', points: 180 },
      { progress: .79, title: 'ゴールが近づきました', description: '集合場所がある場合は、施設名だけでなく受付位置まで確認してください。', icon: '🛶', points: 220 }
    ],
    quiz: {
      progress: .65,
      question: '自然の多い地域を通るときの行動として適切なのは？',
      choices: ['野生動物を追いかける', '速度を抑え周囲に配慮する', '好きな場所に停車する'],
      correct: 1,
      explanation: '正解！ 自然と地域の暮らしに配慮し、安全な速度で移動しましょう。',
      points: 250
    }
  },
  {
    id: 'naze-koniya',
    code: 'QUEST 05',
    title: '南部の港町を目指せ',
    shortTitle: '名瀬 → 古仁屋',
    subtitle: '島南部へのチャレンジ',
    icon: '⛴️',
    difficulty: 3,
    duration: '約6分',
    theme: ['#7867a8', '#1d7185'],
    scene: 'harbor',
    titleEarned: '南部ルートマスター',
    waypoints: [
      [28.38100,129.50100], [28.34300,129.48100], [28.30200,129.46200],
      [28.26300,129.44300], [28.22400,129.42000], [28.19100,129.38900],
      [28.16600,129.34900], [28.14600,129.30900]
    ],
    checkpoints: [
      { progress: .17, title: '南部への旅が始まりました', description: '長いルートです。出発前に燃料・休憩・帰着時刻を確認しましょう。', icon: '🧳', points: 120 },
      { progress: .50, title: '島の中盤を通過', description: '天候が変わった場合に備え、無理をしない代替プランも考えておきましょう。', icon: '🌦️', points: 200 },
      { progress: .82, title: '港町が近づきました', description: '船を利用する場合は、乗り場・受付・出発時刻を公式情報で再確認してください。', icon: '⚓', points: 250 }
    ],
    quiz: {
      progress: .66,
      question: '船などの出発時刻がある旅程で、最後に確認するべき情報は？',
      choices: ['昔のブログ記事', '公式の最新運航情報', '写真の人気順'],
      correct: 1,
      explanation: '正解！ 運航状況や時刻は変わる可能性があるため、必ず公式の最新情報を確認します。',
      points: 300
    }
  }
];

export function getRouteById(id) {
  return ROUTES.find((route) => route.id === id) ?? ROUTES[0];
}
