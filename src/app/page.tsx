"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { useLocale } from "@/lib/locale-provider";
import { useSession } from "@/lib/session-provider";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import {
  Scale,
  Sparkles,
  ArrowRight,
  ArrowLeft,
  FileText,
  Globe,
  ShieldCheck,
  Languages,
  Building2,
  Gavel,
  Landmark,
  Users,
  Clock,
  CheckCircle2,
  KeyRound,
  ScrollText,
  Briefcase,
} from "lucide-react";

type Service = {
  id: string;
  slug: string;
  nameAr: string;
  nameEn: string;
  shortAr: string;
  shortEn: string;
  remoteEligibility: "fully_remote" | "partially_remote" | "in_person_required" | "unknown";
  platformFeeDefault: number;
  lawyerFeeMin: number;
  lawyerFeeMax: number;
  typicalDurationDays: number;
  isFeatured: boolean;
};

const REMOTE_LABEL: Record<string, { ar: string; en: string; tone: "success" | "warning" | "danger" | "secondary" }> = {
  fully_remote: { ar: "عن بُعد بالكامل", en: "Fully remote", tone: "success" },
  partially_remote: { ar: "جزئياً عن بُعد", en: "Partially remote", tone: "warning" },
  in_person_required: { ar: "يتطلب حضوراً", en: "In-person required", tone: "danger" },
  unknown: { ar: "غير محدد", en: "Unknown", tone: "secondary" },
};

