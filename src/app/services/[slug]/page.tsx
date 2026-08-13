"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useParams } from "next/navigation";
import { useLocale } from "@/lib/locale-provider";
import { ServiceProviderNotice, AIUsageNotice } from "@/components/legal-disclaimer";
import { useSession } from "@/lib/session-provider";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Alert, AlertDescription } from "@/components/ui/alert";
import {
  ArrowLeft, ArrowRight, Clock, FileText, Globe, Landmark, Scale,
  ShieldAlert, CheckCircle2, Building2, KeyRound, ScrollText, Users, Briefcase, Gavel, Loader2,
} from "lucide-react";

type ServiceDetail = {
  id: string; slug: string; code: string;
  nameAr: string; nameEn: string;
  shortAr: string; shortEn: string;
  descriptionAr: string; descriptionEn: string;
  defaultRemoteEligibility: string;
  platformFeeDefault: number;
  lawyerFeeMin: number; lawyerFeeMax: number;
  governmentFeeEstimate: number;
  governmentFeeNoteAr: string | null; governmentFeeNoteEn: string | null;
  typicalDurationDays: number;
  practiceArea: { slug: string; nameAr: string; nameEn: string } | null;
  procedure: {
    id: string; slug: string;
    nameAr: string; nameEn: string;
    remoteEligibility: string;
    remoteEligibilityReasonAr: string; remoteEligibilityReasonEn: string;
    physicalPresenceStepsJson: string;
    remoteStepsJson: string;
    authorityAr: string | null; authorityEn: string | null;
    legalBasisAr: string | null; legalBasisEn: string | null;
    notesAr: string | null; notesEn: string | null;
    estimatedDurationDays: number;
  } | null;
  documentRequirements: {
    id: string; slug: string;
    nameAr: string; nameEn: string;
    descriptionAr: string | null; descriptionEn: string | null;
    isRequired: boolean; provider: string; stage: string;
    acceptsDigital: boolean; requiresOriginal: boolean;
    requiresNotarization: boolean; requiresApostille: boolean;
  }[];
  officialSources: {
    id: string; slug: string;
    nameAr: string; nameEn: string;
    url: string | null;
    authorityType: string;
    notesAr: string | null; notesEn: string | null;
  }[];
};

