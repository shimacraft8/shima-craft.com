import { Header } from "@/app/components/Header";
import { Hero } from "@/app/components/Hero";
import { About } from "@/app/components/About";
import { Service } from "@/app/components/Service";
import { Works } from "@/app/components/Works";
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
        <About />
        <Service />
        <Works />
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
