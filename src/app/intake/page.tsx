"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { useLocale } from "@/lib/locale-provider";
import { useSession } from "@/lib/session-provider";
import { Button } from "@/components/ui/button";
import { LegalNotice, AIUsageNotice, LawyerEngagementDisclaimer } from "@/components/legal-disclaimer";
import { DISCLAIMER_VERSION } from "@/lib/legal-disclaimer";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Textarea } from "@/components/ui/textarea";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Globe,
  Users,
  Scale,
  Sparkles,
  ArrowLeft,
  ArrowRight,
  Loader2,
  CheckCircle2,
  ShieldAlert,
  Clock,
  FileText,
  Building2,
  Landmark,
  KeyRound,
  XCircle,
} from "lucide-react";

type Step = "where" | "status" | "need" | "analyzing" | "result";

const COUNTRIES = [
  "United States", "United Kingdom", "Canada", "Germany", "France",
  "Saudi Arabia", "United Arab Emirates", "Qatar", "Kuwait", "Bahrain", "Oman",
  "Egypt", "Iraq", "Syria", "Lebanon", "Palestine", "Turkey", "Jordan", "Other",
];

const STATUSES = [
  { value: "jordanian_abroad", ar: "أردني مغترب", en: "Jordanian abroad" },
  { value: "foreigner", ar: "أجنبي", en: "Foreigner" },
  { value: "dual", ar: "مزدوج الجنسية", en: "Dual citizen" },
  { value: "resident", ar: "مقيم في الأردن", en: "Resident in Jordan" },
  { value: "visitor", ar: "زائر", en: "Visitor" },
];

const NEED_PRESETS = [
  { slug: "property-sale-from-abroad", ar: "بيع عقار لي في الأردن", en: "Sell a property I own in Jordan" },
  { slug: "power-of-attorney", ar: "إصدار توكيل رسمي", en: "Issue an official power of attorney" },
  { slug: "inheritance-initiation", ar: "فتح تركة لمتوفى", en: "Open an inheritance estate" },
  { slug: "civil-status-update", ar: "تحديث قيد الأحوال المدنية", en: "Update civil status record" },
  { slug: "company-formation", ar: "تأسيس شركة", en: "Incorporate a company" },
  { slug: "court-representation", ar: "تمثيل في قضية أمام المحاكم", en: "Representation in a court case" },
];

const REMOTE_TONES: Record<string, "success" | "warning" | "danger" | "secondary"> = {
  fully_remote: "success",
  partially_remote: "warning",
  in_person_required: "danger",
  unknown: "secondary",
};

const REMOTE_LABEL: Record<string, { ar: string; en: string }> = {
  fully_remote: { ar: "قابل للإنجاز عن بُعد بالكامل", en: "Fully remote eligible" },
  partially_remote: { ar: "قابل للإنجاز جزئياً عن بُعد", en: "Partially remote eligible" },
  in_person_required: { ar: "يتطلب حضوراً شخصياً", en: "In-person presence required" },
  unknown: { ar: "غير محدد", en: "Unknown" },
};

type ProcedureStep = { ar: string; en: string };

type Recommendation = {
  service: {
    id: string; slug: string; nameAr: string; nameEn: string;
    shortAr: string; shortEn: string;
    descriptionAr: string; descriptionEn: string;
    platformFeeDefault: number; lawyerFeeMin: number; lawyerFeeMax: number;
    governmentFeeEstimate: number;
    governmentFeeNoteAr: string | null; governmentFeeNoteEn: string | null;
    typicalDurationDays: number;
  };
  procedure: {
    id: string; slug: string;
    nameAr: string; nameEn: string;
    remoteEligibility: string;
    remoteEligibilityReasonAr: string; remoteEligibilityReasonEn: string;
    physicalPresenceSteps: unknown;
    remoteSteps: unknown;
    authorityAr: string | null; authorityEn: string | null;
    legalBasisAr: string | null; legalBasisEn: string | null;
    notesAr: string | null; notesEn: string | null;
    estimatedDurationDays: number;
  } | null;
  matchedKeywords: string[];
  confidence: number;
  remoteEligibility: string;
  remoteEligibilityReasonAr: string | null;
  remoteEligibilityReasonEn: string | null;
  documentSlugs: { slug: string; nameAr: string; nameEn: string; isRequired: boolean }[];
};

