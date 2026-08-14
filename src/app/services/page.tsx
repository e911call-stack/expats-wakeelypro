"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { useLocale } from "@/lib/locale-provider";
import { LegalNotice } from "@/components/legal-disclaimer";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Scale, Building2, KeyRound, ScrollText, Users, Briefcase, Gavel,
  FileCheck2, Clock, Globe, Loader2, ArrowLeft, ArrowRight,
} from "lucide-react";

type ProcedureChoice = { ar: string; en: string; slug: string; promptAr: string; promptEn: string };
type ServiceCategory = { ar: string; en: string; icon: typeof Building2; choices: ProcedureChoice[] };

type Service = {
  id: string; slug: string;
  nameAr: string; nameEn: string;
  shortAr: string; shortEn: string;
  descriptionAr: string; descriptionEn: string;
  remoteEligibility: string;
  platformFeeDefault: number;
  lawyerFeeMin: number; lawyerFeeMax: number;
  governmentFeeEstimate: number;
  typicalDurationDays: number;
  isFeatured: boolean;
  documentCount: number;
  practiceArea: { slug: string; nameAr: string; nameEn: string } | null;
};

const CATEGORIES: ServiceCategory[] = [
  { ar: "عقار", en: "Property", icon: Building2, choices: [
    { ar: "أريد بيع عقار", en: "I want to sell a property", slug: "property-sale-from-abroad", promptAr: "أريد بيع عقار في الأردن", promptEn: "I want to sell a property in Jordan" },
    { ar: "أريد شراء عقار", en: "I want to buy a property", slug: "property-sale-from-abroad", promptAr: "أريد شراء عقار في الأردن", promptEn: "I want to buy a property in Jordan" },
    { ar: "أريد نقل ملكية", en: "I want to transfer ownership", slug: "property-sale-from-abroad", promptAr: "أريد نقل ملكية عقار في الأردن", promptEn: "I want to transfer ownership of a property in Jordan" },
    { ar: "أريد تقسيم تركة عقارية", en: "I want to divide inherited property", slug: "inheritance-initiation", promptAr: "أريد تقسيم تركة عقارية في الأردن", promptEn: "I want to divide inherited property in Jordan" },
    { ar: "أريد توكيل شخص لإدارة عقاري", en: "I want to authorize someone to manage my property", slug: "power-of-attorney", promptAr: "أريد توكيل شخص لإدارة عقاري في الأردن", promptEn: "I want to authorize someone to manage my property in Jordan" },
  ] },
  { ar: "وكالة", en: "Power of attorney", icon: KeyRound, choices: [
    { ar: "أريد إصدار وكالة", en: "I want to issue a power of attorney", slug: "power-of-attorney", promptAr: "أريد إصدار وكالة في الأردن", promptEn: "I want to issue a power of attorney in Jordan" },
    { ar: "أريد استخدام وكالة صادرة من الخارج", en: "I want to use a power of attorney issued abroad", slug: "power-of-attorney", promptAr: "أريد استخدام وكالة صادرة من الخارج في الأردن", promptEn: "I want to use a power of attorney issued abroad in Jordan" },
    { ar: "أريد إلغاء وكالة", en: "I want to cancel a power of attorney", slug: "power-of-attorney", promptAr: "أريد إلغاء وكالة في الأردن", promptEn: "I want to cancel a power of attorney in Jordan" },
    { ar: "أريد توكيل محامٍ", en: "I want to authorize a lawyer", slug: "power-of-attorney", promptAr: "أريد توكيل محامٍ في الأردن", promptEn: "I want to authorize a lawyer in Jordan" },
  ] },
  { ar: "إرث", en: "Inheritance", icon: Users, choices: [
    { ar: "أحد أفراد عائلتي توفي في الأردن", en: "A family member died in Jordan", slug: "inheritance-initiation", promptAr: "أحد أفراد عائلتي توفي في الأردن وأحتاج المساعدة في إجراءات التركة", promptEn: "A family member died in Jordan and I need help with the inheritance process" },
    { ar: "أريد حصر الإرث", en: "I want to establish the heirs", slug: "inheritance-initiation", promptAr: "أريد حصر الإرث في الأردن", promptEn: "I want to establish the heirs in Jordan" },
    { ar: "أريد معرفة حقوقي في التركة", en: "I want to understand my inheritance rights", slug: "inheritance-initiation", promptAr: "أريد معرفة حقوقي في التركة في الأردن", promptEn: "I want to understand my inheritance rights in Jordan" },
    { ar: "أريد نقل ملكية حصتي", en: "I want to transfer my inherited share", slug: "inheritance-initiation", promptAr: "أريد نقل ملكية حصتي من التركة في الأردن", promptEn: "I want to transfer ownership of my inherited share in Jordan" },
    { ar: "جميع الورثة خارج الأردن", en: "All heirs are outside Jordan", slug: "inheritance-initiation", promptAr: "جميع الورثة خارج الأردن ونحتاج إنهاء إجراءات التركة", promptEn: "All heirs are outside Jordan and we need to complete the inheritance process" },
  ] },
  { ar: "قضية", en: "Case", icon: Gavel, choices: [
    { ar: "لدي قضية قائمة في الأردن", en: "I have an existing case in Jordan", slug: "court-representation", promptAr: "لدي قضية قائمة في الأردن", promptEn: "I have an existing case in Jordan" },
    { ar: "أريد رفع قضية", en: "I want to file a case", slug: "court-representation", promptAr: "أريد رفع قضية في الأردن", promptEn: "I want to file a case in Jordan" },
    { ar: "أريد معرفة موقفي القانوني", en: "I want to understand my legal position", slug: "court-representation", promptAr: "أريد معرفة موقفي القانوني في الأردن", promptEn: "I want to understand my legal position in Jordan" },
    { ar: "أريد تنفيذ حكم", en: "I want to enforce a judgment", slug: "court-representation", promptAr: "أريد تنفيذ حكم في الأردن", promptEn: "I want to enforce a judgment in Jordan" },
  ] },
  { ar: "شركة / عمل", en: "Company / business", icon: Briefcase, choices: [
    { ar: "أريد تأسيس شركة", en: "I want to form a company", slug: "company-formation", promptAr: "أريد تأسيس شركة في الأردن", promptEn: "I want to form a company in Jordan" },
    { ar: "لدي شركة في الأردن", en: "I have a company in Jordan", slug: "company-formation", promptAr: "لدي شركة في الأردن وأحتاج مساعدة قانونية", promptEn: "I have a company in Jordan and need legal assistance" },
    { ar: "أريد تعديل أو تصفية شركة", en: "I want to amend or liquidate a company", slug: "company-formation", promptAr: "أريد تعديل أو تصفية شركة في الأردن", promptEn: "I want to amend or liquidate a company in Jordan" },
    { ar: "لدي نزاع تجاري", en: "I have a commercial dispute", slug: "court-representation", promptAr: "لدي نزاع تجاري في الأردن", promptEn: "I have a commercial dispute in Jordan" },
  ] },
  { ar: "مستند", en: "Document", icon: FileCheck2, choices: [
    { ar: "أريد تصديق مستند", en: "I want to authenticate a document", slug: "document-authentication", promptAr: "أريد تصديق مستند في الأردن", promptEn: "I want to authenticate a document in Jordan" },
    { ar: "أريد مراجعة عقد", en: "I want a contract reviewed", slug: "contract-review", promptAr: "أريد مراجعة عقد في الأردن", promptEn: "I want a contract reviewed in Jordan" },
    { ar: "أريد إعداد عقد", en: "I want a contract prepared", slug: "contract-review", promptAr: "أريد إعداد عقد في الأردن", promptEn: "I want a contract prepared in Jordan" },
    { ar: "أريد استخدام مستند أجنبي في الأردن", en: "I want to use a foreign document in Jordan", slug: "document-authentication", promptAr: "أريد استخدام مستند أجنبي في الأردن", promptEn: "I want to use a foreign document in Jordan" },
  ] },
];