export default function HomePage() {
  const { locale } = useLocale();
  const { user } = useSession();
  const ar = locale === "ar";
  const [services, setServices] = useState<Service[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch("/api/legal/services")
      .then((r) => r.json())
      .then((d) => setServices(d.services ?? []))
      .catch(() => setServices([]))
      .finally(() => setLoading(false));
  }, []);

  return (
    <div className="flex flex-col">
      {/* Hero */}
      <section className="relative overflow-hidden border-b border-border bg-gradient-to-b from-primary/5 via-background to-background">
        <div className="container mx-auto px-4 py-16 md:py-24">
          <div className="grid items-center gap-12 md:grid-cols-2">
            <div>
              <Badge variant="secondary" className="mb-4 gap-1.5">
                <Sparkles className="h-3 w-3" />
                {ar ? "إصدار Phase 1 — تجريبي" : "Phase 1 MVP — Demo"}
              </Badge>
              <h1 className="text-3xl font-extrabold leading-tight tracking-tight sm:text-4xl md:text-5xl">
                {ar ? (
                  <>
                    أنجز معاملاتك القانونية في{" "}
                    <span className="bg-gradient-to-l from-emerald-600 to-emerald-500 bg-clip-text text-transparent">
                      الأردن
                    </span>{" "}
                    من أي مكان في العالم
                  </>
                ) : (
                  <>
                    Get your legal matters done in{" "}
                    <span className="bg-gradient-to-r from-emerald-600 to-emerald-500 bg-clip-text text-transparent">
                      Jordan
                    </span>{" "}
                    from anywhere in the world
                  </>
                )}
              </h1>
              <p className="mt-5 max-w-xl text-base leading-8 text-muted-foreground sm:text-lg">
                {ar
                  ? "توجيه ذكي ثلاثي الخطوات: أين أنت؟ ما حالتك؟ ماذا تحتاج؟ — ثم قائمة مستندات، حكم على أهلية الإنجاز عن بُعد، مطابقة مع محامٍ موثوق، وملف قضية متكامل مع المهام والجدول الزمني والرسائل والمدفوعات."
                  : "Three-step smart intake: Where are you? What is your status? What do you need? — then a document checklist, remote-eligibility verdict, a matched verified lawyer, and a full matter file with tasks, timeline, messaging and payments."}
              </p>
              <div className="mt-8 flex flex-wrap items-center gap-3">
                <Link href="/intake">
                  <Button size="lg" className="gap-2">
                    <KeyRound className="h-4 w-4" />
                    {ar ? "أحتاج لإنجاز معاملة في الأردن" : "I need to handle something in Jordan"}
                    {ar ? <ArrowLeft className="h-4 w-4" /> : <ArrowRight className="h-4 w-4" />}
                  </Button>
                </Link>
                <Link href="/services">
                  <Button size="lg" variant="outline">
                    {ar ? "تصفح الخدمات" : "Browse services"}
                  </Button>
                </Link>
              </div>
              {!user && (
                <p className="mt-4 text-xs text-muted-foreground">
                  {ar
                    ? "تسجيل الدخول عبر زر «تسجيل الدخول» بأحد الحسابات التجريبية في الأعلى."
                    : "Sign in via the «Sign in» button at the top using one of the demo accounts."}
                </p>
              )}
              <div className="mt-8 flex flex-wrap items-center gap-x-6 gap-y-2 text-xs text-muted-foreground">
                <div className="flex items-center gap-1.5">
                  <CheckCircle2 className="h-3.5 w-3.5 text-emerald-600" />
                  {ar ? "مدعوم بالذكاء الاصطناعي + محامين مرخصين" : "AI-assisted + licensed lawyers"}
                </div>
                <div className="flex items-center gap-1.5">
                  <Languages className="h-3.5 w-3.5 text-emerald-600" />
                  {ar ? "ثنائي اللغة (عربي/إنجليزي)" : "Bilingual (AR/EN)"}
                </div>
                <div className="flex items-center gap-1.5">
                  <ShieldCheck className="h-3.5 w-3.5 text-emerald-600" />
                  {ar ? "لا اختراع للخدمات — كتالوج صريح" : "No invented services — strict catalog"}
                </div>
              </div>
            </div>

            <div className="relative">
              <HeroFlowDiagram ar={ar} />
            </div>
          </div>
        </div>
      </section>

      {/* How it works */}
      <section className="container mx-auto px-4 py-16">
        <div className="mx-auto mb-10 max-w-2xl text-center">
          <Badge variant="secondary">{ar ? "كيف يعمل" : "How it works"}</Badge>
          <h2 className="mt-3 text-2xl font-bold sm:text-3xl">
            {ar ? "ثلاث خطوات بسيطة" : "Three simple steps"}
          </h2>
          <p className="mt-3 text-muted-foreground">
            {ar
              ? "من تحديد احتياجك إلى إنشاء قضية متابعة متكاملة — خلال دقائق."
              : "From defining your need to a full tracked matter — in minutes."}
          </p>
        </div>
        <div className="grid gap-6 md:grid-cols-3">
          <StepCard
            icon={<Globe className="h-5 w-5" />}
            step={1}
            ar={ar}
            titleAr="التوجيه"
            titleEn="Guided intake"
            descAr="أين أنت؟ ما حالتك؟ ماذا تحتاج إنجازه في الأردن؟"
            descEn="Where are you? What is your status? What do you need done in Jordan?"
          />
          <StepCard
            icon={<Sparkles className="h-5 w-5" />}
            step={2}
            ar={ar}
            titleAr="توصية وتحليل"
            titleEn="Recommendation & analysis"
            descAr="خدمة موصى بها من الكتالوج، قائمة مستندات، وحكم على أهلية الإنجاز عن بُعد."
            descEn="A recommended service from the catalog, document checklist, and remote-eligibility verdict."
          />
          <StepCard
            icon={<FileText className="h-5 w-5" />}
            step={3}
            ar={ar}
            titleAr="ملف قضية متكامل"
            titleEn="Full matter file"
            descAr="إنشاء قضية، رفع المستندات، متابعة المهام والجدول الزمني، التواصل والدفع."
            descEn="Create a matter, upload documents, track tasks & timeline, communicate and pay."
          />
        </div>
      </section>

      {/* Service catalog preview */}
      <section className="border-y border-border bg-muted/30">
        <div className="container mx-auto px-4 py-16">
          <div className="mb-10 flex flex-wrap items-end justify-between gap-4">
            <div>
              <Badge variant="secondary">{ar ? "كتالوج الخدمات" : "Service catalog"}</Badge>
              <h2 className="mt-3 text-2xl font-bold sm:text-3xl">
                {ar ? "خدمات قانونية أردنية عن بُعد" : "Remote Jordanian legal services"}
              </h2>
              <p className="mt-2 text-sm text-muted-foreground">
                {ar
                  ? "كل خدمة لها إجراء رسمي، قائمة مستندات، ومصادر حكومية واضحة. الذكاء الاصطناعي لا يخترع خدمات خارج هذا الكتالوج."
                  : "Each service has an official procedure, document checklist, and clear government sources. The AI does not invent services outside this catalog."}
              </p>
            </div>
            <Link href="/services">
              <Button variant="outline" className="gap-1.5">
                {ar ? "عرض الكل" : "View all"}
                {ar ? <ArrowLeft className="h-4 w-4" /> : <ArrowRight className="h-4 w-4" />}
              </Button>
            </Link>
          </div>

          {loading ? (
            <div className="grid gap-4 md:grid-cols-3">
              {[0, 1, 2].map((i) => (
                <Card key={i} className="h-48 animate-pulse">
                  <CardContent className="h-full" />
                </Card>
              ))}
            </div>
          ) : (
            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
              {services.slice(0, 6).map((s) => (
                <ServicePreviewCard key={s.id} service={s} ar={ar} />
              ))}
            </div>
          )}
        </div>
      </section>

      {/* What makes us different */}
      <section className="container mx-auto px-4 py-16">
        <div className="mx-auto mb-10 max-w-2xl text-center">
          <Badge variant="secondary">{ar ? "لماذا نحن" : "Why us"}</Badge>
          <h2 className="mt-3 text-2xl font-bold sm:text-3xl">
            {ar ? "ذكاء اصطناعي + محامون + جهات رسمية" : "AI + lawyers + official authorities"}
          </h2>
          <p className="mt-3 text-muted-foreground">
            {ar
              ? "الذكاء الاصطناعي للتنقّي والتوجيه فقط — العمل الحقيقي يقوم به محامون مرخصون وجهات حكومية أردنية."
              : "AI is for navigation and intelligence only — real work is done by licensed lawyers and Jordanian government authorities."}
          </p>
        </div>
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
          <FeatureCard
            icon={<ShieldCheck className="h-5 w-5" />}
            ar={ar}
            titleAr="لا اختراع خدمات"
            titleEn="No invented services"
            descAr="الذكاء الاصطناعي يختار فقط من كتالوج الخدمات الموثقة."
            descEn="The AI picks only from a documented catalog of services."
          />
          <FeatureCard
            icon={<Globe className="h-5 w-5" />}
            ar={ar}
            titleAr="حكم صريح على الأهلية عن بُعد"
            titleEn="Explicit remote-eligibility verdict"
            descAr="لا يدّعي إنجازاً كاملاً عن بُعد ما لم يقل الإجراء ذلك."
            descEn="Never claims full remote completion unless the procedure says so."
          />
          <FeatureCard
            icon={<Landmark className="h-5 w-5" />}
            ar={ar}
            titleAr="شفافية الرسوم"
            titleEn="Fee transparency"
            descAr="رسوم منصة + رسوم محامٍ + رسوم حكومية — مفصولة، لا ادعاء بالشمول."
            descEn="Platform fee + lawyer fee + government fee — separated, no false bundling."
          />
          <FeatureCard
            icon={<Languages className="h-5 w-5" />}
            ar={ar}
            titleAr="ثنائي اللغة"
            titleEn="Bilingual by design"
            descAr="عربي وإنجليزي، RTL وLTR، في كل مكان."
            descEn="Arabic and English, RTL and LTR, everywhere."
          />
        </div>
      </section>

      {/* Final CTA */}
      <section className="container mx-auto px-4 pb-16">
        <div className="relative overflow-hidden rounded-2xl bg-primary p-8 text-primary-foreground sm:p-12">
          <div className="relative grid items-center gap-8 md:grid-cols-2">
            <div>
              <h2 className="text-2xl font-extrabold leading-tight sm:text-3xl">
                {ar ? "جاهز لبدء معاملتك؟" : "Ready to start your matter?"}
              </h2>
              <p className="mt-3 text-sm leading-7 text-primary-foreground/85">
                {ar
                  ? "ابدأ الآن بثلاث خطوات — لا التزام قبل إنشاء القضية."
                  : "Start now in three steps — no commitment before creating a matter."}
              </p>
            </div>
            <div className="flex flex-wrap gap-3 md:justify-end">
              <Link href="/intake">
                <Button size="lg" variant="secondary" className="gap-2">
                  <KeyRound className="h-4 w-4" />
                  {ar ? "ابدأ التوجيه" : "Start guided intake"}
                </Button>
              </Link>
              <Link href="/services">
                <Button size="lg" variant="ghost" className="text-primary-foreground hover:bg-primary-foreground/10">
                  {ar ? "تصفح الخدمات" : "Browse services"}
                </Button>
              </Link>
            </div>
          </div>
        </div>
      </section>
    </div>
  );
}

