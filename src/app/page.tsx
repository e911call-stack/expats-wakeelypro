/* Style reminder: Route Atlas — Arabic-first bilingual service design, paper white, charcoal, Wakeely Route Green, numbered route spine. */
"use client";

import { useEffect, useRef, useState } from "react";
import {
  ArrowDownLeft,
  ArrowDownRight,
  ArrowLeft,
  ArrowRight,
  ArrowUpRight,
  Check,
  ChevronDown,
  FileCheck2,
  FileText,
  Globe2,
  Languages,
  Landmark,
  Menu,
  Moon,
  MessageCircle,
  Pause,
  Play,
  Scale,
  ShieldCheck,
  Sparkles,
  Sun,
  UserRound,
  X,
} from "lucide-react";
import { LandingDisclaimerGate, LANDING_DISCLAIMER_SESSION_KEY } from "@/components/landing-disclaimer-gate";

const markAsset = "/expat-legal-services-logo.png";
const heroAsset = "/manus-storage/wakeely-hero-editorial.svg";
const servicesAsset = "/manus-storage/wakeely-services.svg";
const bridgeAsset = "/manus-storage/wakeely-bridge.svg";
const routeAsset = "/legal-journey-arabic-infographic.webp";
const sitePath = (path: string) => path;

type Language = "ar" | "en";

