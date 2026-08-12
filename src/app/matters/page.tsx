"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { useLocale } from "@/lib/locale-provider";
import { useSession } from "@/lib/session-provider";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { Alert, AlertDescription } from "@/components/ui/alert";
import {
  Plus, FileText, Clock, Globe, Loader2, ShieldAlert,
  Building2, KeyRound,
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
  legalProcedure: { id: string; remoteEligibility: string; nameAr: string; nameEn: string } | null;
  practiceArea: { slug: string; nameAr: string; nameEn: string } | null;
  jurisdiction: { code: string; nameAr: string; nameEn: string } | null;
  client: { id: string; name: string; email: string; currentCountry: string | null; clientStatus: string | null } | null;
  lawyer: { id: string; user: { id: string; name: string; email: string } } | null;
  _count: { documents: number; tasks: number; timelineEvents: number; conversations: number };
};

const STATUS_LABEL: Record<string, { ar: string; en: string; tone: "default" | "secondary" | "destructive" | "outline" }> = {
  new_matter: { ar: "جديدة", en: "New", tone: "secondary" },
  intake: { ar: "تحليل", en: "Intake", tone: "secondary" },
  awaiting_documents: { ar: "بانتظار مستندات", en: "Awaiting documents", tone: "outline" },
  lawyer_requested: { ar: "طلب محامٍ", en: "Lawyer requested", tone: "outline" },
  lawyer_assigned: { ar: "تم إسناد محامٍ", en: "Lawyer assigned", tone: "secondary" },
  consultation_scheduled: { ar: "استشارة مجدولة", en: "Consultation scheduled", tone: "secondary" },
  active: { ar: "نشطة", en: "Active", tone: "default" },
  resolved: { ar: "تم الحل", en: "Resolved", tone: "secondary" },
  closed: { ar: "مغلقة", en: "Closed", tone: "secondary" },
  service_recommended: { ar: "خدمة موصى بها", en: "Service recommended", tone: "secondary" },
  remote_eligibility_check: { ar: "فحص الأهلية عن بُعد", en: "Remote eligibility check", tone: "secondary" },
  documents_pending: { ar: "مستندات معلّقة", en: "Documents pending", tone: "outline" },
  documents_received: { ar: "تم استلام المستندات", en: "Documents received", tone: "default" },
  in_progress: { ar: "قيد التنفيذ", en: "In progress", tone: "default" },
  in_review: { ar: "قيد المراجعة", en: "In review", tone: "default" },
  filing_prepared: { ar: "تجهيز التقديم", en: "Filing prepared", tone: "default" },
  filed_with_authority: { ar: "مقدّمة للجهة", en: "Filed with authority", tone: "default" },
  authority_processing: { ar: "قيد المعالجة من الجهة", en: "Authority processing", tone: "default" },
  ready_for_delivery: { ar: "جاهزة للتسليم", en: "Ready for delivery", tone: "default" },
  delivered: { ar: "تم التسليم", en: "Delivered", tone: "secondary" },
  cancelled: { ar: "ملغاة", en: "Cancelled", tone: "destructive" },
};

const REMOTE_TONES: Record<string, "success" | "warning" | "danger" | "secondary"> = {
  fully_remote: "success", partially_remote: "warning", in_person_required: "danger", unknown: "secondary",
};