export default function ServiceDetailPage() {
  const params = useParams<{ slug: string }>();
  const { locale } = useLocale();
  const { user } = useSession();
  const ar = locale === "ar";
  const [service, setService] = useState<ServiceDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!params?.slug) return;
    fetch(`/api/legal/services/${params.slug}`)
      .then(async (r) => {
        if (!r.ok) throw new Error("not found");
        return r.json();
      })
      .then((d) => setService(d.service))
      .catch((e) => setError(e.message))
      .finally(() => setLoading(false));
  }, [params?.slug]);

  if (loading) {
    return (
      <div className="container mx-auto px-4 py-16">
        <div className="flex justify-center">
          <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
        </div>
      </div>
    );
  }
  if (error || !service) {
    return (
      <div className="container mx-auto px-4 py-16">
        <Card>
          <CardContent className="py-8 text-center">
            <p className="text-sm text-muted-foreground">{ar ? "الخدمة غير موجودة." : "Service not found."}</p>
            <Link href="/services" className="mt-2 inline-block">
              <Button variant="outline">{ar ? "العودة للكتالوج" : "Back to catalog"}</Button>
            </Link>
          </CardContent>
        </Card>
      </div>
    );
  }

  const procedure = service.procedure;
  const remoteEligibility = procedure?.remoteEligibility ?? service.defaultRemoteEligibility;
  const physicalSteps = procedure ? (JSON.parse(procedure.physicalPresenceStepsJson || "[]") as { ar: string; en: string }[]) : [];
  const remoteSteps = procedure ? (JSON.parse(procedure.remoteStepsJson || "[]") as { ar: string; en: string }[]) : [];

  return (
    <div className="container mx-auto px-4 py-8 lg:py-12">
      <Link href="/services" className="mb-4 inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground">
        {ar ? <ArrowRight className="h-4 w-4" /> : <ArrowLeft className="h-4 w-4" />}
        {ar ? "العودة للكتالوج" : "Back to catalog"}
      </Link>

      {/* Header */}
      <Card className="mb-4">
        <CardContent className="pt-6">
          <div className="flex flex-wrap items-start justify-between gap-3">
            <div>
              <div className="mb-2 flex flex-wrap gap-2">
                <Badge variant="secondary" className="gap-1">
                  <Globe className="h-3 w-3" />
                  {remoteLabel(remoteEligibility, ar)}
                </Badge>
                <Badge variant="outline">{service.code}</Badge>
                {service.practiceArea && (
                  <Badge variant="outline">{ar ? service.practiceArea.nameAr : service.practiceArea.nameEn}</Badge>
                )}
              </div>
              <h1 className="text-2xl font-bold sm:text-3xl">{ar ? service.nameAr : service.nameEn}</h1>
              <p className="mt-2 max-w-2xl text-sm text-muted-foreground">
                {ar ? service.shortAr : service.shortEn}
              </p>
            </div>
            <div className="flex flex-col items-end gap-2 text-end">
              <div className="text-xs text-muted-foreground">{ar ? "رسوم المحامي" : "Lawyer fee"}</div>
              <div className="text-lg font-bold">{service.lawyerFeeMin}–{service.lawyerFeeMax} JOD</div>
              <div className="flex items-center gap-1 text-xs text-muted-foreground">
                <Clock className="h-3 w-3" />
                {ar ? `${service.typicalDurationDays} يوم` : `${service.typicalDurationDays} days`}
              </div>
            </div>
          </div>
          <p className="mt-4 text-sm leading-7 text-muted-foreground">
            {ar ? service.descriptionAr : service.descriptionEn}
          </p>
        </CardContent>
      </Card>

      {/* Remote eligibility */}
      {procedure && (
        <Card className="mb-4 border-primary/30 bg-primary/5">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-base">
              <Globe className="h-4 w-4" />
              {ar ? "أهلية الإنجاز عن بُعد" : "Remote-eligibility verdict"}
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <p className="text-sm leading-7">
              {ar ? procedure.remoteEligibilityReasonAr : procedure.remoteEligibilityReasonEn}
            </p>
            <div className="grid gap-4 sm:grid-cols-2">
              <div>
                <p className="mb-2 text-xs font-semibold text-emerald-700">
                  {ar ? "خطوات عن بُعد" : "Remote steps"}
                </p>
                <ul className="space-y-1.5">
                  {remoteSteps.length === 0 ? (
                    <li className="text-xs text-muted-foreground">{ar ? "لا توجد" : "None"}</li>
                  ) : (
                    remoteSteps.map((s, i) => (
                      <li key={i} className="flex items-start gap-1.5 text-xs">
                        <CheckCircle2 className="mt-0.5 h-3 w-3 flex-shrink-0 text-emerald-600" />
                        <span>{ar ? s.ar : s.en}</span>
                      </li>
                    ))
                  )}
                </ul>
              </div>
              <div>
                <p className="mb-2 text-xs font-semibold text-amber-700">
                  {ar ? "خطوات بحاجة لحضور شخصي" : "Physical presence steps"}
                </p>
                <ul className="space-y-1.5">
                  {physicalSteps.length === 0 ? (
                    <li className="text-xs text-muted-foreground">{ar ? "لا توجد" : "None"}</li>
                  ) : (
                    physicalSteps.map((s, i) => (
                      <li key={i} className="flex items-start gap-1.5 text-xs">
                        <ShieldAlert className="mt-0.5 h-3 w-3 flex-shrink-0 text-amber-600" />
                        <span>{ar ? s.ar : s.en}</span>
                      </li>
                    ))
                  )}
                </ul>
              </div>
            </div>
            <div className="grid gap-2 border-t border-border pt-3 text-xs text-muted-foreground sm:grid-cols-2">
              {procedure.authorityAr && (
                <div className="flex items-center gap-1.5">
                  <Landmark className="h-3 w-3" />
                  {ar ? procedure.authorityAr : procedure.authorityEn}
                </div>
              )}
              {procedure.legalBasisAr && (
                <div className="flex items-center gap-1.5">
                  <Scale className="h-3 w-3" />
                  {ar ? procedure.legalBasisAr : procedure.legalBasisEn}
                </div>
              )}
            </div>
            {procedure.notesAr && (
              <Alert>
                <AlertDescription className="text-xs">
                  {ar ? procedure.notesAr : procedure.notesEn}
                </AlertDescription>
              </Alert>
            )}
          </CardContent>
        </Card>
      )}

      {/* Fee breakdown */}
      <Card className="mb-4">
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-base">
            <Building2 className="h-4 w-4" />
            {ar ? "تقسيم الرسوم" : "Fee breakdown"}
          </CardTitle>
          <CardDescription className="text-xs">
            {ar
              ? "نفصل الرسوم بوضوح — لا ندّعي أبداً أن رسوم الحكومة مشمولة ما لم نكن متأكدين."
              : "We separate fees clearly — we never claim government fees are included unless we are sure."}
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-3">
          <div className="grid gap-2 sm:grid-cols-3">
            <FeeBox ar={ar} labelAr="رسوم المنصة" labelEn="Platform fee" value={`${service.platformFeeDefault} JOD`} />
            <FeeBox ar={ar} labelAr="رسوم المحامي" labelEn="Lawyer fee" value={`${service.lawyerFeeMin}–${service.lawyerFeeMax} JOD`} />
            <FeeBox ar={ar} labelAr="رسوم حكومية (منفصلة)" labelEn="Government fee (separate)" value={service.governmentFeeEstimate > 0 ? `${service.governmentFeeEstimate} JOD` : "—"} />
          </div>
          {service.governmentFeeNoteAr && (
            <Alert>
              <ShieldAlert className="h-4 w-4" />
              <AlertDescription className="text-xs">
                {ar ? service.governmentFeeNoteAr : service.governmentFeeNoteEn}
              </AlertDescription>
            </Alert>
          )}
        </CardContent>
      </Card>

      {/* Document requirements */}
      <Card className="mb-4">
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-base">
            <FileText className="h-4 w-4" />
            {ar ? "المستندات المطلوبة" : "Document requirements"}
          </CardTitle>
          <CardDescription className="text-xs">
            {ar
              ? "ستُنسخ تلقائياً إلى ملف القضية عند الإنشاء."
              : "These are auto-cloned into your matter file on creation."}
          </CardDescription>
        </CardHeader>
        <CardContent>
          <ul className="space-y-2">
            {service.documentRequirements.map((d) => (
              <li key={d.id} className="rounded-lg border border-border p-3">
                <div className="flex flex-wrap items-start justify-between gap-2">
                  <div className="min-w-0 flex-1">
                    <p className="text-sm font-medium">{ar ? d.nameAr : d.nameEn}</p>
                    {d.descriptionAr && (
                      <p className="mt-0.5 text-xs text-muted-foreground">
                        {ar ? d.descriptionAr : d.descriptionEn}
                      </p>
                    )}
                  </div>
                  <div className="flex flex-wrap gap-1">
                    <Badge variant={d.isRequired ? "default" : "secondary"} className="text-[10px]">
                      {d.isRequired ? (ar ? "مطلوب" : "Required") : (ar ? "اختياري" : "Optional")}
                    </Badge>
                    <Badge variant="outline" className="text-[10px]">
                      {ar ? `يُقدّمه: ${providerLabel(d.provider, ar)}` : `Provider: ${providerLabel(d.provider, ar)}`}
                    </Badge>
                    <Badge variant="outline" className="text-[10px]">
                      {stageLabel(d.stage, ar)}
                    </Badge>
                  </div>
                </div>
                {(d.requiresOriginal || d.requiresNotarization || d.requiresApostille || !d.acceptsDigital) && (
                  <div className="mt-2 flex flex-wrap gap-1">
                    {!d.acceptsDigital && <Badge variant="destructive" className="text-[10px]">{ar ? "لا يقبل النسخ الرقمية" : "No digital copy"}</Badge>}
                    {d.requiresOriginal && <Badge variant="warning" className="text-[10px]">{ar ? "أصلي" : "Original"}</Badge>}
                    {d.requiresNotarization && <Badge variant="warning" className="text-[10px]">{ar ? "موثّق" : "Notarized"}</Badge>}
                    {d.requiresApostille && <Badge variant="warning" className="text-[10px]">{ar ? "تصديق" : "Apostille"}</Badge>}
                  </div>
                )}
              </li>
            ))}
          </ul>
        </CardContent>
      </Card>

      {/* Official sources */}
      {service.officialSources.length > 0 && (
        <Card className="mb-4">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-base">
              <Landmark className="h-4 w-4" />
              {ar ? "المصادر الرسمية" : "Official sources"}
            </CardTitle>
          </CardHeader>
          <CardContent>
            <ul className="space-y-2">
              {service.officialSources.map((os) => (
                <li key={os.id} className="rounded-lg border border-border p-3">
                  <div className="flex items-start justify-between gap-2">
                    <div>
                      <p className="text-sm font-medium">{ar ? os.nameAr : os.nameEn}</p>
                      <p className="text-xs text-muted-foreground">{authorityTypeLabel(os.authorityType, ar)}</p>
                      {os.notesAr && (
                        <p className="mt-1 text-xs text-muted-foreground">
                          {ar ? os.notesAr : os.notesEn}
                        </p>
                      )}
                    </div>
                    {os.url && (
                      <a href={os.url} target="_blank" rel="noopener noreferrer">
                        <Button variant="outline" size="sm">
                          {ar ? "زيارة" : "Visit"}
                        </Button>
                      </a>
                    )}
                  </div>
                </li>
              ))}
            </ul>
          </CardContent>
        </Card>
      )}

      {/* Contextual legal notices and CTA */}
      <ServiceProviderNotice className="mb-4" />
      <AIUsageNotice className="mb-4" />
      <Card>
        <CardContent className="space-y-3 py-6">
          {user ? (
            <Link href="/intake" className="block">
              <Button className="w-full gap-2" size="lg">
                <KeyRound className="h-4 w-4" />
                {ar ? "ابدأ توجيهاً لهذه الخدمة" : "Start intake for this service"}
              </Button>
            </Link>
          ) : (
            <Alert>
              <ShieldAlert className="h-4 w-4" />
              <AlertDescription>
                {ar
                  ? "سجّل الدخول بحساب تجريبي من الأعلى لبدء توجيه."
                  : "Sign in with a demo account above to start an intake."}
              </AlertDescription>
            </Alert>
          )}
        </CardContent>
      </Card>
    </div>
  );
}

