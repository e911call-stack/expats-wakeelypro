"use client";

import { useEffect, useRef } from "react";
import { ShieldAlert } from "lucide-react";

export const LANDING_DISCLAIMER_SESSION_KEY = "wakeely-landing-disclaimer-accepted-v1";

interface LandingDisclaimerGateProps {
  onAccept: () => void;
}

export function LandingDisclaimerGate({ onAccept }: LandingDisclaimerGateProps) {
  const acceptRef = useRef<HTMLButtonElement>(null);

  useEffect(() => {
    acceptRef.current?.focus();
  }, []);

  return (
    <main className="landing-disclaimer-gate" dir="rtl" lang="ar" aria-labelledby="landing-disclaimer-title">
      <section className="landing-disclaimer-card" role="dialog" aria-modal="true" aria-describedby="landing-disclaimer-copy">
        <div className="landing-disclaimer-icon" aria-hidden="true"><ShieldAlert size={28} /></div>
        <p className="landing-disclaimer-kicker">تنبيه قانوني قبل الدخول</p>
        <h1 id="landing-disclaimer-title">تنبيه مهم</h1>
        <div id="landing-disclaimer-copy" className="landing-disclaimer-copy">
          <p>هذه المنصة منصة تقنية وليست مكتب محاماة ولا تقدم خدمات أو استشارات قانونية. جميع الخدمات القانونية يتم تقديمها حصراً من خلال محامين مستقلين مرخّصين.</p>
          <p>استخدامك للمنصة أو أدوات الذكاء الاصطناعي فيها لا يجعلك موكلاً لدى المنصة ولا ينشئ علاقة محامٍ وموكل معها. وعند اختيار محامٍ وتكليفه، تكون أي علاقة مهنية أو قانونية بينك وبين المحامي مباشرة وبموجب شروط وأحكام التكليف المبرمة بينكما.</p>
          <p>الذكاء الاصطناعي في المنصة هو أداة تقنية مساعدة، وليس محامياً ولا بديلاً عن المحامي.</p>
        </div>
        <button ref={acceptRef} type="button" className="landing-disclaimer-accept" onClick={onAccept}>
          أوافق وأتابع
        </button>
      </section>
    </main>
  );
}