const text = {
  ar: {
    brand: "خدمات المغتربين القانونية",
    englishBrand: "Jordan Remote Legal Services",
    navHome: "الرئيسية",
    navServices: "الخدمات",
    navMatters: "قضاياي",
    signIn: "تسجيل الدخول",
    switchTo: "EN",
    phase: "إصدار Phase 1 — تجريبي",
    themeDark: "الوضع الداكن",
    themeLight: "الوضع الفاتح",
    heroTitle: <>أنجز معاملاتك القانونية في <span>الأردن</span> من أي مكان في العالم</>,
    heroBody: "توجيه ذكي ثلاثي الخطوات: أين أنت؟ ما حالتك؟ ماذا تحتاج؟ — ثم قائمة مستندات، حكم على أهلية الإنجاز عن بُعد، مطابقة مع محامٍ موثوق، وملف قضية متكامل مع المهام والجدول الزمني والرسائل والمدفوعات.",
    primary: "أحتاج لإنجاز معاملة في الأردن",
    browse: "تصفح الخدمات",
    demoHint: "تسجيل الدخول عبر زر «تسجيل الدخول» بأحد الحسابات التجريبية في الأعلى.",
    ai: "مدعوم بالذكاء الاصطناعي + محامين مرخصين",
    bilingual: "ثنائي اللغة (عربي/إنجليزي)",
    catalog: "لا اختراع للخدمات — كتالوج صريح",
    routeKicker: "التدفق الكامل",
    routeSub: "من التوجيه إلى التسليم",
    where: "أين أنت؟",
    situation: "ما حالتك؟",
    need: "ماذا تحتاج؟",
    recommendation: "توصية",
    caseFile: "ملف قضية",
    routeHints: [
      "حدد البلد الذي تقيم فيه حتى نعرض لك مساراً يناسب موقعك الحالي.",
      "صف وضعك القانوني باختصار لنفهم نقطة البداية والقيود المحتملة.",
      "اختر المعاملة التي تريد إنجازها في الأردن من الكتالوج الموثق.",
      "تحصل على توصية واضحة، وقائمة مستندات، وحكم صريح على الأهلية عن بُعد.",
      "بعد التأكيد، يجتمع كل شيء في ملف قضية قابل للمتابعة مع محامٍ مرخص.",
    ],
    howKicker: "كيف يعمل",
    howTitle: "ثلاث خطوات بسيطة",
    howBody: "من تحديد احتياجك إلى إنشاء قضية متابعة متكاملة — خلال دقائق.",
    step1: "التوجيه",
    step1Body: "أين أنت؟ ما حالتك؟ ماذا تحتاج إنجازه في الأردن؟",
    step2: "توصية وتحليل",
    step2Body: "خدمة موصى بها من الكتالوج، قائمة مستندات، وحكم على أهلية الإنجاز عن بُعد.",
    step3: "ملف قضية متكامل",
    step3Body: "إنشاء قضية، رفع المستندات، متابعة المهام والجدول الزمني، التواصل والدفع.",
    servicesKicker: "كتالوج الخدمات",
    servicesTitle: "خدمات قانونية أردنية عن بُعد",
    servicesBody: "كل خدمة لها إجراء رسمي، قائمة مستندات، ومصادر حكومية واضحة. الذكاء الاصطناعي لا يخترع خدمات خارج هذا الكتالوج.",
    viewAll: "عرض الكل",
    whyKicker: "لماذا نحن",
    whyTitle: "ذكاء اصطناعي + محامون + جهات رسمية",
    whyBody: "الذكاء الاصطناعي للتنقّي والتوجيه فقط — العمل الحقيقي يقوم به محامون مرخصون وجهات حكومية أردنية.",
    noInvent: "لا اختراع خدمات",
    noInventBody: "الذكاء الاصطناعي يختار فقط من كتالوج الخدمات الموثقة.",
    eligibility: "حكم صريح على الأهلية عن بُعد",
    eligibilityBody: "لا يدّعي إنجازاً كاملاً عن بُعد ما لم يقل الإجراء ذلك.",
    fees: "شفافية الرسوم",
    feesBody: "رسوم منصة + رسوم محامٍ + رسوم حكومية — مفصولة، لا ادعاء بالشمول.",
    language: "ثنائي اللغة",
    languageBody: "عربي وإنجليزي، RTL وLTR، في كل مكان.",
    bridgeKicker: "من أي مكان في العالم",
    bridgeTitle: "مسار واضح لمعاملة تبدأ من بعيد.",
    bridgeBody: "ابدأ من حيث أنت، ثم دعنا نوضح لك ما تحتاجه الخطوة التالية في الأردن.",
    start: "ابدأ التوجيه",
    readyTitle: "جاهز لبدء معاملتك؟",
    readyBody: "ابدأ الآن بثلاث خطوات — لا التزام قبل إنشاء القضية.",
    footerTitle: "خدمات المغتربين القانونية",
    footerBody: "Jordan Remote Legal Services — Phase 1 MVP · Bilingual (AR/EN)",
    privacyPolicy: "سياسة الخصوصية",
    englishDisclaimer: "لأغراض العرض التوضيحي فقط — لا يتم تقديم استشارة قانونية حقيقية. الذكاء الاصطناعي للتنقّي فقط. جميع الأعمال القانونية يقوم بها محامون أردنيون مرخصون وجهات أردنية رسمية. هذه المنصة لا تقدم توقيعات إلكترونية ولا خدمات توثيق إلكتروني. رسوم الجهات الحكومية تُدفع مباشرة للجهة المعنية.",
  },
  en: {
    brand: "Jordan Remote Legal Services",
    englishBrand: "Jordan Remote Legal Services",
    navHome: "Home",
    navServices: "Services",
    navMatters: "My Matters",
    signIn: "Sign in",
    switchTo: "العربية",
    phase: "Phase 1 — Demo",
    themeDark: "Dark mode",
    themeLight: "Light mode",
    heroTitle: <>Complete your legal transactions in <span>Jordan</span> from anywhere in the world</>,
    heroBody: "A smart three-step orientation: where are you, what is your situation, and what do you need? Then receive a document list, a clear view of remote eligibility, a trusted lawyer match, and a complete case file with tasks, timelines, messages, and payments.",
    primary: "I need to complete a transaction in Jordan",
    browse: "Browse services",
    demoHint: "Sign in using one of the demo accounts available through the sign-in button above.",
    ai: "AI navigation + licensed lawyers",
    bilingual: "Bilingual (Arabic / English)",
    catalog: "No invented services — explicit catalog",
    routeKicker: "The full flow",
    routeSub: "From orientation to delivery",
    where: "Where are you?",
    situation: "What is your situation?",
    need: "What do you need?",
    recommendation: "Recommendation",
    caseFile: "Case file",
    routeHints: [
      "Tell us where you currently live so the route reflects your location.",
      "Describe your situation briefly so we can identify the right starting point.",
      "Choose the Jordanian transaction you need from the documented catalog.",
      "Receive a clear recommendation, document list, and remote-eligibility view.",
      "Once confirmed, everything lives in a traceable case file with a licensed lawyer.",
    ],
    howKicker: "How it works",
    howTitle: "Three simple steps",
    howBody: "From identifying your need to creating a complete case to follow — in minutes.",
    step1: "Orientation",
    step1Body: "Where are you? What is your situation? What do you need to complete in Jordan?",
    step2: "Recommendation & analysis",
    step2Body: "A catalog-backed recommendation, document list, and a clear view of remote eligibility.",
    step3: "Complete case file",
    step3Body: "Create a case, upload documents, track tasks and timeline, communicate, and pay.",
    servicesKicker: "Service catalog",
    servicesTitle: "Jordanian legal services, remotely",
    servicesBody: "Every service has a formal procedure, document list, and clear government sources. AI does not invent services outside this catalog.",
    viewAll: "View all",
    whyKicker: "Why us",
    whyTitle: "AI + lawyers + official authorities",
    whyBody: "AI is for navigation only — the real work is performed by licensed lawyers and official Jordanian authorities.",
    noInvent: "No invented services",
    noInventBody: "AI selects only from the documented service catalog.",
    eligibility: "Clear remote eligibility",
    eligibilityBody: "No claim of full remote completion unless the procedure says so.",
    fees: "Transparent fees",
    feesBody: "Platform fee + lawyer fee + government fee — separated, never implied as inclusive.",
    language: "Bilingual",
    languageBody: "Arabic and English, RTL and LTR, throughout.",
    bridgeKicker: "From anywhere in the world",
    bridgeTitle: "A clear route for a matter that starts far away.",
    bridgeBody: "Start where you are, then let us make the next step in Jordan easier to see.",
    start: "Start orientation",
    readyTitle: "Ready to start your transaction?",
    readyBody: "Begin in three steps — no commitment before a case is created.",
    footerTitle: "Jordan Remote Legal Services",
    footerBody: "Jordan Remote Legal Services — Phase 1 MVP · Bilingual (AR/EN)",
    privacyPolicy: "Privacy policy",
    englishDisclaimer: "For demonstration only — no real legal advice is provided. AI is for navigation only. All legal work is performed by licensed Jordanian lawyers and official Jordanian authorities. This platform does not provide electronic signatures or e-notary services. Government fees are always paid directly to the relevant authority.",
  },
} as const;

