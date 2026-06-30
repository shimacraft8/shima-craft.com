import { siteConfig } from '../config/site'
import { planConfig } from '../config/plan'

export default function PlanIntroduction() {
  return (
    <section id="plan" className="bg-[#F7F5F0] section-padding">
      <div className="max-w-2xl mx-auto">
        {/* ラベル */}
        <p className="section-subtitle mb-4">About this plan</p>

        {/* タイトル */}
        <h2 className="section-title mb-8 text-[#1E3F3F]">
          なぜ、{planConfig.nights}泊{planConfig.days}日なのか。
        </h2>

        {/* 本文 */}
        <div className="space-y-5 text-[#6B6460] leading-relaxed font-sans text-[15px]">
          <p>
            1泊では、島に着いた頃にはもう帰る準備が始まります。<br />
            観光スポットを急ぎ足で回って、写真を撮って、宿に戻る。
          </p>
          <p>
            でも、{planConfig.nights}泊{planConfig.days}日あると少し違います。
          </p>
          <p>
            翌日も宿にいられると分かると、人は自然と力が抜けます。<br />
            朝をゆっくり過ごせる。昼は気が向いた場所に行ける。<br />
            夕方は、ただテラスにいるだけでいい。
          </p>
          <p className="text-[#2A2A2A] font-medium text-base">
            このプランは「観光地を効率よく巡る旅」ではありません。<br />
            島に暮らすように、{planConfig.nights}泊{planConfig.days}日を過ごす体験です。
          </p>
        </div>

        {/* こんな方に */}
        <div className="mt-10 pt-8 border-t border-[#E8DDD0]">
          <p className="text-xs tracking-widest text-[#6B6460] uppercase mb-5 font-sans">
            こんな方に向いています
          </p>
          <ul className="space-y-3 font-sans text-[14px] text-[#6B6460]">
            {[
              '予定を詰め込まず、ゆっくり過ごしたいカップル・夫婦',
              '観光よりも「その場所に居ること」を楽しみたい方',
              '旅行疲れを感じるようになった、都市部在住の20〜40代',
              '一棟貸しで、他のゲストを気にせず過ごしたい方',
              '普通のホテルや旅館では満たされなくなってきた方',
            ].map((item, i) => (
              <li key={i} className="flex items-start gap-3">
                <span className="mt-1.5 w-1 h-1 rounded-full bg-[#2D5A5A] flex-shrink-0" aria-hidden />
                <span>{item}</span>
              </li>
            ))}
          </ul>
        </div>

        {/* 公式予約限定バッジ */}
        <div className="mt-10 inline-flex items-center gap-2 bg-[#2D5A5A]/10 border border-[#2D5A5A]/30 px-5 py-3">
          <span className="w-2 h-2 rounded-full bg-[#2D5A5A] flex-shrink-0" aria-hidden />
          <p className="text-[#2D5A5A] text-sm font-sans font-medium tracking-wide">
            このプランは{siteConfig.name}公式予約のみでご利用いただけます
          </p>
        </div>
      </div>
    </section>
  )
}