const REMOTE_TONES: Record<string, "success" | "warning" | "danger" | "secondary"> = {
  fully_remote: "success", partially_remote: "warning", in_person_required: "danger", unknown: "secondary",
};

const PRIMARY_SERVICE_ORDER = [
  "property-sale-from-abroad",
  "power-of-attorney",
  "inheritance-initiation",
  "civil-status-update",
  "company-formation",
  "court-representation",
  "document-authentication",
];

function orderServices(services: Service[]) {
  const rank = new Map(PRIMARY_SERVICE_ORDER.map((slug, index) => [slug, index]));
  return [...services].sort((left, right) => {
    const leftRank = rank.get(left.slug);
    const rightRank = rank.get(right.slug);
    if (leftRank !== undefined && rightRank !== undefined) return leftRank - rightRank;
    if (leftRank !== undefined) return -1;
    if (rightRank !== undefined) return 1;
    return Number(right.isFeatured) - Number(left.isFeatured) || left.nameEn.localeCompare(right.nameEn);
  });
}

export default function ServicesPage() {
  const { locale } = useLocale();
  const ar = locale === "ar";
  const [services, setServices] = useState<Service[]>([]);
  const [loading, setLoading] = useState(true);
  const orderedServices = orderServices(services);
  const primaryServices = orderedServices.slice(0, Math.min(7, orderedServices.length));
  const additionalServices = orderedServices.slice(7);

  useEffect(() => {
    fetch("/api/legal/services").then((r) => r.json()).then((d) => setServices(d.services ?? [])).catch(() => setServices([])).finally(() => setLoading(false));
  }, []);

  return (
    <div className="container mx-auto px-4 py-8 lg:py-12">
      <LegalNotice className="mb-6" />
      <section id="catalog" className="mb-12">
        <div className="mb-8">
          <Badge variant="secondary" className="mb-2">{ar ? "كتالوج الخدمات الموثقة" : "Verified service catalog"}</Badge>
          <h1 className="text-3xl font-bold sm:text-4xl">{ar ? "الخدمات القانونية الأردنية" : "Jordanian legal services"}</h1>
          <p className="mt-2 max-w-2xl text-sm text-muted-foreground">{ar ? "كل خدمة لها إجراء رسمي صريح، قائمة مستندات، ومصادر حكومية. الذكاء الاصطناعي لا يخترع خدمات خارج هذا الكتالوج." : "Each service has an explicit official procedure, document checklist, and government sources. The AI does not invent services outside this catalog."}</p>
        </div>
        {loading ? <div className="flex justify-center py-16"><Loader2 className="h-8 w-8 animate-spin text-muted-foreground" /></div> : <>
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">{primaryServices.map((s) => <ServiceCard key={s.id} service={s} ar={ar} />)}</div>
          {additionalServices.length > 0 && <div className="mt-14 border-t border-border pt-10">
            <Badge variant="secondary" className="mb-3">{ar ? "خدمات إضافية" : "Additional services"}</Badge>
            <h2 className="mb-6 text-xl font-bold">{ar ? "المزيد من الخدمات والإجراءات" : "More services and procedures"}</h2>
            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">{additionalServices.map((s) => <ServiceCard key={s.id} service={s} ar={ar} />)}</div>
          </div>}
        </>}
      </section>

      <section>
        <Badge variant="secondary" className="mb-3">{ar ? "الخطوة التالية" : "Next step"}</Badge>
        <h2 className="text-2xl font-bold sm:text-3xl">{ar ? "ماذا تريد أن تنجز في الأردن؟" : "What do you want to accomplish in Jordan?"}</h2>
        <p className="mt-3 max-w-3xl text-sm leading-7 text-muted-foreground">{ar ? "اختر المجال ثم الإجراء الأقرب لاحتياجك. سينقلك كل خيار إلى نموذج استقبال لجمع بياناتك الأساسية وفهم طلبك قبل ربطه بالخدمة المناسبة." : "Choose a category and the procedure closest to your need. Each choice opens an intake form to collect your basic details and understand your request before matching it to the right service."}</p>
        <div className="mt-7 grid gap-4 md:grid-cols-2 xl:grid-cols-3">
          {CATEGORIES.map((category) => <CategoryCard key={category.en} category={category} ar={ar} />)}
        </div>
      </section>
    </div>
  );
}

