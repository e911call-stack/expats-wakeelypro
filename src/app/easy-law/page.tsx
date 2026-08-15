"use client";

import Image from "next/image";
import Link from "next/link";
import { useMemo, useState } from "react";
import { ArrowLeft, BookOpen, ChevronLeft, ChevronRight, Search, ShieldCheck, X, ZoomIn } from "lucide-react";

const topics = [
  { id: "all", ar: "الكل", en: "All topics" },
  { id: "property", ar: "العقار والحقوق العينية", en: "Property & real rights" },
  { id: "contracts", ar: "العقود والإقرار", en: "Contracts & admission" },
  { id: "civil", ar: "القانون المدني", en: "Civil law foundations" },
  { id: "daily", ar: "حقوقك اليومية", en: "Everyday rights" },
];

const infographics = [
  {
    id: "mortgage",
    topic: "property",
    titleAr: "الرهن التأميني والرهن الحيازي",
    titleEn: "Mortgage types in Jordan",
    summaryAr: "افهم الفرق بين ضمان الدين بعقار وبين حيازة المال المرهون.",
    summaryEn: "See how security over property differs from possession-based security.",
    image: "/easy-law/jordan-mortgage-types-infographic-ar.webp",
    accent: "#006c8e",
  },
  {
    id: "real-rights",
    topic: "property",
    titleAr: "الحقوق العينية الأصلية والتبعية",
    titleEn: "Original and accessory real rights",
    summaryAr: "خريطة بصرية تساعدك على فهم الملكية والحقوق التابعة للدين.",
    summaryEn: "A visual guide to ownership rights and rights that secure a debt.",
    image: "/easy-law/jordan-real-rights-infographic-ar.webp",
    accent: "#087f76",
  },
  {
    id: "admission",
    topic: "contracts",
    titleAr: "الإقرار في القانون المدني الأردني",
    titleEn: "Admission under Jordanian civil law",
    summaryAr: "متى يلزم الإقرار صاحبه؟ وما الفرق بين الإقرار القضائي والوكالة؟",
    summaryEn: "Learn when an admission binds its maker and how key forms differ.",
    image: "/easy-law/jordan-civil-code-admission-infographic-ar.webp",
    accent: "#5b34b4",
  },
  {
    id: "civil-rights",
    topic: "civil",
    titleAr: "الحقوق العينية في القانون المدني الأردني",
    titleEn: "Real rights in Jordanian civil law",
    summaryAr: "تبسيط العلاقة بين الحق العيني والحق التبعي مع أمثلة عملية.",
    summaryEn: "A practical comparison between original and accessory rights.",
    image: "/easy-law/jordan-civil-law-rights-infographic.webp",
    accent: "#006c8e",
  },
  {
    id: "oral-contracts",
    topic: "contracts",
    titleAr: "إرادتك ملزمة: دليل العقود الشفهية",
    titleEn: "Your word can bind you",
    summaryAr: "كيف تنشأ العقود الشفهية؟ ومتى تحتاج إلى توثيق كتابي؟",
    summaryEn: "How oral agreements form and when written proof becomes important.",
    image: "/easy-law/oral-contracts-guide.webp",
    accent: "#14737a",
  },
  {
    id: "daily-rights",
    topic: "daily",
    titleAr: "دليلك القانوني اليومي",
    titleEn: "Your everyday legal guide",
    summaryAr: "إيجار، معاملات مالية، عيوب خفية، وإثبات الالتزامات اليومية.",
    summaryEn: "Everyday guidance on rent, money, hidden defects, and proof.",
    image: "/easy-law/your-civil-law-rights.webp",
    accent: "#087f76",
  },
  {
    id: "foundations",
    topic: "civil",
    titleAr: "أسس القانون المدني الأردني",
    titleEn: "Foundations of the Jordanian Civil Code",
    summaryAr: "مقدمة بصرية إلى مصادر القانون والأهلية والحقوق التعاقدية.",
    summaryEn: "A visual primer on legal sources, capacity, and contractual rights.",
    image: "/easy-law/Jordanian_Civil_Code_Legal_Foundations.webp",
    accent: "#1a5d92",
  },
];

