"use client";

import { useCallback, useEffect, useRef } from "react";
import { on, emit } from "@/lib/site-events";
import ContactForm from "@/components/ContactForm";

export default function ContactModal() {
  const modalRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const unsubOpen = on("modal:open", () => {
      document.body.classList.add("contact-modal-open");
    });
    const unsubClose = on("modal:close", () => {
      document.body.classList.remove("contact-modal-open");
    });
    return () => {
      unsubOpen();
      unsubClose();
    };
  }, []);

  const close = useCallback(() => {
    document.body.classList.remove("contact-modal-open");
    emit("modal:close");
  }, []);

  const handleBackdrop = useCallback(
    (e: React.MouseEvent) => {
      if (e.target === modalRef.current || e.target === document.getElementById("contact-modal-container")) {
        close();
      }
    },
    [close]
  );

  return (
    <div ref={modalRef} className="contact-modal" id="contact-modal" onClick={handleBackdrop}>
      <div className="close" onClick={close}>
        <img src="/images/icons/close.svg" alt="close" />
      </div>
      <div className="container" id="contact-modal-container">
        <div className="contact-form-wrapper">
          <div className="contact-form d-flex">
            <ContactForm className="d-flex" />
          </div>
        </div>
      </div>
    </div>
  );
}
