"use client";

import { useEffect, useRef } from "react";
import { ShieldAlert } from "lucide-react";

export const LANDING_DISCLAIMER_SESSION_KEY = "wakeely-landing-disclaimer-accepted-v1";

interface LandingDisclaimerGateProps {
  onAccept: () => void;
  onDecline: () => void;
}

export function LandingDisclaimerGate({ onAccept, onDecline }: LandingDisclaimerGateProps) {
  const acceptRef = useRef<HTMLButtonElement>(null);

  useEffect(() => {
    acceptRef.current?.focus();
  }, []);

  return (
    <main className="landing-disclaimer-gate" dir="rtl" lang="ar" aria-labelledby="landing-disclaimer-title">
      <section className="landing-disclaimer-card" role="dialog" aria-modal="true" aria-describedby="landing-disclaimer-copy">
        <div className="landing-disclaimer-icon" aria-hidden="true"><ShieldAlert size={28} /></div>

        <div className="landing-disclaimer-language landing-disclaimer-language--ar">
          <p className="landing-disclaimer-kicker">تنبيه قانوني قبل الدخول</p>
          <h1 id="landing-disclaimer-title">تنبيه مهم</h1>
          <div id="landing-disclaimer-copy" className="landing-disclaimer-copy">
            <p>هذه المنصة منصة تقنية وليست مكتب محاماة ولا تقدم خدمات أو استشارات قانونية. جميع الخدمات القانونية يتم تقديمها حصراً من خلال محامين مستقلين مرخّصين.</p>
            <p>استخدامك للمنصة أو أدوات الذكاء الاصطناعي فيها لا يجعلك موكلاً لدى المنصة ولا ينشئ علاقة محامٍ وموكل معها. وعند اختيار محامٍ وتكليفه، تكون أي علاقة مهنية أو قانونية بينك وبين المحامي مباشرة وبموجب شروط وأحكام التكليف المبرمة بينكما.</p>
            <p>الذكاء الاصطناعي في المنصة هو أداة تقنية مساعدة، وليس محامياً ولا بديلاً عن المحامي.</p>
          </div>
          <div className="landing-disclaimer-actions">
            <button ref={acceptRef} type="button" className="landing-disclaimer-accept" onClick={onAccept}>أوافق وأتابع</button>
            <button type="button" className="landing-disclaimer-decline" onClick={onDecline}>لا أوافق والخروج</button>
          </div>
        </div>

        <div className="landing-disclaimer-divider" aria-hidden="true"><span>English</span></div>

        <div className="landing-disclaimer-language landing-disclaimer-language--en" dir="ltr" lang="en">
          <p className="landing-disclaimer-kicker">Legal notice before entering</p>
          <h2>Important notice</h2>
          <div className="landing-disclaimer-copy">
            <p>This platform is a technology platform, not a law firm, and does not provide legal services or legal advice. All legal services are provided exclusively by independent, licensed lawyers.</p>
            <p>Using the platform or its AI tools does not make you a client of the platform and does not create a lawyer–client relationship with it. When you choose and instruct a lawyer, any professional or legal relationship is directly between you and that lawyer under the engagement terms agreed between you.</p>
            <p>The AI on this platform is a technical support tool. It is not a lawyer and is not a substitute for a lawyer.</p>
          </div>
          <div className="landing-disclaimer-actions">
            <button type="button" className="landing-disclaimer-accept" onClick={onAccept}>I agree and continue</button>
            <button type="button" className="landing-disclaimer-decline" onClick={onDecline}>I do not agree — Exit</button>
          </div>
        </div>
      </section>
    </main>
  );
}