export default function EasyLawPage() {
  const [activeTopic, setActiveTopic] = useState("all");
  const [query, setQuery] = useState("");
  const [selectedId, setSelectedId] = useState<string | null>(null);

  const visibleItems = useMemo(() => {
    const normalized = query.trim().toLowerCase();
    return infographics.filter((item) => {
      const topicMatch = activeTopic === "all" || item.topic === activeTopic;
      const queryMatch = !normalized || [item.titleAr, item.titleEn, item.summaryAr, item.summaryEn].join(" ").toLowerCase().includes(normalized);
      return topicMatch && queryMatch;
    });
  }, [activeTopic, query]);

  const selectedIndex = selectedId ? visibleItems.findIndex((item) => item.id === selectedId) : -1;
  const selected = selectedIndex >= 0 ? visibleItems[selectedIndex] : null;

  function moveSelected(direction: number) {
    if (!selected || visibleItems.length < 2) return;
    const nextIndex = (selectedIndex + direction + visibleItems.length) % visibleItems.length;
    setSelectedId(visibleItems[nextIndex].id);
  }

  return (
    <main className="min-h-screen bg-[#f8fafb] pb-16" dir="rtl">
      <section className="relative overflow-hidden border-b border-[#d7e7eb] bg-[radial-gradient(circle_at_top_left,#dff4f4,transparent_42%),linear-gradient(135deg,#ffffff,#eef7f8)]">
        <div className="mx-auto max-w-7xl px-4 pb-12 pt-10 sm:px-6 lg:px-8 lg:pb-16 lg:pt-14">
          <Link href="/" className="mb-8 inline-flex items-center gap-2 text-sm font-semibold text-[#006c8e] hover:underline">
            <ArrowLeft className="h-4 w-4 rotate-180" /> العودة إلى الرئيسية
          </Link>
          <div className="max-w-4xl">
            <div className="mb-4 inline-flex items-center gap-2 rounded-full border border-[#bfe1e5] bg-white/80 px-4 py-2 text-sm font-bold text-[#006c8e] shadow-sm">
              <BookOpen className="h-4 w-4" /> افهم القانون بسهولة · Easy Law
            </div>
            <h1 className="text-4xl font-black tracking-tight text-slate-950 sm:text-5xl lg:text-6xl">
              القانون الأردني، <span className="text-[#006c8e]">بصورة أوضح</span>
            </h1>
            <p className="mt-5 max-w-3xl text-lg leading-8 text-slate-600 sm:text-xl">
              Infographics that turn complex legal ideas into clear, practical starting points. تصفّح، ابحث، واضغط على أي بطاقة لقراءة الإنفوغرافيك بحجم أكبر.
            </p>
          </div>
          <div className="mt-8 grid gap-4 sm:grid-cols-3">
            {[
              ["01", "اقرأ بصرياً", "Read visually"],
              ["02", "ابحث حسب الموضوع", "Filter by topic"],
              ["03", "احفظ السؤال لمحامٍ", "Bring questions to counsel"],
            ].map(([number, ar, en]) => (
              <div key={number} className="rounded-2xl border border-white/80 bg-white/85 p-4 shadow-sm backdrop-blur">
                <span className="text-xs font-black tracking-[0.2em] text-[#006c8e]">{number}</span>
                <p className="mt-2 font-bold text-slate-900">{ar}</p>
                <p className="text-sm text-slate-500">{en}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      <section className="mx-auto max-w-7xl px-4 pt-8 sm:px-6 lg:px-8">
        <div className="sticky top-2 z-20 rounded-2xl border border-[#d6e7ea] bg-white/95 p-3 shadow-lg backdrop-blur md:p-4">
          <div className="flex flex-col gap-3 lg:flex-row lg:items-center">
            <div className="relative min-w-0 flex-1">
              <Search className="pointer-events-none absolute right-3 top-1/2 h-5 w-5 -translate-y-1/2 text-[#006c8e]" />
              <input
                value={query}
                onChange={(event) => setQuery(event.target.value)}
                placeholder="ابحث في الإنفوغرافيكس… Search legal explainers"
                className="h-12 w-full rounded-xl border border-[#c9e0e4] bg-[#f8fcfc] pe-11 ps-4 text-sm outline-none transition focus:border-[#006c8e] focus:ring-4 focus:ring-[#006c8e]/10"
                aria-label="Search legal explainers"
              />
            </div>
            <div className="flex gap-2 overflow-x-auto pb-1" role="tablist" aria-label="Easy Law topics">
              {topics.map((topic) => (
                <button
                  key={topic.id}
                  type="button"
                  onClick={() => setActiveTopic(topic.id)}
                  className={`shrink-0 rounded-xl px-3 py-2 text-right text-xs font-bold transition ${activeTopic === topic.id ? "bg-[#006c8e] text-white shadow-md" : "bg-[#eef7f8] text-[#006c8e] hover:bg-[#dceff1]"}`}
                  role="tab"
                  aria-selected={activeTopic === topic.id}
                >
                  <span className="block">{topic.ar}</span>
                  <span className="mt-0.5 block text-[10px] font-medium opacity-75">{topic.en}</span>
                </button>
              ))}
            </div>
          </div>
        </div>

        <div className="mt-8 flex items-end justify-between gap-4">
          <div>
            <p className="text-sm font-bold text-[#006c8e]">{visibleItems.length} explainers · {visibleItems.length} شروحات</p>
            <h2 className="mt-1 text-2xl font-black text-slate-950 sm:text-3xl">اختر موضوعاً وابدأ الفهم</h2>
          </div>
          <div className="hidden rounded-full bg-[#e8f5f6] px-4 py-2 text-xs font-semibold text-[#006c8e] sm:block">Interactive legal library</div>
        </div>

        {visibleItems.length ? (
          <div className="mt-6 grid gap-6 md:grid-cols-2 xl:grid-cols-3">
            {visibleItems.map((item) => (
              <article key={item.id} className="group overflow-hidden rounded-3xl border border-[#dbe9eb] bg-white shadow-[0_12px_35px_rgba(0,108,142,0.08)] transition hover:-translate-y-1 hover:shadow-[0_18px_44px_rgba(0,108,142,0.16)]">
                <button type="button" onClick={() => setSelectedId(item.id)} className="block w-full text-right" aria-label={`Open ${item.titleEn}`}>
                  <div className="relative aspect-[4/3] overflow-hidden bg-[#f4fafb]">
                    <Image src={item.image} alt={item.titleAr} fill sizes="(max-width: 768px) 100vw, (max-width: 1280px) 50vw, 33vw" className="object-cover object-top transition duration-500 group-hover:scale-[1.03]" />
                    <span className="absolute left-3 top-3 inline-flex items-center gap-1 rounded-full bg-white/90 px-3 py-1.5 text-xs font-bold text-[#006c8e] shadow-sm"><ZoomIn className="h-3.5 w-3.5" /> تكبير</span>
                  </div>
                  <div className="border-t-4 p-5" style={{ borderColor: item.accent }}>
                    <h3 className="text-xl font-black leading-8 text-slate-950">{item.titleAr}</h3>
                    <p className="mt-1 text-sm font-bold text-[#006c8e]">{item.titleEn}</p>
                    <p className="mt-3 text-sm leading-7 text-slate-600">{item.summaryAr}</p>
                    <p className="mt-2 text-xs leading-5 text-slate-500">{item.summaryEn}</p>
                    <span className="mt-4 inline-flex items-center gap-2 text-sm font-black text-[#006c8e]">افتح الشرح <ChevronLeft className="h-4 w-4" /></span>
                  </div>
                </button>
              </article>
            ))}
          </div>
        ) : (
          <div className="mt-8 rounded-3xl border border-dashed border-[#9bcbd1] bg-white p-12 text-center">
            <p className="text-lg font-bold text-slate-900">لم نجد شرحاً مطابقاً</p>
            <p className="mt-2 text-sm text-slate-500">Try another phrase or choose a different topic.</p>
          </div>
        )}

        <div className="mt-10 rounded-3xl border border-amber-200 bg-amber-50 p-5 text-sm leading-7 text-amber-950 sm:p-6">
          <div className="flex items-start gap-3">
            <ShieldCheck className="mt-1 h-5 w-5 shrink-0 text-amber-700" />
            <p><strong>تنبيه تعليمي / Educational notice:</strong> هذه الإنفوغرافيكس للتثقيف العام وليست استشارة قانونية أو بديلاً عن مراجعة النص النافذ ومحامٍ مرخّص في الأردن. The explainers are educational starting points, not legal advice.</p>
          </div>
        </div>
      </section>

      {selected && (
        <div className="fixed inset-0 z-[80] flex items-center justify-center bg-slate-950/75 p-3 sm:p-6" role="dialog" aria-modal="true" aria-label={selected.titleEn}>
          <div className="relative flex max-h-[96vh] w-full max-w-5xl flex-col overflow-hidden rounded-3xl bg-white shadow-2xl">
            <div className="flex items-center justify-between gap-3 border-b border-slate-200 px-4 py-3 sm:px-6">
              <div className="min-w-0">
                <p className="truncate text-sm font-black text-slate-950">{selected.titleAr}</p>
                <p className="truncate text-xs text-[#006c8e]">{selected.titleEn}</p>
              </div>
              <button type="button" onClick={() => setSelectedId(null)} className="rounded-full p-2 text-slate-500 hover:bg-slate-100 hover:text-slate-950" aria-label="Close explainer"><X className="h-5 w-5" /></button>
            </div>
            <div className="min-h-0 flex-1 overflow-auto bg-[#f4f8f9] p-2 sm:p-5">
              <Image src={selected.image} alt={selected.titleAr} width={1638} height={2048} className="mx-auto h-auto w-full max-w-4xl rounded-xl object-contain shadow-sm" priority />
            </div>
            <div className="flex items-center justify-between gap-3 border-t border-slate-200 px-4 py-3 sm:px-6">
              <button type="button" onClick={() => moveSelected(-1)} className="inline-flex items-center gap-1 rounded-lg bg-[#eef7f8] px-3 py-2 text-xs font-bold text-[#006c8e] hover:bg-[#dceff1]" aria-label="Previous explainer"><ChevronRight className="h-4 w-4" /> السابق</button>
              <span className="text-xs text-slate-500">{selectedIndex + 1} / {visibleItems.length}</span>
              <button type="button" onClick={() => moveSelected(1)} className="inline-flex items-center gap-1 rounded-lg bg-[#eef7f8] px-3 py-2 text-xs font-bold text-[#006c8e] hover:bg-[#dceff1]" aria-label="Next explainer">التالي <ChevronLeft className="h-4 w-4" /></button>
            </div>
          </div>
        </div>
      )}
    </main>
  );
}