export default function IntakePage() {
  const router = useRouter();
  const { locale } = useLocale();
  const { user } = useSession();
  const ar = locale === "ar";

  const [step, setStep] = useState<Step>("where");
  const [clientName, setClientName] = useState("");
  const [clientPhone, setClientPhone] = useState("");
  const [clientEmail, setClientEmail] = useState("");
  const [country, setCountry] = useState("");
  const [city, setCity] = useState("");
  const [status, setStatus] = useState<string>("");
  const [needPreset, setNeedPreset] = useState<string>("");
  const [needText, setNeedText] = useState("");
  const [urgency, setUrgency] = useState<"low" | "medium" | "high">("medium");
  const [error, setError] = useState<string | null>(null);
  const [intakeId, setIntakeId] = useState<string | null>(null);
  const [recommendation, setRecommendation] = useState<Recommendation | null>(null);
  const [engagementAcknowledged, setEngagementAcknowledged] = useState(false);

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const selectedSlug = params.get("service");
    const prompt = ar ? params.get("promptAr") : params.get("promptEn");
    if (selectedSlug) setNeedPreset(selectedSlug);
    if (prompt) setNeedText(prompt);
  }, [ar]);

  function pickPreset(slug: string) {
    const preset = NEED_PRESETS.find((p) => p.slug === slug);
    if (!preset) return;
    setNeedPreset(slug);
    setNeedText(ar ? preset.ar : preset.en);
  }

  function getErrorMessage(data: { error?: string; message?: string; requestId?: string }) {
    if (data.error === "internal_error") {
      return ar
        ? "تعذر تحليل الطلب حالياً. يرجى المحاولة مرة أخرى بعد قليل."
        : "We could not analyze your request right now. Please try again shortly.";
    }
    if (data.error === "unauthorized") {
      return ar ? "يرجى تسجيل الدخول أولاً." : "Please sign in first.";
    }
    if (data.error === "rate_limited") {
      return ar ? "تم تجاوز الحد المؤقت للطلبات. يرجى المحاولة لاحقاً." : "Too many requests. Please try again later.";
    }
    return data.message || data.error || (ar ? "حدث خطأ غير متوقع." : "Something went wrong.");
  }

  async function analyze() {
    if (!user) {
      router.push("/#signin");
      return;
    }
    if (needText.trim().length < 10) {
      setError(ar ? "اكتب 10 أحرف على الأقل" : "Please write at least 10 characters");
      return;
    }
    setError(null);
    setStep("analyzing");
    try {
      const res = await fetch("/api/legal/intake", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          text: needText,
          language: locale,
          clientName: clientName.trim() || undefined,
          clientPhone: clientPhone.trim() || undefined,
          clientEmail: clientEmail.trim() || undefined,
          selectedServiceSlug: needPreset || undefined,
          clientCountry: country || undefined,
          clientCity: city || undefined,
          clientStatus: status || undefined,
          urgency,
        }),
      });
      const data = await res.json();
      if (!res.ok) {
        setError(getErrorMessage(data));
        setStep("need");
        return;
      }
      setIntakeId(data.intakeId);
      setRecommendation(data.recommendation ?? null);
      setStep("result");
    } catch (e) {
      setError(ar ? "تعذر الاتصال بالخدمة. تحقق من الاتصال وحاول مرة أخرى." : "The service could not be reached. Check your connection and try again.");
      setStep("need");
    }
  }

  async function createMatter() {
    if (!intakeId || !recommendation) return;
    if (!engagementAcknowledged) {
      setError(ar ? "يرجى تأكيد فهمك لطبيعة العلاقة مع المحامي قبل المتابعة." : "Please acknowledge the independent-lawyer relationship before continuing.");
      return;
    }
    setError(null);
    try {
      const res = await fetch("/api/legal/matters", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          intakeId,
          legalServiceId: recommendation.service.id,
          legalProcedureId: recommendation.procedure?.id,
          title: ar ? recommendation.service.nameAr : recommendation.service.nameEn,
          facts: needText,
          urgency,
          clientCountry: country || undefined,
          clientCity: city || undefined,
          clientStatus: status || undefined,
          platformFeeJOD: recommendation.service.platformFeeDefault,
          lawyerFeeJOD: recommendation.service.lawyerFeeMin,
          governmentFeeJOD: recommendation.service.governmentFeeEstimate,
          governmentFeeIncluded: false,
          disclaimerAcknowledged: true,
          disclaimerVersion: DISCLAIMER_VERSION,
          feeNotesAr: recommendation.service.governmentFeeNoteAr,
          feeNotesEn: recommendation.service.governmentFeeNoteEn,
        }),
      });
      const data = await res.json();
      if (!res.ok) {
        setError(getErrorMessage(data));
        return;
      }
      router.push(`/matters/${data.matter.id}`);
    } catch (e) {
      setError(ar ? "تعذر الاتصال بالخدمة. تحقق من الاتصال وحاول مرة أخرى." : "The service could not be reached. Check your connection and try again.");
    }
  }

  function restart() {
    setStep("where");
    setClientName("");
    setClientPhone("");
    setClientEmail("");
    setCountry("");
    setCity("");
    setStatus("");
    setNeedPreset("");
    setNeedText("");
    setUrgency("medium");
    setError(null);
    setIntakeId(null);
    setRecommendation(null);
    setEngagementAcknowledged(false);
  }

  if (!user) {
    return (
      <div className="container mx-auto px-4 py-16">
        <Card className="mx-auto max-w-md">
          <CardHeader>
            <CardTitle>{ar ? "تسجيل الدخول مطلوب" : "Sign in required"}</CardTitle>
            <CardDescription>
              {ar
                ? "التوجيه الذكي يحتاج إلى حساب لحفظ التحليل وربطه بقضيتك."
                : "AI intake requires an account so we can save your analysis and link it to your matter."}
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Alert>
              <ShieldAlert className="h-4 w-4" />
              <AlertTitle>{ar ? "استخدم حساباً تجريبياً" : "Use a demo account"}</AlertTitle>
              <AlertDescription>
                {ar
                  ? "اضغط زر «تسجيل الدخول» في الأعلى ثم اختر أحد الحسابات التجريبية."
                  : 'Click "Sign in" at the top and pick one of the demo accounts.'}
              </AlertDescription>
            </Alert>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="container mx-auto px-4 py-8 lg:py-12">
      <div className="mx-auto max-w-3xl">
        <LegalNotice className="mb-4" />
        <div className="mb-6 flex items-center gap-3">
          <div className="grid h-12 w-12 place-items-center rounded-2xl bg-primary text-primary-foreground">
            <Sparkles className="h-6 w-6" />
          </div>
          <div>
            <h1 className="text-2xl font-bold sm:text-3xl">
              {ar ? "توجيه قانوني ذكي" : "AI Legal Intake"}
            </h1>
            <p className="text-sm text-muted-foreground">
              {ar
                ? "ثلاث خطوات: أين أنت، ما حالتك، ماذا تحتاج إنجازه في الأردن."
                : "Three steps: where you are, your status, what you need done in Jordan."}
            </p>
          </div>
        </div>

        {/* Stepper */}
        <div className="mb-8 flex items-center justify-between gap-2">
          {[
            { key: "where", ar: "أين أنت", en: "Where", icon: Globe },
            { key: "status", ar: "حالتك", en: "Status", icon: Users },
            { key: "need", ar: "احتياجك", en: "Need", icon: Scale },
          ].map((s, i) => {
            const isActive = step === s.key;
            const isDone = ["where", "status", "need"].indexOf(step) > i || step === "analyzing" || step === "result";
            const Icon = s.icon;
            return (
              <div key={s.key} className="flex flex-1 items-center">
                <div className="flex items-center gap-2">
                  <div
                    className={`grid h-8 w-8 place-items-center rounded-full text-xs font-bold transition-colors ${
                      isActive ? "bg-primary text-primary-foreground"
                      : isDone ? "bg-emerald-500 text-white"
                      : "bg-muted text-muted-foreground"
                    }`}
                  >
                    {isDone ? <CheckCircle2 className="h-4 w-4" /> : <Icon className="h-4 w-4" />}
                  </div>
                  <span className={`text-xs font-medium ${isActive ? "text-foreground" : "text-muted-foreground"}`}>
                    {ar ? s.ar : s.en}
                  </span>
                </div>
                {i < 2 && <div className="mx-2 h-px flex-1 bg-border" />}
              </div>
            );
          })}
        </div>

        {/* Step 1: Where */}
        {step === "where" && (
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Globe className="h-5 w-5" />
                {ar ? "أين أنت الآن؟" : "Where are you right now?"}
              </CardTitle>
              <CardDescription>
                {ar
                  ? "نحتاج معرفة بلدك ومدينتك لتحديد ما يمكن إنجازه عن بُعد."
                  : "We need to know your country and city to determine what can be done remotely."}
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid gap-4 sm:grid-cols-2">
                <div className="sm:col-span-2">
                  <Label htmlFor="clientName">{ar ? "الاسم الكامل" : "Full name"}</Label>
                  <Input id="clientName" value={clientName} onChange={(e) => setClientName(e.target.value)} placeholder={ar ? "اكتب اسمك الكامل" : "Enter your full name"} />
                </div>
                <div>
                  <Label htmlFor="clientPhone">{ar ? "رقم الهاتف / واتساب" : "Phone / WhatsApp"}</Label>
                  <Input id="clientPhone" value={clientPhone} onChange={(e) => setClientPhone(e.target.value)} placeholder={ar ? "+962 …" : "+962 …"} />
                </div>
                <div>
                  <Label htmlFor="clientEmail">{ar ? "البريد الإلكتروني" : "Email"}</Label>
                  <Input id="clientEmail" type="email" value={clientEmail} onChange={(e) => setClientEmail(e.target.value)} placeholder={ar ? "name@example.com" : "name@example.com"} />
                </div>
              </div>
              <div>
                <Label htmlFor="country">{ar ? "الدولة التي تقيم فيها" : "Country of residence"}</Label>
                <select
                  id="country"
                  value={country}
                  onChange={(e) => setCountry(e.target.value)}
                  className="mt-1 w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
                >
                  <option value="">{ar ? "اختر الدولة…" : "Select country…"}</option>
                  {COUNTRIES.map((c) => (
                    <option key={c} value={c}>{c}</option>
                  ))}
                </select>
              </div>
              <div>
                <Label htmlFor="city">{ar ? "المدينة" : "City"}</Label>
                <Input
                  id="city"
                  value={city}
                  onChange={(e) => setCity(e.target.value)}
                  placeholder={ar ? "مثال: واشنطن" : "e.g., Washington"}
                />
              </div>
              <div className="flex justify-end gap-2 pt-2">
                <Button onClick={() => setStep("status")} disabled={!clientName.trim() || !clientPhone.trim() || !country}>
                  {ar ? "التالي" : "Next"}
                  {ar ? <ArrowLeft className="h-4 w-4" /> : <ArrowRight className="h-4 w-4" />}
                </Button>
              </div>
            </CardContent>
          </Card>
        )}

        {/* Step 2: Status */}
        {step === "status" && (
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Users className="h-5 w-5" />
                {ar ? "ما هي حالتك؟" : "What is your status?"}
              </CardTitle>
              <CardDescription>
                {ar
                  ? "هذا يؤثر على الإجراءات المتاحة (مثلاً: المواطن الأردني يمكنه استخدام السفارة، أما الأجنبي فيحتاج إجراءات مختلفة)."
                  : "This affects available procedures (e.g., a Jordanian citizen can use the embassy; a foreigner needs different steps)."}
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-3">
              <div className="grid gap-2 sm:grid-cols-2">
                {STATUSES.map((s) => (
                  <button
                    key={s.value}
                    type="button"
                    onClick={() => setStatus(s.value)}
                    className={`rounded-lg border p-3 text-sm text-start transition-colors ${
                      status === s.value ? "border-primary bg-primary/5" : "border-border hover:border-primary/50"
                    }`}
                  >
                    <span className="font-medium">{ar ? s.ar : s.en}</span>
                  </button>
                ))}
              </div>
              <div className="flex justify-between gap-2 pt-2">
                <Button variant="ghost" onClick={() => setStep("where")}>
                  {ar ? <ArrowRight className="h-4 w-4" /> : <ArrowLeft className="h-4 w-4" />}
                  {ar ? "السابق" : "Back"}
                </Button>
                <Button onClick={() => setStep("need")} disabled={!status}>
                  {ar ? "التالي" : "Next"}
                  {ar ? <ArrowLeft className="h-4 w-4" /> : <ArrowRight className="h-4 w-4" />}
                </Button>
              </div>
            </CardContent>
          </Card>
        )}

        {/* Step 3: Need */}
        {step === "need" && (
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Scale className="h-5 w-5" />
                {ar ? "ماذا تحتاج إنجازه في الأردن؟" : "What do you need done in Jordan?"}
              </CardTitle>
              <CardDescription>
                {ar
                  ? "اختر من الخيارات الشائعة أو اكتب احتياجك بحرية. الذكاء الاصطناعي يطابقه فقط مع كتالوج الخدمات — لا يخترع."
                  : "Pick a common option or write your need freely. The AI matches only against the service catalog — it does not invent."}
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid gap-2 sm:grid-cols-2">
                {NEED_PRESETS.map((p) => (
                  <button
                    key={p.slug}
                    type="button"
                    onClick={() => pickPreset(p.slug)}
                    className={`rounded-lg border p-3 text-sm text-start transition-colors ${
                      needPreset === p.slug ? "border-primary bg-primary/5" : "border-border hover:border-primary/50"
                    }`}
                  >
                    <span className="font-medium">{ar ? p.ar : p.en}</span>
                  </button>
                ))}
              </div>
              <div>
                <Label htmlFor="need">{ar ? "وصف احتياجك" : "Describe your need"}</Label>
                <Textarea
                  id="need"
                  value={needText}
                  onChange={(e) => {
                    setNeedText(e.target.value);
                    setNeedPreset("");
                  }}
                  rows={4}
                  placeholder={ar
                    ? "مثال: أريد بيع شقتي في عمّان. أنا في الولايات المتحدة ولا أستطيع السفر للأردن."
                    : "Example: I want to sell my apartment in Amman. I'm in the US and cannot travel to Jordan."}
                />
                <p className="mt-1 text-xs text-muted-foreground">{needText.length} / 8000</p>
                {needPreset && <p className="rounded-md bg-primary/5 px-3 py-2 text-xs text-primary">{ar ? "الإجراء المختار محفوظ في طلبك." : "Your selected procedure is attached to this intake."}</p>}
              </div>
              <div>
                <Label>{ar ? "الإلحاح" : "Urgency"}</Label>
                <div className="mt-1 flex gap-2">
                  {(["low", "medium", "high"] as const).map((u) => (
                    <button
                      key={u}
                      type="button"
                      onClick={() => setUrgency(u)}
                      className={`rounded-md border px-3 py-1.5 text-xs font-medium transition-colors ${
                        urgency === u ? "border-primary bg-primary/5" : "border-border"
                      }`}
                    >
                      {ar
                        ? u === "low" ? "منخفض" : u === "medium" ? "متوسط" : "عالٍ"
                        : u === "low" ? "Low" : u === "medium" ? "Medium" : "High"}
                    </button>
                  ))}
                </div>
              </div>
              {error && <Alert variant="destructive"><AlertDescription>{error}</AlertDescription></Alert>}
              <div className="flex justify-between gap-2 pt-2">
                <Button variant="ghost" onClick={() => setStep("status")}>
                  {ar ? <ArrowRight className="h-4 w-4" /> : <ArrowLeft className="h-4 w-4" />}
                  {ar ? "السابق" : "Back"}
                </Button>
                <Button onClick={analyze} disabled={needText.trim().length < 10} className="gap-2">
                  <Sparkles className="h-4 w-4" />
                  {ar ? "حلّل" : "Analyze"}
                </Button>
              </div>
            </CardContent>
          </Card>
        )}

        {/* Analyzing */}
        {step === "analyzing" && (
          <Card>
            <CardContent className="py-16">
              <div className="flex flex-col items-center gap-3 text-center">
                <Loader2 className="h-10 w-10 animate-spin text-primary" />
                <p className="text-sm text-muted-foreground">
                  {ar
                    ? "نطابق احتياجك مع كتالوج الخدمات ونحدد أهلية الإنجاز عن بُعد…"
                    : "Matching your need against the service catalog and determining remote eligibility…"}
                </p>
              </div>
            </CardContent>
          </Card>
        )}

        {/* Result */}
        {step === "result" && (
          <div className="space-y-4">
            {recommendation ? (
              <RecommendationView
                rec={recommendation}
                ar={ar}
                onCreateMatter={createMatter}
                onRestart={restart}
                userCountry={country}
                userStatus={status}
                engagementAcknowledged={engagementAcknowledged}
                onEngagementAcknowledged={setEngagementAcknowledged}
              />
            ) : (
              <NoMatchView ar={ar} onRestart={restart} />
            )}
            {error && <Alert variant="destructive"><AlertDescription>{error}</AlertDescription></Alert>}
          </div>
        )}
      </div>
    </div>
  );
}

