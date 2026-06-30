import DemoNotice from './components/DemoNotice'
import HeroExperience from './components/HeroExperience'
import PlanIntroduction from './components/PlanIntroduction'
import InteriorExperience from './components/InteriorExperience'
import FacilityGallery from './components/FacilityGallery'
import StayTimeline from './components/StayTimeline'
import BookingBenefits from './components/BookingBenefits'
import PricingSection from './components/PricingSection'
import TestimonialSection from './components/TestimonialSection'
import AccessSection from './components/AccessSection'
import FaqSection from './components/FaqSection'
import FinalReservationCta from './components/FinalReservationCta'
import SiteFooter from './components/SiteFooter'
import StickyReservationButton from './components/StickyReservationButton'

export default function NaginoYadoPage() {
  return (
    <main>
      {/* デモ表記バナー（常に最上部） */}
      <DemoNotice />

      {/* 1. ヒーロー体験 */}
      <HeroExperience />

      {/* 2. プラン概要 */}
      <PlanIntroduction />

      {/* 3. 宿へ入る体験（Scene B） */}
      <InteriorExperience />

      {/* 4. 客室と設備 */}
      <FacilityGallery />

      {/* 5. 2泊3日の過ごし方 */}
      <StayTimeline />

      {/* 6. 公式予約限定特典（Scene C） */}
      <BookingBenefits />

      {/* 7. 料金 */}
      <PricingSection />

      {/* 8. 滞在者の声 */}
      <TestimonialSection />

      {/* 9. アクセス */}
      <AccessSection />

      {/* 10. FAQ */}
      <FaqSection />

      {/* 11. 最終CTA */}
      <FinalReservationCta />

      {/* 12. フッター */}
      <SiteFooter />

      {/* モバイル固定CTA（画面下部） */}
      <StickyReservationButton finalCtaId="final-cta" />
    </main>
  )
}