function HeroFlowDiagram({ ar }: { ar: boolean }) {
  const steps = [
    { icon: Globe, labelAr: "أين أنت؟", labelEn: "Where are you?" },
    { icon: Users, labelAr: "ما حالتك؟", labelEn: "What is your status?" },
    { icon: Scale, labelAr: "ماذا تحتاج؟", labelEn: "What do you need?" },
    { icon: Sparkles, labelAr: "توصية", labelEn: "Recommendation" },
    { icon: FileText, labelAr: "ملف قضية", labelEn: "Matter file" },
  ];
  return (
    <Card className="relative overflow-hidden">
      <CardHeader className="pb-3">
        <CardTitle className="text-sm">
          {ar ? "التدفق الكامل" : "End-to-end flow"}
        </CardTitle>
        <CardDescription className="text-xs">
          {ar ? "من التوجيه إلى التسليم" : "From intake to delivery"}
        </CardDescription>
      </CardHeader>
      <CardContent>
        <div className="space-y-3">
          {steps.map((s, i) => {
            const Icon = s.icon;
            return (
              <div key={i} className="flex items-center gap-3">
                <div className="grid h-8 w-8 place-items-center rounded-full bg-primary text-primary-foreground">
                  <Icon className="h-4 w-4" />
                </div>
                <span className="flex-1 text-sm font-medium">
                  {ar ? s.labelAr : s.labelEn}
                </span>
                {i < steps.length - 1 && (
                  <ArrowLeft className={`h-3 w-3 text-muted-foreground ${ar ? "" : "rotate-180"}`} />
                )}
              </div>
            );
          })}
        </div>
      </CardContent>
    </Card>
  );
}