function RecommendationView({
  rec, ar, onCreateMatter, onRestart, userCountry, userStatus, engagementAcknowledged, onEngagementAcknowledged,
}: {
  rec: Recommendation; ar: boolean;
  onCreateMatter: () => void; onRestart: () => void;
  userCountry: string; userStatus: string; engagementAcknowledged: boolean; onEngagementAcknowledged: (checked: boolean) => void;
}) {
  const reLabel = REMOTE_LABEL[rec.remoteEligibility] ?? REMOTE_LABEL.unknown;
  const reTone = REMOTE_TONES[rec.remoteEligibility] ?? "secondary";
  const confidencePct = Math.round(rec.confidence * 100);
  function parseSteps(value: unknown): ProcedureStep[] {
    if (Array.isArray(value)) return value as ProcedureStep[];
    if (typeof value === "string") {
      try {
        const parsed = JSON.parse(value);
        return Array.isArray(parsed) ? parsed as ProcedureStep[] : [];
      } catch {
        return [];
      }
    }
    return [];
  }
  const physicalSteps = rec.procedure ? parseSteps(rec.procedure.physicalPresenceSteps) : [];
  const remoteSteps = rec.procedure ? parseSteps(rec.procedure.remoteSteps) : [];

  return (
    <>
      <Card>
        <CardHeader>
          <div className="flex items-start justify-between gap-2">
            <div>
              <Badge variant="secondary" className="mb-1 gap-1">
                <Sparkles className="h-3 w-3" />
                {ar ? "الخدمة الموصى بها" : "Recommended service"}
              </Badge>
              <CardTitle className="text-xl">{ar ? rec.service.nameAr : rec.service.nameEn}</CardTitle>
              <CardDescription className="mt-1">
                {ar ? rec.service.shortAr : rec.service.shortEn}
              </CardDescription>
            </div>
            <Badge variant={reTone} className="gap-1">
              {rec.remoteEligibility === "fully_remote" ? <CheckCircle2 className="h-3 w-3" />
                : rec.remoteEligibility === "in_person_required" ? <XCircle className="h-3 w-3" />
                : <ShieldAlert className="h-3 w-3" />}
              {ar ? reLabel.ar : reLabel.en}
            </Badge>
          </div>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex flex-wrap gap-2">
            <Badge variant="outline" className="gap-1">
              <Clock className="h-3 w-3" />
              {ar ? "الثقة" : "Confidence"}: {confidencePct}%
            </Badge>
            {userCountry && <Badge variant="outline">{userCountry}</Badge>}
            {userStatus && (
              <Badge variant="outline">
                {STATUSES.find((s) => s.value === userStatus)?.[ar ? "ar" : "en"] ?? userStatus}
              </Badge>
            )}
            {rec.matchedKeywords.slice(0, 4).map((k, i) => (
              <Badge key={i} variant="secondary" className="text-[10px]">{k}</Badge>
            ))}
          </div>
          <p className="text-sm leading-7 text-muted-foreground">
            {ar ? rec.service.descriptionAr : rec.service.descriptionEn}
          </p>
        </CardContent>
      </Card>

      {/* Remote eligibility rationale */}
      <Card className="border-primary/30 bg-primary/5">
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-base">
            <Globe className="h-4 w-4" />
            {ar ? "حكم الإنجاز عن بُعد" : "Remote-eligibility verdict"}
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-3 text-sm">
          <p className="leading-7">
            {ar
              ? rec.remoteEligibilityReasonAr ?? rec.procedure?.remoteEligibilityReasonAr
              : rec.remoteEligibilityReasonEn ?? rec.procedure?.remoteEligibilityReasonEn}
          </p>
          {rec.procedure && (
            <div className="grid gap-3 sm:grid-cols-2">
              <div>
                <p className="mb-1 text-xs font-semibold text-emerald-700">
                  {ar ? "خطوات يمكن إنجازها عن بُعد" : "Steps that can be done remotely"}
                </p>
                <ul className="space-y-1 text-xs">
                  {remoteSteps.length === 0 ? (
                    <li className="text-muted-foreground">{ar ? "لا توجد" : "None"}</li>
                  ) : (
                    remoteSteps.map((s, i) => <li key={i} className="flex gap-1"><CheckCircle2 className="h-3 w-3 mt-0.5 text-emerald-600" /><span>{ar ? s.ar : s.en}</span></li>)
                  )}
                </ul>
              </div>
              <div>
                <p className="mb-1 text-xs font-semibold text-amber-700">
                  {ar ? "خطوات تتطلب حضوراً شخصياً" : "Steps requiring physical presence"}
                </p>
                <ul className="space-y-1 text-xs">
                  {physicalSteps.length === 0 ? (
                    <li className="text-muted-foreground">{ar ? "لا توجد" : "None"}</li>
                  ) : (
                    physicalSteps.map((s, i) => <li key={i} className="flex gap-1"><ShieldAlert className="h-3 w-3 mt-0.5 text-amber-600" /><span>{ar ? s.ar : s.en}</span></li>)
                  )}
                </ul>
              </div>
            </div>
          )}
          {rec.procedure && (
            <div className="grid gap-2 text-xs text-muted-foreground sm:grid-cols-2">
              {rec.procedure.authorityAr && (
                <div className="flex items-center gap-1.5">
                  <Landmark className="h-3 w-3" />
                  {ar ? rec.procedure.authorityAr : rec.procedure.authorityEn}
                </div>
              )}
              {rec.procedure.legalBasisAr && (
                <div className="flex items-center gap-1.5">
                  <Scale className="h-3 w-3" />
                  {ar ? rec.procedure.legalBasisAr : rec.procedure.legalBasisEn}
                </div>
              )}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Document checklist */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-base">
            <FileText className="h-4 w-4" />
            {ar ? "قائمة المستندات المطلوبة" : "Document checklist"}
          </CardTitle>
          <CardDescription>
            {ar
              ? "ستُضاف تلقائياً إلى ملف القضية عند الإنشاء."
              : "These will be auto-added to your matter file on creation."}
          </CardDescription>
        </CardHeader>
        <CardContent>
          <ul className="space-y-2">
            {rec.documentSlugs.map((d) => (
              <li key={d.slug} className="flex items-start gap-2 rounded-md border border-border p-2">
                <FileText className="mt-0.5 h-3.5 w-3.5 text-muted-foreground" />
                <div className="flex-1">
                  <p className="text-sm font-medium">{ar ? d.nameAr : d.nameEn}</p>
                  <p className="text-xs text-muted-foreground">{d.slug}</p>
                </div>
                <Badge variant={d.isRequired ? "default" : "secondary"} className="text-[10px]">
                  {d.isRequired ? (ar ? "مطلوب" : "Required") : (ar ? "اختياري" : "Optional")}
                </Badge>
              </li>
            ))}
          </ul>
        </CardContent>
      </Card>

      {/* Fee breakdown */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-base">
            <Building2 className="h-4 w-4" />
            {ar ? "تقدير الرسوم" : "Fee estimate"}
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          <div className="grid gap-2 sm:grid-cols-3">
            <FeeItem ar={ar} labelAr="رسوم المنصة" labelEn="Platform fee" value={`${rec.service.platformFeeDefault} JOD`} />
            <FeeItem ar={ar} labelAr="رسوم المحامي" labelEn="Lawyer fee" value={`${rec.service.lawyerFeeMin}–${rec.service.lawyerFeeMax} JOD`} />
            <FeeItem ar={ar} labelAr="رسوم حكومية (تُدفع منفصلة)" labelEn="Government fee (paid separately)" value={rec.service.governmentFeeEstimate > 0 ? `${rec.service.governmentFeeEstimate} JOD` : "—"} />
          </div>
          {rec.service.governmentFeeNoteAr && (
            <Alert>
              <ShieldAlert className="h-4 w-4" />
              <AlertDescription>
                {ar ? rec.service.governmentFeeNoteAr : rec.service.governmentFeeNoteEn}
              </AlertDescription>
            </Alert>
          )}
          <p className="text-xs text-muted-foreground">
            {ar
              ? "هذه تقديرات أولية. الرسوم النهائية تُحدد بعد مراجعة المحامي لقضيتك."
              : "These are initial estimates. Final fees are set after lawyer review of your matter."}
          </p>
        </CardContent>
      </Card>

      {/* CTA */}
      <Card>
        <CardContent className="space-y-3 py-6">
          <LawyerEngagementDisclaimer checked={engagementAcknowledged} onCheckedChange={onEngagementAcknowledged} />
          <AIUsageNotice />
          <Button onClick={onCreateMatter} disabled={!engagementAcknowledged} className="w-full gap-2" size="lg">
            <KeyRound className="h-4 w-4" />
            {ar ? "إنشاء قضية وبدء المتابعة" : "Create matter and start tracking"}
          </Button>
          <Button onClick={onRestart} variant="ghost" className="w-full">
            {ar ? "ابدأ توجيهاً جديداً" : "Start a new intake"}
          </Button>

        </CardContent>
      </Card>
    </>
  );
}

function NoMatchView({ ar, onRestart }: { ar: boolean; onRestart: () => void }) {
  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <XCircle className="h-5 w-5 text-amber-500" />
          {ar ? "لم نجد تطابقاً واضحاً" : "No clear match found"}
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-3">
        <p className="text-sm leading-7 text-muted-foreground">
          {ar
            ? "لم يتمكن النظام من مطابقة وصفك مع خدمة في الكتالوج. يمكنك إعادة الصياغة بإضافة تفاصيل أكثر، أو تصفح الخدمات مباشرة."
            : "The system could not match your description to a service in the catalog. Please rephrase with more detail, or browse services directly."}
        </p>
        <div className="flex gap-2">
          <Button onClick={onRestart} variant="outline">
            {ar ? "إعادة المحاولة" : "Try again"}
          </Button>
          <Button onClick={() => (window.location.href = "/services")}>
            {ar ? "تصفح الخدمات" : "Browse services"}
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}

function FeeItem({ ar, labelAr, labelEn, value }: { ar: boolean; labelAr: string; labelEn: string; value: string }) {
  return (
    <div className="rounded-lg border border-border p-3">
      <p className="text-xs text-muted-foreground">{ar ? labelAr : labelEn}</p>
      <p className="mt-1 text-sm font-bold">{value}</p>
    </div>
  );
}