export default function MattersPage() {
  const { locale } = useLocale();
  const { user, loading: sessionLoading } = useSession();
  const ar = locale === "ar";
  const [matters, setMatters] = useState<Matter[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!user) {
      setLoading(false);
      return;
    }
    fetch("/api/legal/matters")
      .then((r) => r.json())
      .then((d) => setMatters(d.matters ?? []))
      .catch(() => setMatters([]))
      .finally(() => setLoading(false));
  }, [user]);

  if (sessionLoading) {
    return <div className="container mx-auto px-4 py-16"><div className="flex justify-center"><Loader2 className="h-8 w-8 animate-spin text-muted-foreground" /></div></div>;
  }

  if (!user) {
    return (
      <div className="container mx-auto px-4 py-16">
        <Card className="mx-auto max-w-md">
          <CardContent className="py-8 text-center">
            <ShieldAlert className="mx-auto h-10 w-10 text-muted-foreground" />
            <h2 className="mt-3 text-lg font-bold">{ar ? "تسجيل الدخول مطلوب" : "Sign in required"}</h2>
            <p className="mt-1 text-sm text-muted-foreground">
              {ar ? "سجّل الدخول بحساب تجريبي لرؤية قضاياك." : "Sign in with a demo account to see your matters."}
            </p>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="container mx-auto px-4 py-8 lg:py-12">
      <div className="mx-auto max-w-4xl">
        <div className="mb-6 flex flex-wrap items-center justify-between gap-4">
          <div>
            <h1 className="text-2xl font-bold sm:text-3xl">
              {ar ? "قضاياي" : "My Matters"}
            </h1>
            <p className="mt-1 text-sm text-muted-foreground">
              {ar
                ? "قضاياك القانونية — يراها أنت والمحامي المسند والمشرف فقط."
                : "Your private legal matters — visible only to you, the assigned lawyer, and admin."}
            </p>
          </div>
          <Link href="/intake">
            <Button className="gap-2">
              <Plus className="h-4 w-4" />
              {ar ? "قضية جديدة" : "New matter"}
            </Button>
          </Link>
        </div>

        {loading ? (
          <div className="flex justify-center py-16">
            <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
          </div>
        ) : matters.length === 0 ? (
          <Card>
            <CardContent className="py-12 text-center">
              <FileText className="mx-auto h-12 w-12 text-muted-foreground" />
              <h2 className="mt-4 text-lg font-bold">
                {ar ? "لا قضايا بعد" : "No matters yet"}
              </h2>
              <p className="mt-1 text-sm text-muted-foreground">
                {ar ? "ابدأ توجيهاً ذكياً لإنشاء قضيتك الأولى." : "Start an AI intake to create your first matter."}
              </p>
              <Link href="/intake" className="mt-4 inline-block">
                <Button>{ar ? "ابدأ توجيهاً" : "Start intake"}</Button>
              </Link>
            </CardContent>
          </Card>
        ) : (
          <div className="space-y-3">
            {matters.map((m) => {
              const s = STATUS_LABEL[m.status] ?? { ar: m.status, en: m.status, tone: "secondary" as const };
              const reTone = REMOTE_TONES[m.remoteEligibility] ?? "secondary";
              return (
                <Link key={m.id} href={`/matters/${m.id}`}>
                  <Card className="cursor-pointer transition-shadow hover:shadow-md">
                    <CardContent className="pt-6">
                      <div className="flex flex-wrap items-start justify-between gap-3">
                        <div className="min-w-0 flex-1">
                          <div className="mb-1 flex flex-wrap items-center gap-2">
                            <h3 className="text-base font-bold">{m.title}</h3>
                            <Badge variant={s.tone}>{ar ? s.ar : s.en}</Badge>
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
                            {m.clientCountry && (
                              <span className="flex items-center gap-1">
                                <Globe className="h-3 w-3" />
                                {m.clientCountry}
                              </span>
                            )}
                            {m.lawyer && (
                              <span>· {ar ? "محامٍ" : "Lawyer"}: {m.lawyer.user.name}</span>
                            )}
                            <span className="flex items-center gap-1">
                              <Clock className="h-3 w-3" />
                              {new Date(m.createdAt).toLocaleDateString(ar ? "ar-JO" : "en-US")}
                            </span>
                            <span>· {m._count.documents} {ar ? "مستند" : "docs"}</span>
                            <span>· {m._count.tasks} {ar ? "مهمة" : "tasks"}</span>
                          </div>
                        </div>
                        <div className="w-32 text-end">
                          <div className="mb-1 text-xs text-muted-foreground">
                            {ar ? "التقدّم" : "Progress"}
                          </div>
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