function remoteLabel(re: string, ar: boolean): string {
  if (re === "fully_remote") return ar ? "عن بُعد بالكامل" : "Fully remote";
  if (re === "partially_remote") return ar ? "جزئياً عن بُعد" : "Partially remote";
  if (re === "in_person_required") return ar ? "يتطلب حضوراً" : "In-person required";
  return ar ? "غير محدد" : "Unknown";
}
function providerLabel(p: string, ar: boolean): string {
  if (p === "client") return ar ? "الموكل" : "Client";
  if (p === "lawyer") return ar ? "المحامي" : "Lawyer";
  if (p === "authority") return ar ? "الجهة" : "Authority";
  return p;
}
function stageLabel(s: string, ar: boolean): string {
  const map: Record<string, { ar: string; en: string }> = {
    at_intake: { ar: "عند الاستلام", en: "At intake" },
    at_filing: { ar: "عند التقديم", en: "At filing" },
    at_signing: { ar: "عند التوقيع", en: "At signing" },
    at_notary: { ar: "عند التوثيق", en: "At notary" },
    ongoing: { ar: "مستمر", en: "Ongoing" },
  };
  const v = map[s] ?? { ar: s, en: s };
  return ar ? v.ar : v.en;
}
function authorityTypeLabel(t: string, ar: boolean): string {
  const map: Record<string, { ar: string; en: string }> = {
    ministry: { ar: "وزارة", en: "Ministry" },
    court: { ar: "محكمة", en: "Court" },
    notary: { ar: "كاتب عدل", en: "Notary" },
    land_dept: { ar: "دائرة الأراضي", en: "Land Department" },
    civil_status: { ar: "الأحوال المدنية", en: "Civil Status" },
    companies_ctrl: { ar: "مراقب الشركات", en: "Companies Control" },
    other: { ar: "أخرى", en: "Other" },
  };
  const v = map[t] ?? { ar: t, en: t };
  return ar ? v.ar : v.en;
}
function FeeBox({ ar, labelAr, labelEn, value }: { ar: boolean; labelAr: string; labelEn: string; value: string }) {
  return (
    <div className="rounded-lg border border-border p-3">
      <p className="text-xs text-muted-foreground">{ar ? labelAr : labelEn}</p>
      <p className="mt-1 text-sm font-bold">{value}</p>
    </div>
  );
}