function StepCard({
  icon, step, ar, titleAr, titleEn, descAr, descEn,
}: {
  icon: React.ReactNode; step: number; ar: boolean;
  titleAr: string; titleEn: string; descAr: string; descEn: string;
}) {
  return (
    <Card className="relative">
      <CardContent className="pt-6">
        <div className="absolute end-4 top-4 grid h-7 w-7 place-items-center rounded-full bg-muted text-xs font-bold">
          {step}
        </div>
        <div className="grid h-12 w-12 place-items-center rounded-xl bg-primary/10 text-primary">
          {icon}
        </div>
        <h3 className="mt-3 text-base font-bold">{ar ? titleAr : titleEn}</h3>
        <p className="mt-2 text-sm leading-7 text-muted-foreground">
          {ar ? descAr : descEn}
        </p>
      </CardContent>
    </Card>
  );
}

function FeatureCard({
  icon, ar, titleAr, titleEn, descAr, descEn,
}: {
  icon: React.ReactNode; ar: boolean;
  titleAr: string; titleEn: string; descAr: string; descEn: string;
}) {
  return (
    <div className="rounded-xl border border-border bg-card p-5">
      <div className="grid h-10 w-10 place-items-center rounded-lg bg-primary/10 text-primary">
        {icon}
      </div>
      <h3 className="mt-3 text-sm font-bold">{ar ? titleAr : titleEn}</h3>
      <p className="mt-1.5 text-sm leading-6 text-muted-foreground">
        {ar ? descAr : descEn}
      </p>
    </div>
  );
}

function ServicePreviewCard({ service, ar }: { service: Service; ar: boolean }) {
  const re = REMOTE_LABEL[service.remoteEligibility] ?? REMOTE_LABEL.unknown;
  const Icon = getServiceIcon(service.slug);
  return (
    <Link href={`/services/${service.slug}`} className="block h-full">
      <Card className="flex h-full flex-col transition-shadow hover:shadow-md">
        <CardContent className="flex flex-1 flex-col pt-6">
          <div className="flex items-start justify-between gap-2">
            <div className="grid h-10 w-10 place-items-center rounded-lg bg-primary/10 text-primary">
              <Icon className="h-5 w-5" />
            </div>
            <Badge variant={re.tone} className="text-[10px]">
              {ar ? re.ar : re.en}
            </Badge>
          </div>
          <h3 className="mt-3 text-base font-bold">
            {ar ? service.nameAr : service.nameEn}
          </h3>
          <p className="mt-1.5 flex-1 text-sm leading-6 text-muted-foreground">
            {ar ? service.shortAr : service.shortEn}
          </p>
          <div className="mt-4 flex items-center justify-between border-t border-border pt-3 text-xs text-muted-foreground">
            <span className="flex items-center gap-1">
              <Clock className="h-3 w-3" />
              {service.typicalDurationDays} {ar ? "يوم" : "days"}
            </span>
            <span className="font-semibold text-foreground">
              {service.lawyerFeeMin}–{service.lawyerFeeMax} JOD
            </span>
          </div>
        </CardContent>
      </Card>
    </Link>
  );
}

function getServiceIcon(slug: string) {
  switch (slug) {
    case "property-sale-from-abroad":
      return Building2;
    case "power-of-attorney":
      return KeyRound;
    case "inheritance-initiation":
      return ScrollText;
    case "civil-status-update":
      return Users;
    case "company-formation":
      return Briefcase;
    case "court-representation":
      return Gavel;
    default:
      return Scale;
  }
}
