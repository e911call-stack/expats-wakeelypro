"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { useLocale } from "@/lib/locale-provider";
import { LawyerIndependentNotice, AIUsageNotice } from "@/components/legal-disclaimer";
import { useSession } from "@/lib/session-provider";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { Alert, AlertDescription } from "@/components/ui/alert";
import {
  Gavel, Globe, FileText, Clock, Loader2, ShieldAlert,
  Building2, CheckCircle2, Circle, AlertCircle,
} from "lucide-react";

type Matter = {
  id: string;
  title: string;
  status: string;
  remoteEligibility: string;
  clientCountry: string | null;
  clientStatus: string | null;
  progressPercent: number;
  createdAt: string;
  legalService: { id: string; slug: string; nameAr: string; nameEn: string; code: string } | null;
  legalProcedure: { remoteEligibility: string; nameAr: string; nameEn: string } | null;
  practiceArea: { slug: string; nameAr: string; nameEn: string } | null;
  jurisdiction: { code: string; nameAr: string; nameEn: string } | null;
  client: { id: string; name: string; email: string; currentCountry: string | null; clientStatus: string | null } | null;
  _count: { documents: number; tasks: number; timelineEvents: number; conversations: number };
  tasks: { id: string; titleAr: string; titleEn: string; status: string; dueDate: string | null; requiresPhysicalPresence: boolean }[];
  openTaskCount: number;
  documentsAwaitingReview: number;
  documents: { id: string; fileName: string; requirementSlug: string | null; reviewStatus: string | null; createdAt: string }[];
  earnedJOD: number;
};

type Summary = {
  openMatters: number;
  openTasks: number;
  awaitingReview: number;
  earnedJOD: number;
};

const STATUS_LABEL: Record<string, { ar: string; en: string }> = {
  new_matter: { ar: "جديدة", en: "New" },
  service_recommended: { ar: "خدمة موصى بها", en: "Service recommended" },
  remote_eligibility_check: { ar: "فحص الأهلية", en: "Remote eligibility check" },
  documents_pending: { ar: "مستندات معلّقة", en: "Documents pending" },
  documents_received: { ar: "تم استلام المستندات", en: "Documents received" },
  in_progress: { ar: "قيد التنفيذ", en: "In progress" },
  in_review: { ar: "قيد المراجعة", en: "In review" },
  filing_prepared: { ar: "تجهيز التقديم", en: "Filing prepared" },
  filed_with_authority: { ar: "مقدّمة للجهة", en: "Filed with authority" },
  authority_processing: { ar: "قيد المعالجة", en: "Authority processing" },
  ready_for_delivery: { ar: "جاهزة للتسليم", en: "Ready for delivery" },
  delivered: { ar: "تم التسليم", en: "Delivered" },
  cancelled: { ar: "ملغاة", en: "Cancelled" },
  intake: { ar: "تحليل", en: "Intake" },
  awaiting_documents: { ar: "بانتظار مستندات", en: "Awaiting documents" },
  lawyer_requested: { ar: "طلب محامٍ", en: "Lawyer requested" },
  lawyer_assigned: { ar: "تم إسناد محامٍ", en: "Lawyer assigned" },
  consultation_scheduled: { ar: "استشارة مجدولة", en: "Consultation scheduled" },
  active: { ar: "نشطة", en: "Active" },
  resolved: { ar: "تم الحل", en: "Resolved" },
  closed: { ar: "مغلقة", en: "Closed" },
};

const REMOTE_TONES: Record<string, "success" | "warning" | "danger" | "secondary"> = {
  fully_remote: "success", partially_remote: "warning", in_person_required: "danger", unknown: "secondary",
};