const stepIcons = [Globe2, UserRound, Scale, Sparkles, FileCheck2];

function Brand({ language }: { language: Language }) {
  const t = text[language];
  return (
    <a className="brand" href="/" aria-label={t.brand}>
      <img className="brand-image" src={markAsset} alt={t.brand} />
    </a>
  );
}

export default function Home({ initialLanguage }: { initialLanguage?: Language }) {
  const [disclaimerReady, setDisclaimerReady] = useState(false);
  const [disclaimerAccepted, setDisclaimerAccepted] = useState(false);
  const [language, setLanguage] = useState<Language>(() => {
    if (initialLanguage) return initialLanguage;
    if (typeof window === "undefined") return "ar";
    return window.localStorage.getItem("wakeely-language") === "en" ? "en" : "ar";
  });
  const [menuOpen, setMenuOpen] = useState(false);
  const [activeSlide, setActiveSlide] = useState(0);
  const [sliderPaused, setSliderPaused] = useState(false);
  const [theme, setTheme] = useState<"light" | "dark">("light");
  const toggleTheme = () => {
    setTheme((current) => {
      const next = current === "dark" ? "light" : "dark";
      document.documentElement.classList.toggle("dark", next === "dark");
      return next;
    });
  };
  const pageRef = useRef<HTMLDivElement>(null);
  const isArabic = language === "ar";
  const t = text[language];
  const DirectionArrow = isArabic ? ArrowLeft : ArrowRight;

  useEffect(() => {
    setDisclaimerAccepted(window.sessionStorage.getItem(LANDING_DISCLAIMER_SESSION_KEY) === "true");
    setDisclaimerReady(true);
  }, []);

  const acceptDisclaimer = () => {
    window.sessionStorage.setItem(LANDING_DISCLAIMER_SESSION_KEY, "true");
    setDisclaimerAccepted(true);
  };

  const declineDisclaimer = () => {
    window.sessionStorage.removeItem(LANDING_DISCLAIMER_SESSION_KEY);
    window.location.replace("about:blank");
  };
  const closeMenu = () => setMenuOpen(false);
  const openIntake = () => window.location.assign("/intake");
  const changeLanguage = (nextLanguage: Language) => {
    if (typeof window === "undefined") return;
    window.localStorage.setItem("wakeely-language", nextLanguage);
    setLanguage(nextLanguage);
  };

  useEffect(() => { window.localStorage.setItem("wakeely-language", language); }, [language]);

  const slides = [
    { src: "/slider/1.png", alt: isArabic ? "التوجيه إلى التسليم" : "From orientation to delivery", code: "01" },
    { src: "/slider/2.png", alt: isArabic ? "أين أنت؟" : "Where are you?", code: "02" },
    { src: "/slider/3.png", alt: isArabic ? "ما حالتك؟" : "What is your situation?", code: "03" },
    { src: "/slider/4.png", alt: isArabic ? "ماذا تحتاج؟" : "What do you need?", code: "04" },
    { src: "/slider/5.png", alt: isArabic ? "التوصية القانونية" : "Legal recommendation", code: "05" },
    { src: "/slider/6.png", alt: isArabic ? "ملف القضية" : "Case file", code: "06" },
  ];

  useEffect(() => {
    if (sliderPaused) return;
    const id = window.setInterval(() => setActiveSlide((current) => (current + 1) % slides.length), 5000);
    return () => window.clearInterval(id);
  }, [slides.length, sliderPaused]);

  useEffect(() => {
    const root = pageRef.current;
    if (!root) return;
    const revealItems = Array.from(root.querySelectorAll<HTMLElement>("[data-reveal]"));
    if (typeof IntersectionObserver === "undefined") {
      revealItems.forEach((item) => item.classList.add("is-visible"));
      return;
    }
    const observer = new IntersectionObserver((entries) => entries.forEach((entry) => { if (entry.isIntersecting) { entry.target.classList.add("is-visible"); observer.unobserve(entry.target); } }), { threshold: 0.12, rootMargin: "0px 0px -40px" });
    revealItems.forEach((item) => observer.observe(item));
    return () => observer.disconnect();
  }, []);

  useEffect(() => {
    document.body.classList.add("landing-active");
    return () => document.body.classList.remove("landing-active");
  }, []);

  if (!disclaimerReady || !disclaimerAccepted) {
    return <LandingDisclaimerGate onAccept={acceptDisclaimer} onDecline={declineDisclaimer} />;
  }

  return (
    <div ref={pageRef} className={`wakeely-page ${isArabic ? "is-arabic" : "is-english"}`} dir={isArabic ? "rtl" : "ltr"} lang={language} id="top">
      <div className="phase-bar"><span className="phase-dot" /> {t.phase}<span className="phase-separator" /> <span>{t.bilingual}</span></div>



      <header className="wakeely-header">
        <div className="header-inner page-width">
          <Brand language={language} />
          <nav className="main-nav" aria-label={isArabic ? "التنقل الرئيسي" : "Primary navigation"}>
            <a className="active" href="#top">{t.navHome}</a>
            <a href="#services">{t.navServices}</a>
            <a href="#matters">{t.navMatters}</a>
          </nav>
          <div className="header-tools">
            <button className="language-toggle" onClick={() => changeLanguage(isArabic ? "en" : "ar")} aria-label={isArabic ? "Switch to English" : "التحويل إلى العربية"}><Languages size={15} /> {t.switchTo}</button>
            <button className="theme-toggle" type="button" onClick={() => toggleTheme()} aria-label={theme === "dark" ? t.themeLight : t.themeDark} title={theme === "dark" ? t.themeLight : t.themeDark}>{theme === "dark" ? <Sun size={15} /> : <Moon size={15} />}<span>{theme === "dark" ? t.themeLight : t.themeDark}</span></button>
            <a className="signin-link" href={sitePath("/auth/signin")}>{t.signIn}</a>
            <button className="mobile-menu-toggle" aria-label={menuOpen ? "Close menu" : "Open menu"} aria-expanded={menuOpen} onClick={() => setMenuOpen(!menuOpen)}>{menuOpen ? <X size={21} /> : <Menu size={21} />}</button>
          </div>
        </div>
      </header>

      <main>
        <section className="wakeely-hero">
          <div className="page-width hero-layout">
            <div className="hero-copy">
              <div className="hero-phase"><span className="hero-phase-line" /> <span>{t.phase}</span><span className="hero-language-label">Jordan Remote Legal Services / AR ↔ EN</span></div>
              <h1>{t.heroTitle}</h1>
              <p className="hero-description">{t.heroBody}</p>
              <div className="hero-actions"><button className="primary-action" type="button" onClick={openIntake}>{t.primary}<DirectionArrow size={17} /></button><a className="secondary-action" href={sitePath("/services")}>{t.browse}<ArrowDownRight size={16} /></a></div>
              <p className="demo-hint">{t.demoHint}</p>
              <div className="proof-row"><span><Sparkles size={15} /> {t.ai}</span><span><Languages size={15} /> {t.bilingual}</span><span><ShieldCheck size={15} /> {t.catalog}</span></div>
            </div>
            <div className="flow-card hero-flow-card">
              <div className="flow-card-heading"><div><span>{t.routeKicker}</span><strong>{t.routeSub}</strong></div><span className="flow-code">{String(activeSlide + 1).padStart(2, "0")} / {String(slides.length).padStart(2, "0")}</span></div>
              <div
                className="hero-flow-media"
                aria-roledescription="carousel"
                aria-label={isArabic ? "شرائح الخدمات القانونية" : "Legal service slides"}
                onMouseEnter={() => setSliderPaused(true)}
                onMouseLeave={() => setSliderPaused(false)}
                onFocus={() => setSliderPaused(true)}
                onBlur={(event) => { if (!event.currentTarget.contains(event.relatedTarget)) setSliderPaused(false); }}
              >
                {slides.map((slide, index) => (
                  <img key={slide.src} src={slide.src} alt={slide.alt} className={index === activeSlide ? "is-active" : ""} aria-hidden={index !== activeSlide} />
                ))}
                <span className="hero-slide-badge">{sliderPaused ? (isArabic ? "متوقف للقراءة" : "PAUSED FOR READING") : "WAKEELY / LEGAL JOURNEY"}</span>
              </div>
              <div className="hero-slide-toolbar">
                <button type="button" onClick={() => setActiveSlide((activeSlide - 1 + slides.length) % slides.length)} aria-label={isArabic ? "الصورة السابقة" : "Previous slide"}>←</button>
                <div className="hero-slide-center-controls">
                  <div className="hero-slide-dots">{slides.map((slide, index) => <button key={slide.code} type="button" className={index === activeSlide ? "is-active" : ""} onClick={() => setActiveSlide(index)} aria-label={`${isArabic ? "الشريحة" : "Slide"} ${index + 1}`} />)}</div>
                  <button className="hero-slide-pause" type="button" onClick={() => setSliderPaused((paused) => !paused)} aria-label={sliderPaused ? (isArabic ? "تشغيل الشرائح" : "Resume slides") : (isArabic ? "إيقاف الشرائح مؤقتاً" : "Pause slides")}>{sliderPaused ? <Play size={11} /> : <Pause size={11} />}<span>{sliderPaused ? (isArabic ? "تشغيل" : "Play") : (isArabic ? "إيقاف" : "Pause")}</span></button>
                </div>
                <button type="button" onClick={() => setActiveSlide((activeSlide + 1) % slides.length)} aria-label={isArabic ? "الصورة التالية" : "Next slide"}>→</button>
              </div>
            </div>
          </div>
          <div className="hero-caption page-width"><span>JORDAN / REMOTE LEGAL SERVICES</span><span>01 — THE ROUTE</span></div>
        </section>

        <section className="route-band" id="matters" data-reveal>
          <div className="page-width route-band-inner"><div className="route-band-label"><span className="route-band-line" /> {t.howKicker}</div><p>{t.howBody}</p><div className="route-band-mark">W / 01</div></div>
        </section>

        <section className="process-section" data-reveal>
          <div className="page-width">
            <div className="section-route-label"><span className="route-node-dot" />02 / {isArabic ? "التوجيه" : "ORIENTATION"}<span className="route-line" /><ArrowDownRight size={14} /></div>
            <div className="section-heading centered"><span className="section-kicker">{t.howKicker}</span><h2>{t.howTitle}</h2><p>{t.howBody}</p></div>
            <div className="process-grid">
              {[{number:"01", icon:Globe2, title:t.step1, body:t.step1Body}, {number:"02", icon:Sparkles, title:t.step2, body:t.step2Body}, {number:"03", icon:FileCheck2, title:t.step3, body:t.step3Body}].map(({number, icon: Icon, title, body}) => <article className="process-card" data-reveal key={number}><div className="process-card-top"><span>{number}</span><span className="process-icon"><Icon size={19} /></span></div><h3>{title}</h3><p>{body}</p><button className="process-card-action" type="button" onClick={openIntake}><DirectionArrow size={15} /></button></article>)}
            </div>
            <div className="route-visual route-visual--infographic" data-reveal><div className="route-visual-copy"><span className="section-kicker">ROUTE / EVIDENCE</span><strong>{isArabic ? "ثلاث نقاط تحقق قبل أن يبدأ العمل" : "Three checkpoints before the work begins"}</strong><span>{isArabic ? "مسار موثق، واضح، وقابل للمتابعة." : "A documented route that stays clear and traceable."}</span></div><div className="route-visual-map"><img src={routeAsset} alt={isArabic ? "مخطط بصري لمسار المعاملة من التوجيه إلى الإنجاز" : "Visual route from orientation to completion"} /></div></div>
          </div>
        </section>

        <section className="catalog-section" id="services" data-reveal>
          <div className="page-width catalog-grid">
            <div className="catalog-image"><img src={servicesAsset} alt={isArabic ? "مستندات وملف خدمة قانونية" : "Documents and a legal service file"} /><div className="catalog-image-caption"><span>{t.servicesKicker}</span><span>03 / 04</span></div><div className="catalog-stamp">J</div><div className="image-evidence-tag">CASE / 02 <span>JRD — SERVICE FILE</span></div></div>
            <div className="catalog-copy"><span className="section-kicker">{t.servicesKicker}</span><h2>{t.servicesTitle}</h2><p>{t.servicesBody}</p><div className="catalog-notes"><div><span>01</span><strong>{isArabic ? "إجراء رسمي" : "Formal procedure"}</strong></div><div><span>02</span><strong>{isArabic ? "قائمة مستندات" : "Document list"}</strong></div><div><span>03</span><strong>{isArabic ? "مصادر حكومية" : "Government sources"}</strong></div></div><a className="text-action" href={sitePath("/services")}>{t.viewAll}<DirectionArrow size={16} /></a></div>
          </div>
        </section>

        <section className="trust-section" data-reveal>
          <div className="page-width"><div className="section-route-label section-route-label--light"><span className="route-node-dot" />04 / {isArabic ? "لماذا نحن" : "TRUST FILE"}<span className="route-line" /><ArrowDownRight size={14} /></div><div className="trust-layout"><div className="trust-heading"><span className="section-kicker section-kicker--light">{t.whyKicker}</span><h2>{t.whyTitle}</h2><p>{t.whyBody}</p></div><div className="trust-items"><div className="trust-item"><span>01</span><div><h3>{t.noInvent}</h3><p>{t.noInventBody}</p></div><Check size={17} /></div><div className="trust-item"><span>02</span><div><h3>{t.eligibility}</h3><p>{t.eligibilityBody}</p></div><Check size={17} /></div><div className="trust-item"><span>03</span><div><h3>{t.fees}</h3><p>{t.feesBody}</p></div><Check size={17} /></div><div className="trust-item"><span>04</span><div><h3>{t.language}</h3><p>{t.languageBody}</p></div><Check size={17} /></div></div></div></div>
        </section>

        <section className="bridge-section" data-reveal>
          <div className="page-width"><div className="section-route-label"><span className="route-node-dot" />05 / {isArabic ? "من الخارج إلى الأردن" : "ABROAD TO JORDAN"}<span className="route-line" /><ArrowDownRight size={14} /></div><div className="bridge-grid"><div className="bridge-image"><img src={bridgeAsset} alt={isArabic ? "مساحة عمل عن بعد تتصل بالأردن" : "A remote workspace connected to Jordan"} /><span>{t.bridgeKicker}</span><div className="image-evidence-tag">CASE / 03 <span>REMOTE / JORDAN</span></div></div><div className="bridge-copy"><span className="section-kicker">05 / {t.bridgeKicker}</span><h2>{t.bridgeTitle}</h2><p>{t.bridgeBody}</p><button className="text-action" type="button" onClick={openIntake}>{t.start}<DirectionArrow size={16} /></button></div></div></div>
        </section>

        <section className="ready-section" data-reveal><div className="page-width ready-inner"><div className="section-route-label section-route-label--ready"><span className="route-node-dot" />06 / {isArabic ? "الخطوة التالية" : "ARRIVAL CHECKPOINT"}<span className="route-line" /><ArrowDownRight size={14} /></div><div className="ready-kicker"><span className="section-kicker">07 / NEXT</span><span className="ready-route">{t.routeKicker} <ArrowLeft size={14} /></span></div><h2>{t.readyTitle}</h2><p>{t.readyBody}</p><div className="ready-actions"><button className="primary-action primary-action--dark" type="button" onClick={openIntake}>{t.start}<DirectionArrow size={17} /></button><a className="secondary-action secondary-action--dark" href={sitePath("/services")}>{t.browse}<ArrowDownRight size={16} /></a></div></div>        </section>
      </main>

      {menuOpen && <button className="mobile-menu-backdrop" type="button" aria-label={isArabic ? "إغلاق القائمة" : "Close menu"} onClick={closeMenu} />}
      <div className={`mobile-drawer ${menuOpen ? "is-open" : ""}`} aria-hidden={!menuOpen}>
        <div className="mobile-drawer-head"><Brand language={language} /><button type="button" onClick={closeMenu} aria-label={isArabic ? "إغلاق القائمة" : "Close menu"}><X size={22} /></button></div>
        <nav>{[["#top", t.navHome], ["#services", t.navServices], ["#matters", t.navMatters], [sitePath("/auth/signin"), t.signIn]].map(([href, label], index) => <a key={href} href={href} onClick={closeMenu}><span className="mobile-drawer-index">0{index + 1}</span><strong>{label}</strong><DirectionArrow size={17} /></a>)}</nav>
        <button className="mobile-drawer-cta" type="button" onClick={() => { closeMenu(); openIntake(); }}>{t.start}<Sparkles size={18} /></button>
      </div>
      <nav className="mobile-bottom-nav" aria-label={isArabic ? "التنقل السفلي" : "Mobile navigation"}>
        <a href="#top" className="is-active"><Landmark size={19} /><span>{t.navHome}</span></a>
        <a href="#services"><FileText size={19} /><span>{t.navServices}</span></a>
        <button type="button" onClick={openIntake}><Sparkles size={23} /></button>
        <a href="#matters"><Scale size={19} /><span>{t.navMatters}</span></a>
        <button type="button" onClick={() => setMenuOpen(true)}><Menu size={19} /><span>{isArabic ? "القائمة" : "Menu"}</span></button>
      </nav>
    </div>
  );
}