function CategoryCard({ category, ar }: { category: ServiceCategory; ar: boolean }) {
  const Icon = category.icon;
  return <Card className="overflow-hidden border-primary/15"><CardContent className="p-0">
    <div className="flex items-center gap-3 border-b bg-primary/5 px-5 py-4"><div className="grid h-10 w-10 place-items-center rounded-xl bg-primary text-primary-foreground"><Icon className="h-5 w-5" /></div><div><h2 className="font-bold">{ar ? category.ar : category.en}</h2><p className="text-xs text-muted-foreground">{ar ? "اختر الإجراء" : "Choose a procedure"}</p></div></div>
    <div className="divide-y">{category.choices.map((choice) => <Link key={choice.ar} href={`/intake?category=${encodeURIComponent(category.en)}&service=${encodeURIComponent(choice.slug)}&promptAr=${encodeURIComponent(choice.promptAr)}&promptEn=${encodeURIComponent(choice.promptEn)}`} className="group flex items-center justify-between gap-3 px-5 py-3 text-sm transition-colors hover:bg-primary/5"><span>{ar ? choice.ar : choice.en}</span>{ar ? <ArrowLeft className="h-4 w-4 shrink-0 text-primary transition-transform group-hover:-translate-x-1" /> : <ArrowRight className="h-4 w-4 shrink-0 text-primary transition-transform group-hover:translate-x-1" />}</Link>)}</div>
  </CardContent></Card>;
}