export default function LawyerDashboardPage() {
  const { locale } = useLocale();
  const { user, loading: sessionLoading } = useSession();
  const ar = locale === "ar";
  const [matters, setMatters] = useState<Matter[]>([]);
  const [summary, setSummary] = useState<Summary>({ openMatters: 0, openTasks: 0, awaitingReview: 0, earnedJOD: 0 });
  const [filter, setFilter] = useState<"all" | "needsReview" | "inProgress">("all");
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!user) {
      setLoading(false);
      return;
    }
    fetch("/api/lawyer/matters")
      .then((r) => r.json())
      .then((d) => {
        setMatters(d.matters ?? []);
        setSummary(d.summary ?? { openMatters: 0, openTasks: 0, awaitingReview: 0, earnedJOD: 0 });
      })
      .catch(() => { setMatters([]); })
      .finally(() => setLoading(false));
  }, [user]);

  if (sessionLoading) {
    return <div className="container mx-auto px-4 py-16"><div className="flex justify-center"><Loader2 className="h-8 w-8 animate-spin text-muted-foreground" /></div></div>;
  }

  if (!user || user.role !== "LAWYER") {
    return (
      <div className="container mx-auto px-4 py-16">
        <Card className="mx-auto max-w-md">
          <CardContent className="py-8 text-center">
            <ShieldAlert className="mx-auto h-10 w-10 text-muted-foreground" />
            <h2 className="mt-3 text-lg font-bold">{ar ? "لوحة المحامي" : "Lawyer dashboard"}</h2>
            <p className="mt-1 text-sm text-muted-foreground">
              {ar
                ? "سجّل الدخول بحساب المحامي التجريبي (attorney.khouri@example.com) لعرض هذه اللوحة."
                : "Sign in with the demo lawyer account (attorney.khouri@example.com) to view this dashboard."}
            </p>
          </CardContent>
        </Card>
      </div>
    );
  }

  const visible = matters.filter((m) => {
    if (filter === "needsReview") return m.documentsAwaitingReview > 0;
    if (filter === "inProgress") return !["delivered", "cancelled", "closed", "resolved"].includes(m.status);
    return true;
  });

  return (
    <div className="container mx-auto px-4 py-8 lg:py-12">
      <div className="mx-auto max-w-5xl">
        <div className="mb-4 grid gap-3 sm:grid-cols-2">
          <LawyerIndependentNotice />
          <AIUsageNotice />
        </div>
        <div className="mb-6">
          <Badge variant="secondary" className="mb-2 gap-1">
            <Gavel className="h-3 w-3" />
            {ar ? "لوحة المحامي" : "Lawyer dashboard"}
          </Badge>
          <h1 className="text-2xl font-bold sm:text-3xl">
            {ar ? `أهلاً ${user.name}` : `Welcome, ${user.name}`}
          </h1>
          <p className="mt-1 text-sm text-muted-foreground">
            {ar
              ? "القضايا المسندة إليك — مع التركيز على القضايا عن بُعد للموكلين في الخارج."
              : "Matters assigned to you — with focus on remote matters for clients abroad."}
          </p>
        </div>

        {/* Stats */}
        <div className="mb-6 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
          <Card>
            <CardContent className="py-4">
              <p className="text-xs text-muted-foreground">{ar ? "قضايا مفتوحة" : "Open matters"}</p>
              <p className="mt-1 text-2xl font-bold">{summary.openMatters}</p>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="py-4">
              <p className="text-xs text-muted-foreground">{ar ? "مهام قائمة" : "Open tasks"}</p>
              <p className="mt-1 text-2xl font-bold">{summary.openTasks}</p>
            </CardContent>
          </Card>
          <Card className={summary.awaitingReview > 0 ? "border-amber-500/60 bg-amber-500/5" : ""}>
            <CardContent className="py-4">
              <p className="text-xs text-muted-foreground">{ar ? "مستندات بانتظار مراجعتك" : "Documents awaiting review"}</p>
              <p className={`mt-1 text-2xl font-bold ${summary.awaitingReview > 0 ? "text-amber-600" : ""}`}>{summary.awaitingReview}</p>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="py-4">
              <p className="text-xs text-muted-foreground">{ar ? "أتعاب مستلمة" : "Earned fees"}</p>
              <p className="mt-1 text-2xl font-bold">{summary.earnedJOD} <span className="text-sm text-muted-foreground">JOD</span></p>
            </CardContent>
          </Card>
        </div>

        {/* Filter bar */}
        <div className="mb-4 flex flex-wrap items-center gap-2">
          <Button size="sm" variant={filter === "all" ? "default" : "outline"} onClick={() => setFilter("all")}>
            {ar ? "الكل" : "All"}
          </Button>
          <Button size="sm" variant={filter === "inProgress" ? "default" : "outline"} onClick={() => setFilter("inProgress")}>
            {ar ? "مفتوحة" : "Open"}
          </Button>
          <Button size="sm" variant={filter === "needsReview" ? "default" : "outline"} className={filter === "needsReview" ? "" : "border-amber-500/50 text-amber-700"} onClick={() => setFilter("needsReview")}>
            <FileText className="h-3.5 w-3.5" />
            {ar ? "بانتظار مراجعة المستندات" : "Awaiting doc review"}
          </Button>
        </div>

        {loading ? (
          <div className="flex justify-center py-16">
            <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
          </div>
        ) : visible.length === 0 ? (
          <Card>
            <CardContent className="py-12 text-center">
              <Gavel className="mx-auto h-12 w-12 text-muted-foreground" />
              <h2 className="mt-4 text-lg font-bold">
                {ar ? "لا قضايا ضمن هذا التصنيف" : "No matters in this view"}
              </h2>
              <p className="mt-1 text-sm text-muted-foreground">
                {ar
                  ? "غيّر التصنيف أعلاه، أو انتظر إسناد قضايا عن بُعد إليك."
                  : "Change the filter above, or wait for remote matters to be assigned to you."}
              </p>
            </CardContent>
          </Card>
        ) : (
          <div className="space-y-4">
            {visible.map((m) => {
              const s = STATUS_LABEL[m.status] ?? { ar: m.status, en: m.status };
              const reTone = REMOTE_TONES[m.remoteEligibility] ?? "secondary";
              return (
                <Link key={m.id} href={`/lawyer/matters/${m.id}`}>
                  <Card className="cursor-pointer transition-shadow hover:shadow-md">
                    <CardContent className="pt-6">
                      <div className="flex flex-wrap items-start justify-between gap-3">
                        <div className="min-w-0 flex-1">
                          <div className="mb-1 flex flex-wrap items-center gap-2">
                            <h3 className="text-base font-bold">{m.title}</h3>
                            <Badge>{ar ? s.ar : s.en}</Badge>
                            {m.documentsAwaitingReview > 0 && (
                              <Badge variant="warning" className="gap-1">
                                <FileText className="h-3 w-3" />
                                {m.documentsAwaitingReview} {ar ? "بانتظار المراجعة" : "to review"}
                              </Badge>
                            )}
                            <Badge variant={reTone} className="gap-1">
                              <Globe className="h-3 w-3" />
                              {remoteLabel(m.remoteEligibility, ar)}
                            </Badge>
                          </div>
                          <div className="flex flex-wrap items-center gap-3 text-xs text-muted-foreground">
                            {m.legalService && (
                              <span className="flex items-center gap-1">
                                <Building2 className="h-3 w-3" />
                                {ar ? m.legalService.nameAr : m.legalService.nameEn}
                              </span>
                            )}
                            {m.client && (
                              <span>
                                · {ar ? "الموكل" : "Client"}: {m.client.name}
                              </span>
                            )}
                            {m.client?.currentCountry && (
                              <span className="flex items-center gap-1">
                                <Globe className="h-3 w-3" />
                                {m.client.currentCountry}
                              </span>
                            )}
                            <span className="flex items-center gap-1">
                              <Clock className="h-3 w-3" />
                              {new Date(m.createdAt).toLocaleDateString(ar ? "ar-JO" : "en-US")}
                            </span>
                            <span>· {m._count.documents} {ar ? "مستند" : "docs"}</span>
                            <span>· {m.openTaskCount} {ar ? "مهمة مفتوحة" : "open tasks"}</span>
                          </div>

                          {/* Top open tasks */}
                          {m.tasks.length > 0 && (
                            <div className="mt-3 space-y-1">
                              {m.tasks.slice(0, 3).map((t) => (
                                <div key={t.id} className="flex items-center gap-1.5 text-xs">
                                  {t.status === "completed" ? (
                                    <CheckCircle2 className="h-3 w-3 text-emerald-600" />
                                  ) : t.status === "blocked" ? (
                                    <AlertCircle className="h-3 w-3 text-destructive" />
                                  ) : (
                                    <Circle className="h-3 w-3 text-muted-foreground" />
                                  )}
                                  <span className={t.status === "completed" ? "line-through opacity-60" : ""}>
                                    {ar ? t.titleAr : t.titleEn}
                                  </span>
                                  {t.requiresPhysicalPresence && (
                                    <Badge variant="warning" className="text-[10px]">{ar ? "حضور" : "In-person"}</Badge>
                                  )}
                                </div>
                              ))}
                              {m.tasks.length > 3 && (
                                <p className="text-[10px] text-muted-foreground">
                                  +{m.tasks.length - 3} {ar ? "المزيد" : "more"}
                                </p>
                              )}
                            </div>
                          )}
                        </div>
                        <div className="w-32 text-end">
                          <div className="mb-1 text-xs text-muted-foreground">{ar ? "التقدّم" : "Progress"}</div>
                          <Progress value={m.progressPercent} className="h-2" />
                          <div className="mt-1 text-xs font-bold">{m.progressPercent}%</div>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                </Link>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}

function remoteLabel(re: string, ar: boolean): string {
  if (re === "fully_remote") return ar ? "عن بُعد" : "Remote";
  if (re === "partially_remote") return ar ? "جزئي" : "Partial";
  if (re === "in_person_required") return ar ? "حضور" : "In-person";
  return ar ? "غير محدد" : "Unknown";
}
