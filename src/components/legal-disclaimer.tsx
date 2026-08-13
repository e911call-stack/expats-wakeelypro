"use client";

import Link from "next/link";
import { useLocale } from "@/lib/locale-provider";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Checkbox } from "@/components/ui/checkbox";
import { ShieldAlert, Sparkles, Scale } from "lucide-react";
import { DISCLAIMER_VERSION } from "@/lib/legal-disclaimer";

export { DISCLAIMER_VERSION };

const copy = {
  ar: {
    legalLabel: "تنبيه قانوني",
    legal: "المنصة منصة تقنية وليست مكتب محاماة، ولا تمارس مهنة المحاماة أو تقدم خدمات أو استشارات قانونية. يتم تقديم الخدمات القانونية حصراً من خلال محامين مستقلين مرخّصين. الذكاء الاصطناعي في المنصة أداة تقنية مساعدة وليس بديلاً عن المحامي.",
    fullLink: "إخلاء المسؤولية الكامل",
    aiLabel: "تنبيه الذكاء الاصطناعي",
    ai: "الذكاء الاصطناعي في هذه المنصة أداة تقنية مساعدة ولا يقدم خدمات أو استشارات قانونية، ولا يمثل محامياً أو بديلاً عنه. لا تعتمد على مخرجات الذكاء الاصطناعي باعتبارها رأياً قانونياً. للحصول على المشورة القانونية، تواصل مع محامٍ مرخّص من خلال المنصة.",
    lawyer: "هذا المحامي مستقل عن المنصة ويقدم خدماته القانونية بصفته المهنية المستقلة.",
    service: "هذه الخدمة القانونية يتم تنفيذها من خلال محامٍ مرخّص ومستقل يتم اختياره أو تكليفه عبر المنصة.",
    engagementTitle: "قبل المتابعة",
    engagement: "أنت على وشك طلب خدمات قانونية من محامٍ مستقل مرخّص. المنصة لا تقدم لك هذه الخدمة القانونية ولا تمارس مهنة المحاماة، ولا تصبح طرفاً في أي علاقة محامٍ وموكل تنشأ بينك وبين المحامي. أي علاقة مهنية أو قانونية تنشأ حصراً بينك وبين المحامي وفقاً لشروط التكليف المتفق عليها بينكما.",
    acknowledge: "أقر بأنني قرأت وفهمت هذا التنبيه.",
    fullTitle: "إخلاء المسؤولية القانونية الكامل",
    platformTitle: "المنصة التقنية",
    platform: "المنصة أداة تقنية لتسهيل اكتشاف المحامين، طلب الخدمات، التواصل، تنظيم المستندات، إدارة الملفات والقضايا، تتبع الإجراءات والمهام، الإشعارات، والتلخيص والوظائف التقنية الأخرى. المنصة ليست مكتب محاماة ولا تمارس مهنة المحاماة ولا تقدم المشورة أو التمثيل القانوني.",
    independentTitle: "المحامي المستقل",
    independent: "الخدمات القانونية يقدمها حصراً محامون مستقلون مرخّصون وموثّقون ومسجلون لدى نقابة المحامين الأردنيين، وفق القانون الأردني وقواعد المهنة المعمول بها. أي علاقة مهنية أو قانونية تنشأ بين العميل والمحامي وحدهما.",
    clientTitle: "مسؤولية العميل",
    client: "يبقى العميل مسؤولاً عن صحة المعلومات والمستندات التي يقدمها، وعن مراجعة شروط التكليف والرسوم والنطاق المتفق عليه مباشرة مع المحامي.",
    aiTitle: "الذكاء الاصطناعي",
    aiFull: "الذكاء الاصطناعي طبقة تقنية للمساعدة في الاكتشاف والتنظيم والتلخيص وإدارة سير العمل. لا يمثل الذكاء الاصطناعي محامياً أو مستشاراً قانونياً ولا يقدم رأياً قانونياً، ولا يجوز الاعتماد على مخرجاته كبديل عن المشورة المهنية.",
    updated: "إصدار التنبيه",
  },
  en: {
    legalLabel: "Legal Notice",
    legal: "This platform is a technology platform, not a law firm, and does not practice law or provide legal services or legal advice. Legal services are provided exclusively by independent licensed lawyers. AI on the platform is a technological assistance tool and is not a substitute for a lawyer.",
    fullLink: "Full Legal Disclaimer",
    aiLabel: "AI Notice",
    ai: "AI on this platform is a technological assistance tool and does not provide legal services or legal advice. It is not a lawyer and is not a substitute for a lawyer. Do not rely on AI outputs as legal advice. For legal advice, consult a licensed lawyer through the platform.",
    lawyer: "This lawyer is independent of the platform and provides legal services in their independent professional capacity.",
    service: "This legal service is performed by an independent licensed lawyer selected or engaged through the platform.",
    engagementTitle: "Before proceeding",
    engagement: "You are about to request legal services from an independent licensed lawyer. The platform does not provide those legal services, does not practice law, and does not become a party to any lawyer-client relationship established between you and the lawyer. Any professional or legal relationship is solely between you and the lawyer under the terms of engagement agreed between you.",
    acknowledge: "I acknowledge that I have read and understood this notice.",
    fullTitle: "Full Legal Disclaimer",
    platformTitle: "The technology platform",
    platform: "The platform is a technology tool that facilitates lawyer discovery, service requests, communication, document organization, case and file management, procedure and task tracking, notifications, summarization, and other platform functions. The platform is not a law firm, does not practice law, and does not provide legal advice or representation.",
    independentTitle: "The independent lawyer",
    independent: "Legal services are provided exclusively by independent, licensed and verified lawyers registered with the Jordan Bar Association, subject to applicable Jordanian law and professional rules. Any professional or legal relationship is solely between the client and the lawyer.",
    clientTitle: "The client’s responsibility",
    client: "The client remains responsible for the accuracy of information and documents provided, and for reviewing the engagement terms, fees, and scope agreed directly with the lawyer.",
    aiTitle: "Artificial intelligence",
    aiFull: "AI is a technology layer used to assist with discovery, organization, summarization, and workflow management. AI is not a lawyer or legal adviser and does not provide legal advice. Its outputs must not be relied upon as a substitute for professional legal advice.",
    updated: "Disclaimer version",
  },
} as const;

