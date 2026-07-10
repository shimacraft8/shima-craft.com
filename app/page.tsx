import { Header } from "@/app/components/Header";
import { Hero } from "@/app/components/Hero";
import { Problems } from "@/app/components/Problems";
import { About } from "@/app/components/About";
import { Service } from "@/app/components/Service";
import { SampleHighlights } from "@/app/components/SampleHighlights";
import { Works } from "@/app/components/Works";
import { LatestArticles } from "@/app/components/LatestArticles";
import { Flow } from "@/app/components/Flow";
import { Price } from "@/app/components/Price";
import { Faq } from "@/app/components/Faq";
import { Contact } from "@/app/components/Contact";
import { Footer } from "@/app/components/Footer";
import { StickyContact } from "@/app/components/StickyContact";
import { IntroOverlay } from "@/app/components/IntroOverlay";

export default function Home() {
  return (
    <>
      <IntroOverlay />
      <Header />
      <main>
        <Hero />
        <Problems />
        <Service />
        <About />
        <SampleHighlights />
        <Works />
        <LatestArticles />
        <Flow />
        <Price />
        <Faq />
        <Contact />
      </main>
      <Footer />
      <StickyContact />
    </>
  );
}
