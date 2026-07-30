"use client";

import { useEffect, useRef } from "react";
import { gsap, ScrollTrigger } from "@/lib/gsap";
import { TitleChars, PChars } from "@/lib/split-text";
import { emit } from "@/lib/site-events";
import ContactForm from "@/components/ContactForm";
import Swiper from "swiper";
import { Autoplay } from "swiper/modules";
import "swiper/css";

const exportWords = [
  "Textiles",
  "Pharmaceuticals",
  "Marble & Stone",
  "Agriculture & Food",
  "Engineering",
  "Jewellery",
  "Software & AI",
  "Design & Branding",
];

export default function ContactSection() {
  const swiperRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    // Brand logo marquee Swiper. Loop mode reorders the slide DOM nodes, which
    // React owns — the instance MUST be destroyed on unmount so the original
    // order is restored before React removes them, or unmounting the homepage
    // throws removeChild DOMExceptions and kills client-side navigation.
    const el = swiperRef.current?.querySelector(".swiper") as HTMLElement | null;
    let swiper: Swiper | undefined;
    if (el) {
      swiper = new Swiper(el, {
        modules: [Autoplay],
        speed: 5000,
        loop: true,
        autoplay: { delay: 0, disableOnInteraction: false },
        breakpoints: {
          320: { slidesPerView: 2, spaceBetween: 20 },
          767: { slidesPerView: 3.2, spaceBetween: 30 },
          1400: { slidesPerView: 3.2, spaceBetween: 60 },
          1921: { slidesPerView: 4.2, spaceBetween: 60 },
        },
      });
    }

    const ctx = gsap.context(() => {
      // Brands entrance
      gsap.fromTo(
        ".hp-contact-section .brands h2",
        { scale: 0.94 },
        { scale: 1, duration: 2.4, ease: "power3.out", scrollTrigger: { trigger: ".hp-contact-section .container .brands" } }
      );
      gsap.fromTo(
        ".hp-contact-section .brands .word_inner",
        { opacity: 0, filter: "blur(6px)" },
        { opacity: 1, filter: "blur(0px)", stagger: 0.04, scrollTrigger: { trigger: ".hp-contact-section .container .brands" } }
      );

      // Contact section entrance
      gsap.fromTo(
        ".hp-contact-section .contact h4",
        { scale: 0.94 },
        { scale: 1, duration: 2.4, ease: "power3.out", scrollTrigger: { trigger: ".hp-contact-section .container .contact" } }
      );
      gsap.fromTo(
        ".hp-contact-section .contact .p_inner",
        { opacity: 0 },
        { opacity: 1, delay: 0.2, stagger: 0.02, duration: 0.5, scrollTrigger: { trigger: ".hp-contact-section .container .contact" } }
      );

      // Left-text parallax
      if (window.innerWidth > 767) {
        gsap.fromTo(
          ".hp-contact-section .left-text-wrapper .left-text .top",
          { x: 80 },
          { x: 0, scrollTrigger: { trigger: ".hp-contact-section .container .contact", scrub: true } }
        );
        gsap.fromTo(
          ".hp-contact-section .left-text-wrapper .left-text > .left-side-title",
          { x: -80 },
          { x: 0, scrollTrigger: { trigger: ".hp-contact-section .container .contact", scrub: true } }
        );
      }

      ScrollTrigger.refresh();
    });

    return () => {
      swiper?.destroy(true, true);
      ctx.revert();
    };
  }, []);

  return (
    <section className="hp-contact-section">
      <div className="container">
        <div className="brands d-flex">
          <h2 className="title-anim">
            <TitleChars text="What We Export to the World" />
          </h2>
          <div ref={swiperRef} className="swiper swiper-2">
            <div className="swiper-wrapper">
              {[...exportWords, ...exportWords].map((word, i) => (
                <div key={i} className="swiper-slide">
                  <span className="marquee-word">{word}</span>
                </div>
              ))}
            </div>
          </div>
        </div>

        <div className="contact">
          <div className="left-text-wrapper">
            <div className="left-text">
              <div className="top">
                <div className="line" />
                <div className="left-side-title">Get</div>
              </div>
              <div className="left-side-title">In Touch</div>
            </div>
          </div>
          <div className="row d-flex">
            <div className="left">
              <div className="contact-form d-flex">
                <ContactForm className="d-flex" redirectOnSuccess />
              </div>
            </div>
            <div className="information d-flex">
              <h4 className="p-anim">
                <PChars text="Schedule A Strategy Call With Our Global Business Team" />
              </h4>
              <div className="line" />
              <button className="primary-button style-2 action calendly-open" type="button" onClick={() => emit("modal:open")}>
                <div className="d-flex">
                  <div className="img d-flex">
                    <img src="/images/icons/book-call.svg" alt="book-call" />
                  </div>
                  <span>Book Strategy Call</span>
                  <div className="arrow">
                    <img src="/images/icons/arrow-right.svg" alt="" />
                  </div>
                </div>
              </button>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