type Lang = keyof typeof copy;
function content(lang: Lang) { return copy[lang]; }

export function LegalNotice({ className = "" }: { className?: string }) {
  const { locale } = useLocale();
  const c = content(locale);
  return (
    <div dir={locale === "ar" ? "rtl" : "ltr"} className={`rounded-lg border border-primary/25 bg-primary/5 p-3 text-xs leading-6 ${className}`}>
      <p><strong>{c.legalLabel}:</strong> {c.legal}</p>
      <Link className="mt-1 inline-block font-semibold text-primary underline underline-offset-2" href="/legal-disclaimer">{c.fullLink}</Link>
    </div>
  );
}

export function AIUsageNotice({ className = "" }: { className?: string }) {
  const { locale } = useLocale();
  const c = content(locale);
  return <Alert dir={locale === "ar" ? "rtl" : "ltr"} className={`border-primary/30 bg-primary/5 ${className}`}><Sparkles className="h-4 w-4" /><AlertTitle>{c.aiLabel}</AlertTitle><AlertDescription className="text-xs leading-6">{c.ai}</AlertDescription></Alert>;
}

export function LawyerIndependentNotice({ className = "" }: { className?: string }) {
  const { locale } = useLocale();
  const c = content(locale);
  return <Alert dir={locale === "ar" ? "rtl" : "ltr"} className={`border-primary/30 bg-primary/5 ${className}`}><Scale className="h-4 w-4" /><AlertDescription className="text-xs leading-6">{c.lawyer}</AlertDescription></Alert>;
}

export function ServiceProviderNotice({ className = "" }: { className?: string }) {
  const { locale } = useLocale();
  const c = content(locale);
  return <Alert dir={locale === "ar" ? "rtl" : "ltr"} className={`border-primary/30 bg-primary/5 ${className}`}><Scale className="h-4 w-4" /><AlertDescription className="text-xs leading-6">{c.service}</AlertDescription></Alert>;
}

export function LawyerEngagementDisclaimer({ checked, onCheckedChange, className = "" }: { checked: boolean; onCheckedChange: (checked: boolean) => void; className?: string }) {
  const { locale } = useLocale();
  const c = content(locale);
  return <div dir={locale === "ar" ? "rtl" : "ltr"} className={`rounded-lg border border-primary/30 bg-primary/5 p-4 ${className}`}>
    <div className="flex items-start gap-3"><ShieldAlert className="mt-1 h-5 w-5 shrink-0 text-primary" /><div><p className="font-semibold">{c.engagementTitle}</p><p className="mt-1 text-sm leading-7">{c.engagement}</p></div></div>
    <label className="mt-4 flex cursor-pointer items-start gap-2 text-sm font-medium"><Checkbox checked={checked} onCheckedChange={(value) => onCheckedChange(value === true)} /><span>{c.acknowledge}</span></label>
  </div>;
}

export function FullLegalDisclaimer() {
  const { locale, setLocale } = useLocale();
  const c = content(locale);
  return <main dir={locale === "ar" ? "rtl" : "ltr"} className="container mx-auto max-w-4xl px-4 py-10 lg:py-16">
    <div className="mb-8 flex flex-wrap items-center justify-between gap-3"><div><p className="text-xs font-semibold uppercase tracking-[0.18em] text-primary">{c.updated}: {DISCLAIMER_VERSION}</p><h1 className="mt-2 text-3xl font-bold">{c.fullTitle}</h1></div><button type="button" className="rounded-md border border-border px-3 py-2 text-sm" onClick={() => setLocale(locale === "ar" ? "en" : "ar")}>{locale === "ar" ? "English" : "العربية"}</button></div>
    <div className="space-y-4"><section className="rounded-xl border border-border bg-card p-5"><h2 className="text-xl font-semibold">{c.platformTitle}</h2><p className="mt-3 leading-8">{c.platform}</p></section><section className="rounded-xl border border-border bg-card p-5"><h2 className="text-xl font-semibold">{c.independentTitle}</h2><p className="mt-3 leading-8">{c.independent}</p></section><section className="rounded-xl border border-border bg-card p-5"><h2 className="text-xl font-semibold">{c.clientTitle}</h2><p className="mt-3 leading-8">{c.client}</p></section><section className="rounded-xl border border-border bg-card p-5"><h2 className="text-xl font-semibold">{c.aiTitle}</h2><p className="mt-3 leading-8">{c.aiFull}</p></section><section className="rounded-xl border border-primary/30 bg-primary/5 p-5"><h2 className="text-xl font-semibold">{c.legalLabel}</h2><p className="mt-3 leading-8">{c.legal}</p></section></div>
  </main>;
}

export { copy as disclaimerCopy };