function ServiceCard({ service, ar }: { service: Service; ar: boolean }) {
  const reTone = REMOTE_TONES[service.remoteEligibility] ?? "secondary";
  const reLabel = ar ? (service.remoteEligibility === "fully_remote" ? "عن بُعد بالكامل" : service.remoteEligibility === "partially_remote" ? "جزئياً عن بُعد" : service.remoteEligibility === "in_person_required" ? "يتطلب حضوراً" : "غير محدد") : (service.remoteEligibility === "fully_remote" ? "Fully remote" : service.remoteEligibility === "partially_remote" ? "Partially remote" : service.remoteEligibility === "in_person_required" ? "In-person required" : "Unknown");
  const Icon = getServiceIcon(service.slug);
  return <Link href={`/services/${service.slug}`} className="block h-full"><Card className="flex h-full flex-col transition-shadow hover:shadow-md"><CardContent className="flex flex-1 flex-col pt-6"><div className="flex items-start justify-between gap-2"><div className="grid h-10 w-10 place-items-center rounded-lg bg-primary/10 text-primary"><Icon className="h-5 w-5" /></div><Badge variant={reTone} className="gap-1 text-[10px]"><Globe className="h-3 w-3" />{reLabel}</Badge></div><h3 className="mt-3 text-base font-bold">{ar ? service.nameAr : service.nameEn}</h3><p className="mt-1.5 flex-1 text-sm leading-6 text-muted-foreground">{ar ? service.shortAr : service.shortEn}</p>{service.practiceArea && <p className="mt-2 text-xs text-muted-foreground">{ar ? service.practiceArea.nameAr : service.practiceArea.nameEn}</p>}<div className="mt-4 space-y-2 border-t border-border pt-3 text-xs"><div className="flex items-center justify-between"><span className="flex items-center gap-1 text-muted-foreground"><Clock className="h-3 w-3" />{service.typicalDurationDays} {ar ? "يوم" : "days"}</span><span className="font-semibold">{service.lawyerFeeMin}–{service.lawyerFeeMax} JOD</span></div></div><Button variant="outline" size="sm" className="mt-3 w-full">{ar ? "التفاصيل" : "View details"}</Button></CardContent></Card></Link>;
}

function getServiceIcon(slug: string) {
  switch (slug) {
    case "property-sale-from-abroad": return Building2;
    case "power-of-attorney": return KeyRound;
    case "inheritance-initiation": return ScrollText;
    case "civil-status-update": return Users;
    case "company-formation": return Briefcase;
    case "court-representation": return Gavel;
    case "document-authentication": return FileCheck2;
    default: return Scale;
  }
}
