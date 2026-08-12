"use client";

import { useCallback, useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import Link from "next/link";
import { useLocale } from "@/lib/locale-provider";
import { useSession } from "@/lib/session-provider";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { Textarea } from "@/components/ui/textarea";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import {
  ArrowLeft, ArrowRight, Clock, FileText, Globe, Landmark, Scale, ShieldAlert, ShieldCheck,
  CheckCircle2, Circle, Loader2, MessageSquare, Send, Gavel, Building2, ScrollText,
  CreditCard, Calendar, MapPin, User as UserIcon, AlertCircle, XCircle, RefreshCw,
  ChevronRight, FileCheck2, FileX2, FileWarning, Wallet, StickyNote,
} from "lucide-react";

type Matter = {
  id: string;
  title: string;
  status: string;
  facts: string | null;
  aiAnalysis: string | null;
  notes: string | null;
  lawyerNotes: string | null;
  deadline: string | null;
  remoteEligibility: string;
  remoteEligibilityReasonAr: string | null;
  remoteEligibilityReasonEn: string | null;
  clientCountry: string | null;
  clientCity: string | null;
  clientStatus: string | null;
  platformFeeJOD: number;
  lawyerFeeJOD: number;
  governmentFeeJOD: number;
  governmentFeeIncluded: boolean;
  feeNotesAr: string | null;
  feeNotesEn: string | null;
  progressPercent: number;
  createdAt: string;
  closedAt: string | null;
  urgency: string | null;

  legalService: {
    id: string; slug: string; nameAr: string; nameEn: string;
    documentRequirements: { id: string; slug: string; nameAr: string; nameEn: string; isRequired: boolean; stage: string; provider: string; requiresOriginal: boolean; requiresNotarization: boolean; requiresApostille: boolean; }[];
    officialSources: { officialSource: { id: string; slug: string; nameAr: string; nameEn: string; url: string | null } }[];
  } | null;
  legalProcedure: {
    id: string; nameAr: string; nameEn: string;
    remoteEligibility: string;
    authorityAr: string | null; authorityEn: string | null;
    legalBasisAr: string | null; legalBasisEn: string | null;
    estimatedDurationDays: number;
  } | null;
  client: { id: string; name: string; email: string; phone: string | null; currentCountry: string | null; currentCity: string | null; clientStatus: string | null; language: string };
  lawyer: { id: string; user: { id: string; name: string; email: string; phone: string | null } } | null;
  documents: {
    id: string; fileName: string; fileUrl: string; fileType: string; fileSize: number;
    description: string | null; requirementSlug: string | null;
    reviewStatus: string | null; reviewedAt: string | null; reviewNotes: string | null;
    createdAt: string;
  }[];
  tasks: {
    id: string; titleAr: string; titleEn: string;
    descriptionAr: string | null; descriptionEn: string | null;
    status: string; sortOrder: number; responsibleRole: string;
    dueDate: string | null; completedAt: string | null; requiresPhysicalPresence: boolean;
  }[];
  timelineEvents: {
    id: string; eventType: string;
    titleAr: string; titleEn: string;
    descriptionAr: string | null; descriptionEn: string | null;
    actorId: string | null; actorRole: string | null;
    createdAt: string;
  }[];
  conversations: {
    id: string; kind: string;
    messages: { id: string; senderId: string; body: string; readAt: string | null; createdAt: string }[];
  }[];
  payments: {
    id: string; amountJOD: number; kind: string; status: string;
    description: string | null; paidAt: string | null; createdAt: string;
  }[];
  intake: { id: string; rawText: string; confidence: number } | null;
};

// All valid statuses in workflow order
const WORKFLOW: { key: string; ar: string; en: string; tone: "default" | "secondary" | "destructive" | "outline" }[] = [
  { key: "new_matter", ar: "جديدة", en: "New", tone: "secondary" },
  { key: "service_recommended", ar: "خدمة موصى بها", en: "Service recommended", tone: "secondary" },
  { key: "lawyer_assigned", ar: "تم إسناد محامٍ", en: "Lawyer assigned", tone: "secondary" },
  { key: "documents_pending", ar: "بانتظار المستندات", en: "Documents pending", tone: "outline" },
  { key: "documents_received", ar: "تم استلام المستندات", en: "Documents received", tone: "default" },
  { key: "in_progress", ar: "قيد التنفيذ", en: "In progress", tone: "default" },
  { key: "in_review", ar: "قيد المراجعة", en: "In review", tone: "default" },
  { key: "filing_prepared", ar: "تجهيز التقديم", en: "Filing prepared", tone: "default" },
  { key: "filed_with_authority", ar: "مقدّمة للجهة", en: "Filed with authority", tone: "default" },
  { key: "authority_processing", ar: "قيد المعالجة", en: "Authority processing", tone: "default" },
  { key: "ready_for_delivery", ar: "جاهزة للتسليم", en: "Ready for delivery", tone: "default" },
  { key: "delivered", ar: "تم التسليم", en: "Delivered", tone: "secondary" },
  { key: "cancelled", ar: "ملغاة", en: "Cancelled", tone: "destructive" },
];

const STAGE_LABEL: Record<string, { ar: string; en: string }> = {
  at_intake: { ar: "عند الاستلام", en: "At intake" },
  at_filing: { ar: "عند التقديم", en: "At filing" },
  at_signing: { ar: "عند التوقيع", en: "At signing" },
  at_notary: { ar: "عند التوثيق", en: "At notary" },
  ongoing: { ar: "مستمر", en: "Ongoing" },
};

const REVIEW_ICON: Record<string, React.ComponentType<{ className?: string }>> = {
  approved: FileCheck2,
  rejected: FileX2,
  needs_resubmission: FileWarning,
  pending: FileText,
};

export default function LawyerMatterWorkspacePage() {
  const params = useParams<{ id: string }>();
  const router = useRouter();
  const { locale } = useLocale();
  const { user } = useSession();
  const ar = locale === "ar";
  const [matter, setMatter] = useState<Matter | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    if (!params?.id) return;
    try {
      const res = await fetch(`/api/legal/matters/${params.id}`, { cache: "no-store" });
      if (!res.ok) throw new Error("not found or forbidden");
      const d = await res.json();
      setMatter(d.matter);
    } catch (e) {
      setError(e instanceof Error ? e.message : "unknown_error");
    } finally {
      setLoading(false);
    }
  }, [params?.id]);

  useEffect(() => { load(); }, [load]);

  if (loading) {
    return <div className="container mx-auto px-4 py-16"><div className="flex justify-center"><Loader2 className="h-8 w-8 animate-spin text-muted-foreground" /></div></div>;
  }
  if (error || !matter) {
    return (
      <div className="container mx-auto px-4 py-16">
        <Card className="mx-auto max-w-md">
          <CardContent className="py-8 text-center">
            <AlertCircle className="mx-auto h-10 w-10 text-muted-foreground" />
            <p className="mt-3 text-sm text-muted-foreground">
              {ar ? "القضية غير موجودة أو ليست لديك صلاحية. تأكد من تسجيل الدخول كمحامٍ مُسنَد." : "Matter not found or you do not have access. Make sure you're signed in as the assigned lawyer."}
            </p>
            <Link href="/lawyer" className="mt-3 inline-block">
              <Button variant="outline">{ar ? "لوحة المحامي" : "Lawyer dashboard"}</Button>
            </Link>
          </CardContent>
        </Card>
      </div>
    );
  }

  const currentStatusIdx = WORKFLOW.findIndex((s) => s.key === matter.status);
  const isLawyer = user?.lawyerId && matter.lawyer?.id === user.lawyerId;
  const isAdmin = user?.role === "ADMIN";

  return (
    <div className="container mx-auto px-4 py-6 lg:py-8">
      <div className="mx-auto max-w-6xl">
        <Link href="/lawyer" className="mb-4 inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground">
          {ar ? <ArrowRight className="h-4 w-4" /> : <ArrowLeft className="h-4 w-4" />}
          {ar ? "لوحة المحامي" : "Lawyer dashboard"}
        </Link>

        {/* Header */}
        <Card className="mb-4">
          <CardContent className="pt-6">
            <div className="mb-3 flex flex-wrap items-start justify-between gap-3">
              <div className="min-w-0 flex-1">
                <div className="mb-2 flex flex-wrap items-center gap-2">
                  <Badge variant="secondary" className="gap-1"><Gavel className="h-3 w-3" /> {ar ? "مساحة عمل المحامي" : "Lawyer workspace"}</Badge>
                  <Badge variant={matter.remoteEligibility === "fully_remote" ? "default" : matter.remoteEligibility === "partially_remote" ? "secondary" : "destructive"} className="gap-1">
                    <Globe className="h-3 w-3" />
                    {remoteLabel(matter.remoteEligibility, ar)}
                  </Badge>
                  {matter.urgency === "high" && <Badge variant="destructive">{ar ? "عاجل" : "Urgent"}</Badge>}
                  {matter.legalService && <Badge variant="outline">{ar ? matter.legalService.nameAr : matter.legalService.nameEn}</Badge>}
                </div>
                <h1 className="text-xl font-bold sm:text-2xl">{matter.title}</h1>
                <div className="mt-2 flex flex-wrap items-center gap-3 text-xs text-muted-foreground">
                  <span className="flex items-center gap-1"><UserIcon className="h-3 w-3" /> {ar ? "الموكل" : "Client"}: {matter.client.name}</span>
                  <span className="flex items-center gap-1"><MapPin className="h-3 w-3" /> {matter.client.currentCountry ?? "—"}</span>
                  <span className="flex items-center gap-1"><Calendar className="h-3 w-3" /> {new Date(matter.createdAt).toLocaleDateString(ar ? "ar-JO" : "en-US")}</span>
                  <span>· {matter.client.email}</span>
                  {matter.client.phone && <span>· {matter.client.phone}</span>}
                </div>
              </div>
              <div className="w-36 text-end">
                <div className="mb-1 text-xs text-muted-foreground">{ar ? "التقدّم" : "Progress"}</div>
                <Progress value={matter.progressPercent} className="h-2" />
                <div className="mt-1 text-lg font-bold">{matter.progressPercent}%</div>
              </div>
            </div>

            {/* Workflow stepper */}
            <div className="mt-4 overflow-x-auto pb-2">
              <div className="flex min-w-max items-center gap-1">
                {WORKFLOW.map((s, i) => {
                  const done = i < currentStatusIdx;
                  const current = i === currentStatusIdx;
                  return (
                    <div key={s.key} className="flex items-center">
                      <div
                        className={`flex items-center gap-1 rounded-full px-2.5 py-1 text-[10px] font-medium transition-colors ${
                          current ? "bg-primary text-primary-foreground"
                          : done ? "bg-emerald-100 text-emerald-700"
                          : "bg-muted text-muted-foreground"
                        }`}
                        title={ar ? s.ar : s.en}
                      >
                        {done && <CheckCircle2 className="h-2.5 w-2.5" />}
                        <span className="whitespace-nowrap">{ar ? s.ar : s.en}</span>
                      </div>
                      {i < WORKFLOW.length - 1 && <ChevronRight className={`h-3 w-3 ${ar ? "rotate-180" : ""} text-muted-foreground`} />}
                    </div>
                  );
                })}
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Status advance + quick actions */}
        {(isLawyer || isAdmin) && (
          <Card className="mb-4 border-primary/30 bg-primary/5">
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-base">
                <Gavel className="h-4 w-4" />
                {ar ? "تغيير حالة القضية" : "Advance matter status"}
              </CardTitle>
              <CardDescription className="text-xs">
                {ar
                  ? "قدّم القضية خلال سير العمل. سيتم إشعار الموكل بكل تغيير."
                  : "Advance the matter through the workflow. The client will be notified on each change."}
              </CardDescription>
            </CardHeader>
            <CardContent>
              <StatusAdvance matter={matter} ar={ar} onUpdated={load} />
            </CardContent>
          </Card>
        )}

        {/* Tabs */}
        <Tabs defaultValue="overview">
          <TabsList className="grid w-full grid-cols-3 sm:grid-cols-6">
            <TabsTrigger value="overview" className="gap-1 text-xs sm:text-sm">
              <ScrollText className="h-3.5 w-3.5" />
              <span className="hidden sm:inline">{ar ? "نظرة" : "Overview"}</span>
            </TabsTrigger>
            <TabsTrigger value="tasks" className="gap-1 text-xs sm:text-sm">
              <CheckCircle2 className="h-3.5 w-3.5" />
              <span className="hidden sm:inline">{ar ? "مهام" : "Tasks"}</span>
              <Badge variant="secondary" className="ml-1 text-[10px]">{matter.tasks.length}</Badge>
            </TabsTrigger>
            <TabsTrigger value="documents" className="gap-1 text-xs sm:text-sm">
              <FileText className="h-3.5 w-3.5" />
              <span className="hidden sm:inline">{ar ? "مستندات" : "Docs"}</span>
              <Badge variant="secondary" className="ml-1 text-[10px]">{matter.documents.length}</Badge>
            </TabsTrigger>
            <TabsTrigger value="fees" className="gap-1 text-xs sm:text-sm">
              <Wallet className="h-3.5 w-3.5" />
              <span className="hidden sm:inline">{ar ? "رسوم" : "Fees"}</span>
            </TabsTrigger>
            <TabsTrigger value="messages" className="gap-1 text-xs sm:text-sm">
              <MessageSquare className="h-3.5 w-3.5" />
              <span className="hidden sm:inline">{ar ? "رسائل" : "Msgs"}</span>
            </TabsTrigger>
            <TabsTrigger value="timeline" className="gap-1 text-xs sm:text-sm">
              <Clock className="h-3.5 w-3.5" />
              <span className="hidden sm:inline">{ar ? "سجل" : "Timeline"}</span>
            </TabsTrigger>
          </TabsList>

          {/* Overview */}
          <TabsContent value="overview" className="space-y-4">
            <div className="grid gap-4 md:grid-cols-3">
              <Card className="md:col-span-2">
                <CardHeader><CardTitle className="text-base">{ar ? "وقائع الموكل" : "Client facts"}</CardTitle></CardHeader>
                <CardContent>
                  <p className="whitespace-pre-wrap text-sm leading-7 text-muted-foreground">{matter.facts || (ar ? "لا توجد وقائع مسجلة." : "No facts recorded.")}</p>
                  {matter.intake && (
                    <div className="mt-3 rounded-md bg-muted/50 p-3 text-xs">
                      <p className="mb-1 font-semibold text-muted-foreground">{ar ? "نص الاستلام الأصلي" : "Original intake text"}</p>
                      <p className="text-muted-foreground">{matter.intake.rawText}</p>
                    </div>
                  )}
                </CardContent>
              </Card>
              <Card>
                <CardHeader><CardTitle className="text-base">{ar ? "بيانات الموكل" : "Client info"}</CardTitle></CardHeader>
                <CardContent className="space-y-2 text-sm">
                  <div><span className="text-xs text-muted-foreground">{ar ? "الاسم" : "Name"}</span><p className="font-medium">{matter.client.name}</p></div>
                  <div><span className="text-xs text-muted-foreground">{ar ? "البريد" : "Email"}</span><p className="font-medium text-xs">{matter.client.email}</p></div>
                  {matter.client.phone && <div><span className="text-xs text-muted-foreground">{ar ? "الهاتف" : "Phone"}</span><p className="font-medium text-xs">{matter.client.phone}</p></div>}
                  {matter.client.currentCountry && <div><span className="text-xs text-muted-foreground">{ar ? "الدولة" : "Country"}</span><p className="font-medium">{matter.client.currentCountry}{matter.client.currentCity ? `, ${matter.client.currentCity}` : ""}</p></div>}
                  {matter.client.clientStatus && <div><span className="text-xs text-muted-foreground">{ar ? "الحالة" : "Status"}</span><p className="font-medium">{clientStatusLabel(matter.client.clientStatus, ar)}</p></div>}
                </CardContent>
              </Card>
            </div>

            {/* Remote eligibility */}
            <Card className="border-primary/30 bg-primary/5">
              <CardHeader><CardTitle className="flex items-center gap-2 text-base"><Globe className="h-4 w-4" />{ar ? "حكم الإنجاز عن بُعد" : "Remote-eligibility verdict"}</CardTitle></CardHeader>
              <CardContent>
                <p className="text-sm leading-7 text-muted-foreground">{ar ? matter.remoteEligibilityReasonAr : matter.remoteEligibilityReasonEn}</p>
                {matter.legalProcedure && (
                  <div className="mt-3 flex flex-wrap gap-3 text-xs text-muted-foreground">
                    {matter.legalProcedure.authorityAr && <span className="flex items-center gap-1"><Landmark className="h-3 w-3" />{ar ? matter.legalProcedure.authorityAr : matter.legalProcedure.authorityEn}</span>}
                    {matter.legalProcedure.legalBasisAr && <span className="flex items-center gap-1"><Scale className="h-3 w-3" />{ar ? matter.legalProcedure.legalBasisAr : matter.legalProcedure.legalBasisEn}</span>}
                  </div>
                )}
              </CardContent>
            </Card>

            {/* Lawyer notes */}
            {(isLawyer || isAdmin) && (
              <LawyerNotesPanel matter={matter} ar={ar} onUpdated={load} />
            )}
          </TabsContent>

          {/* Tasks */}
          <TabsContent value="tasks">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2 text-base"><CheckCircle2 className="h-4 w-4" />{ar ? "مهام القضية" : "Matter tasks"}</CardTitle>
                <CardDescription>{ar ? "المهام المستنسخة من قالب الخدمة. قدّمها أو أعد فتحها حسب التقدّم." : "Tasks cloned from the service template. Advance or reopen them as you progress."}</CardDescription>
              </CardHeader>
              <CardContent>
                <ul className="space-y-2">
                  {matter.tasks.map((t) => (
                    <li key={t.id} className="rounded-lg border border-border p-3">
                      <div className="flex flex-wrap items-start justify-between gap-2">
                        <div className="min-w-0 flex-1">
                          <div className="flex items-center gap-2">
                            {t.status === "completed" ? <CheckCircle2 className="h-4 w-4 text-emerald-600" />
                              : t.status === "blocked" ? <AlertCircle className="h-4 w-4 text-destructive" />
                              : <Circle className="h-4 w-4 text-muted-foreground" />}
                            <p className={`text-sm font-medium ${t.status === "completed" ? "line-through opacity-60" : ""}`}>{ar ? t.titleAr : t.titleEn}</p>
                          </div>
                          {t.descriptionAr && <p className="mt-1 text-xs text-muted-foreground">{ar ? t.descriptionAr : t.descriptionEn}</p>}
                          <div className="mt-2 flex flex-wrap gap-1">
                            <Badge variant={t.status === "completed" ? "default" : t.status === "in_progress" ? "default" : t.status === "blocked" ? "destructive" : "secondary"} className="text-[10px]">
                              {taskStatusLabel(t.status, ar)}
                            </Badge>
                            <Badge variant="outline" className="text-[10px]">{responsibleLabel(t.responsibleRole, ar)}</Badge>
                            {t.requiresPhysicalPresence && <Badge variant="warning" className="text-[10px] gap-1"><ShieldAlert className="h-2.5 w-2.5" />{ar ? "حضور" : "In-person"}</Badge>}
                          </div>
                        </div>
                        <TaskActions matterId={matter.id} taskId={t.id} currentStatus={t.status} ar={ar} onUpdated={load} />
                      </div>
                    </li>
                  ))}
                </ul>
              </CardContent>
            </Card>
          </TabsContent>

          {/* Documents */}
          <TabsContent value="documents">
            <DocumentsReviewPanel matter={matter} ar={ar} onUpdated={load} canReview={Boolean(isLawyer || isAdmin)} />
          </TabsContent>

          {/* Fees */}
          <TabsContent value="fees">
            <FeesPanel matter={matter} ar={ar} onUpdated={load} canEdit={Boolean(isLawyer || isAdmin)} />
          </TabsContent>

          {/* Messages */}
          <TabsContent value="messages">
            <MessagesPanel matter={matter} ar={ar} onUpdated={load} currentUserId={user?.id ?? ""} />
          </TabsContent>

          {/* Timeline */}
          <TabsContent value="timeline">
            <TimelinePanel matter={matter} ar={ar} onUpdated={load} canAdd={Boolean(isLawyer || isAdmin || user?.id === matter.client.id)} />
          </TabsContent>
        </Tabs>

        <Alert className="mt-4">
          <ShieldAlert className="h-4 w-4" />
          <AlertDescription className="text-xs">
            {ar
              ? "الذكاء الاصطناعي للتنقّي فقط. العمل الفعلي يقوم به المحامي المرخص والجهات الحكومية الأردنية. لا تُخفِ عن الموكل أي رسوم حكومية."
              : "AI is for navigation only. Actual work is done by the licensed lawyer and Jordanian government authorities. Never hide any government fee from the client."}
          </AlertDescription>
        </Alert>
      </div>
    </div>
  );
}

// ---------- Status Advance panel ----------
function StatusAdvance({ matter, ar, onUpdated }: { matter: Matter; ar: boolean; onUpdated: () => void }) {
  const [busy, setBusy] = useState<string | null>(null);
  const [note, setNote] = useState("");
  const currentIdx = WORKFLOW.findIndex((s) => s.key === matter.status);

  // Suggest next 3 statuses
  const nextSteps = WORKFLOW.slice(currentIdx + 1, currentIdx + 4).filter(s => s.key !== "cancelled");

  async function advance(newStatus: string) {
    setBusy(newStatus);
    try {
      await fetch(`/api/legal/matters/${matter.id}/status`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status: newStatus, note: note || undefined }),
      });
      setNote("");
      onUpdated();
    } finally { setBusy(null); }
  }

  if (currentIdx === -1) {
    return <p className="text-xs text-muted-foreground">{ar ? "الحالة الحالية خارج سير العمل القياسي." : "Current status is outside the standard workflow."}</p>;
  }

  if (matter.status === "delivered" || matter.status === "cancelled" || matter.status === "closed") {
    return <p className="text-sm text-muted-foreground">{ar ? "القضية مكتملة." : "Matter is complete."}</p>;
  }

  return (
    <div className="space-y-3">
      <div>
        <Label className="text-xs">{ar ? "ملاحظة (اختياري)" : "Note (optional)"}</Label>
        <Input value={note} onChange={(e) => setNote(e.target.value)} placeholder={ar ? "مثال: تم رفع الطلب لدائرة الأراضي" : "e.g., Application filed at Land Dept"} className="mt-1 text-sm" />
      </div>
      <div className="flex flex-wrap gap-2">
        {nextSteps.length === 0 ? (
          <p className="text-xs text-muted-foreground">{ar ? "لا خطوات تالية." : "No further steps."}</p>
        ) : (
          nextSteps.map((s) => (
            <Button key={s.key} size="sm" onClick={() => advance(s.key)} disabled={busy === s.key} className="gap-1.5">
              {busy === s.key ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <ArrowLeft className="h-3.5 w-3.5 rotate-180" />}
              {ar ? `تقديم إلى: ${s.ar}` : `Advance to: ${s.en}`}
            </Button>
          ))
        )}
        <Button size="sm" variant="destructive" onClick={() => advance("cancelled")} disabled={busy === "cancelled"}>
          {busy === "cancelled" ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <XCircle className="h-3.5 w-3.5" />}
          {ar ? "إلغاء القضية" : "Cancel matter"}
        </Button>
      </div>
    </div>
  );
}

// ---------- Task actions ----------
function TaskActions({ matterId, taskId, currentStatus, ar, onUpdated }: { matterId: string; taskId: string; currentStatus: string; ar: boolean; onUpdated: () => void }) {
  const [busy, setBusy] = useState(false);
  async function update(status: string) {
    setBusy(true);
    try {
      await fetch(`/api/legal/matters/${matterId}/tasks/${taskId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status }),
      });
      onUpdated();
    } finally { setBusy(false); }
  }
  return (
    <div className="flex flex-wrap gap-1">
      {currentStatus !== "completed" && (
        <Button size="sm" disabled={busy} onClick={() => update("completed")} className="h-7 gap-1 text-xs">
          {busy ? <Loader2 className="h-3 w-3 animate-spin" /> : <CheckCircle2 className="h-3 w-3" />}
          {ar ? "إنجاز" : "Complete"}
        </Button>
      )}
      {currentStatus === "completed" && (
        <Button size="sm" variant="outline" disabled={busy} onClick={() => update("pending")} className="h-7 text-xs">
          {ar ? "إعادة" : "Reopen"}
        </Button>
      )}
      {currentStatus !== "in_progress" && currentStatus !== "completed" && (
        <Button size="sm" variant="outline" disabled={busy} onClick={() => update("in_progress")} className="h-7 text-xs">
          {ar ? "بدء" : "Start"}
        </Button>
      )}
      {currentStatus !== "blocked" && currentStatus !== "completed" && (
        <Button size="sm" variant="outline" disabled={busy} onClick={() => update("blocked")} className="h-7 text-xs">
          {ar ? "حظر" : "Block"}
        </Button>
      )}
    </div>
  );
}

// ---------- Documents Review Panel ----------
function DocumentsReviewPanel({ matter, ar, onUpdated, canReview }: { matter: Matter; ar: boolean; onUpdated: () => void; canReview: boolean }) {
  const [reviewing, setReviewing] = useState<string | null>(null);
  const [notes, setNotes] = useState<Record<string, string>>({});

  async function review(docId: string, status: "approved" | "rejected" | "needs_resubmission") {
    setReviewing(docId);
    try {
      await fetch(`/api/legal/matters/${matter.id}/documents/${docId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ reviewStatus: status, notes: notes[docId] || undefined }),
      });
      setNotes((n) => ({ ...n, [docId]: "" }));
      onUpdated();
    } finally { setReviewing(null); }
  }

  // Group docs by requirementSlug
  const requirements = matter.legalService?.documentRequirements ?? [];
  const docsByReq: Record<string, Matter["documents"]> = {};
  for (const d of matter.documents) {
    const key = d.requirementSlug ?? "_unlinked";
    if (!docsByReq[key]) docsByReq[key] = [];
    docsByReq[key].push(d);
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2 text-base"><FileText className="h-4 w-4" />{ar ? "مراجعة المستندات" : "Document review"}</CardTitle>
        <CardDescription>{ar ? "راجع كل مستند، وافق أو ارفض مع ملاحظات للموكل." : "Review each document, approve or reject with notes for the client."}</CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Requirements checklist */}
        <div>
          <p className="mb-2 text-xs font-semibold text-muted-foreground">{ar ? "قائمة المتطلبات" : "Requirements checklist"}</p>
          <ul className="space-y-1.5">
            {requirements.map((r) => {
              const docs = docsByReq[r.slug] ?? [];
              const approved = docs.some((d) => d.reviewStatus === "approved");
              return (
                <li key={r.id} className="rounded-md border border-border p-2 text-xs">
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <span className="flex items-center gap-1.5">
                      {approved ? <CheckCircle2 className="h-3 w-3 text-emerald-600" /> : docs.length > 0 ? <FileWarning className="h-3 w-3 text-amber-600" /> : <Circle className="h-3 w-3 text-muted-foreground" />}
                      <span className="font-medium">{ar ? r.nameAr : r.nameEn}</span>
                    </span>
                    <div className="flex items-center gap-1">
                      <Badge variant="outline" className="text-[10px]">{STAGE_LABEL[r.stage]?.[ar ? "ar" : "en"] ?? r.stage}</Badge>
                      <Badge variant="outline" className="text-[10px]">{responsibleLabel(r.provider, ar)}</Badge>
                      {r.requiresOriginal && <Badge variant="warning" className="text-[10px]">{ar ? "أصلي" : "Original"}</Badge>}
                      {r.requiresNotarization && <Badge variant="warning" className="text-[10px]">{ar ? "موثّق" : "Notarized"}</Badge>}
                      <Badge variant={approved ? "default" : docs.length > 0 ? "secondary" : "outline"} className="text-[10px]">
                        {approved ? (ar ? "موافق" : "Approved") : docs.length > 0 ? (ar ? `${docs.length} للمراجعة` : `${docs.length} to review`) : (r.isRequired ? (ar ? "مطلوب" : "Required") : (ar ? "اختياري" : "Optional"))}
                      </Badge>
                    </div>
                  </div>
                  {/* Show uploaded docs under this requirement */}
                  {docs.length > 0 && (
                    <ul className="mt-2 space-y-1.5">
                      {docs.map((d) => {
                        const Icon = REVIEW_ICON[d.reviewStatus ?? "pending"] ?? FileText;
                        return (
                          <li key={d.id} className="rounded border border-border/60 bg-muted/30 p-2">
                            <div className="flex flex-wrap items-center justify-between gap-2">
                              <div className="flex min-w-0 items-center gap-1.5">
                                <Icon className={`h-3.5 w-3.5 ${d.reviewStatus === "approved" ? "text-emerald-600" : d.reviewStatus === "rejected" ? "text-destructive" : d.reviewStatus === "needs_resubmission" ? "text-amber-600" : "text-muted-foreground"}`} />
                                <div className="min-w-0">
                                  <p className="truncate text-xs font-medium">{d.fileName}</p>
                                  <p className="text-[10px] text-muted-foreground">{new Date(d.createdAt).toLocaleString(ar ? "ar-JO" : "en-US")}</p>
                                </div>
                              </div>
                              <div className="flex items-center gap-1">
                                {d.reviewStatus && <Badge variant={d.reviewStatus === "approved" ? "default" : d.reviewStatus === "rejected" ? "destructive" : "secondary"} className="text-[10px]">{reviewLabel(d.reviewStatus, ar)}</Badge>}
                                {d.fileUrl.startsWith("data:") ? (
                                  <a href={d.fileUrl} download={d.fileName}><Button size="sm" variant="ghost" className="h-6 text-[10px]">{ar ? "تنزيل" : "Download"}</Button></a>
                                ) : (
                                  <a href={d.fileUrl} target="_blank" rel="noopener noreferrer"><Button size="sm" variant="ghost" className="h-6 text-[10px]">{ar ? "عرض" : "View"}</Button></a>
                                )}
                              </div>
                            </div>
                            {d.reviewNotes && <p className="mt-1 text-[10px] italic text-muted-foreground">"{d.reviewNotes}"</p>}
                            {canReview && d.reviewStatus !== "approved" && (
                              <div className="mt-2 space-y-1.5">
                                <Input
                                  value={notes[d.id] ?? ""}
                                  onChange={(e) => setNotes((n) => ({ ...n, [d.id]: e.target.value }))}
                                  placeholder={ar ? "ملاحظات للموكل (اختياري)" : "Notes for client (optional)"}
                                  className="text-xs"
                                />
                                <div className="flex flex-wrap gap-1">
                                  <Button size="sm" disabled={reviewing === d.id} onClick={() => review(d.id, "approved")} className="h-6 gap-1 text-[10px]">
                                    {reviewing === d.id ? <Loader2 className="h-2.5 w-2.5 animate-spin" /> : <CheckCircle2 className="h-2.5 w-2.5" />}
                                    {ar ? "موافقة" : "Approve"}
                                  </Button>
                                  <Button size="sm" variant="outline" disabled={reviewing === d.id} onClick={() => review(d.id, "needs_resubmission")} className="h-6 gap-1 text-[10px]">
                                    <FileWarning className="h-2.5 w-2.5" />
                                    {ar ? "إعادة رفع" : "Resubmit"}
                                  </Button>
                                  <Button size="sm" variant="destructive" disabled={reviewing === d.id} onClick={() => review(d.id, "rejected")} className="h-6 gap-1 text-[10px]">
                                    <XCircle className="h-2.5 w-2.5" />
                                    {ar ? "رفض" : "Reject"}
                                  </Button>
                                </div>
                              </div>
                            )}
                          </li>
                        );
                      })}
                    </ul>
                  )}
                </li>
              );
            })}
          </ul>
        </div>
      </CardContent>
    </Card>
  );
}

// ---------- Fees Panel (lawyer-editable) ----------
function FeesPanel({ matter, ar, onUpdated, canEdit }: { matter: Matter; ar: boolean; onUpdated: () => void; canEdit: boolean }) {
  const [platformFee, setPlatformFee] = useState(String(matter.platformFeeJOD));
  const [lawyerFee, setLawyerFee] = useState(String(matter.lawyerFeeJOD));
  const [govtFee, setGovtFee] = useState(String(matter.governmentFeeJOD));
  const [govtIncluded, setGovtIncluded] = useState(matter.governmentFeeIncluded);
  const [saving, setSaving] = useState(false);
  const [savedAt, setSavedAt] = useState<string | null>(null);

  // Re-sync when matter reloads
  useEffect(() => {
    setPlatformFee(String(matter.platformFeeJOD));
    setLawyerFee(String(matter.lawyerFeeJOD));
    setGovtFee(String(matter.governmentFeeJOD));
    setGovtIncluded(matter.governmentFeeIncluded);
  }, [matter.platformFeeJOD, matter.lawyerFeeJOD, matter.governmentFeeJOD, matter.governmentFeeIncluded]);

  async function save() {
    setSaving(true);
    try {
      await fetch(`/api/legal/matters/${matter.id}/fees`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          platformFeeJOD: Number(platformFee) || 0,
          lawyerFeeJOD: Number(lawyerFee) || 0,
          governmentFeeJOD: Number(govtFee) || 0,
          governmentFeeIncluded: govtIncluded,
        }),
      });
      setSavedAt(new Date().toISOString());
      onUpdated();
      setTimeout(() => setSavedAt(null), 3000);
    } finally { setSaving(false); }
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2 text-base"><Wallet className="h-4 w-4" />{ar ? "تقسيم الرسوم" : "Fee breakdown"}</CardTitle>
        <CardDescription className="text-xs">
          {ar
            ? "افصل الرسوم بوضوح. لا تدّعِ أبداً أن رسوم الحكومة مشمولة ما لم تكن متأكداً 100%."
            : "Separate fees clearly. NEVER claim government fees are included unless you are 100% certain."}
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="grid gap-3 sm:grid-cols-3">
          <div>
            <Label className="text-xs">{ar ? "رسوم المنصة (JOD)" : "Platform fee (JOD)"}</Label>
            <Input type="number" min="0" value={platformFee} onChange={(e) => setPlatformFee(e.target.value)} disabled={!canEdit || saving} className="mt-1" />
          </div>
          <div>
            <Label className="text-xs">{ar ? "رسوم المحامي (JOD)" : "Lawyer fee (JOD)"}</Label>
            <Input type="number" min="0" value={lawyerFee} onChange={(e) => setLawyerFee(e.target.value)} disabled={!canEdit || saving} className="mt-1" />
          </div>
          <div>
            <Label className="text-xs">{ar ? "رسوم حكومية (JOD)" : "Government fee (JOD)"}</Label>
            <Input type="number" min="0" value={govtFee} onChange={(e) => setGovtFee(e.target.value)} disabled={!canEdit || saving} className="mt-1" />
          </div>
        </div>
        <div className="flex items-center gap-2">
          <input type="checkbox" id="govtIncluded" checked={govtIncluded} onChange={(e) => setGovtIncluded(e.target.checked)} disabled={!canEdit || saving} className="h-4 w-4" />
          <Label htmlFor="govtIncluded" className="text-xs">
            {ar ? "رسوم الحكومة مشمولة في عرض السعر" : "Government fee is included in our quote"}
          </Label>
        </div>
        {!govtIncluded && (
          <Alert>
            <ShieldAlert className="h-4 w-4" />
            <AlertDescription className="text-xs">
              {ar ? "رسوم الحكومة تُدفع مباشرة للجهة الرسمية ولا تشملها منصتنا." : "Government fees are paid directly to the official authority and are NOT included in our quote."}
            </AlertDescription>
          </Alert>
        )}
        {matter.feeNotesAr && (
          <div className="rounded-md bg-muted/50 p-3 text-xs text-muted-foreground">
            <p className="mb-1 font-semibold">{ar ? "ملاحظات الرسوم من الخدمة:" : "Service fee notes:"}</p>
            <p>{ar ? matter.feeNotesAr : matter.feeNotesEn}</p>
          </div>
        )}
        {canEdit && (
          <div className="flex items-center gap-3">
            <Button onClick={save} disabled={saving} className="gap-2">
              {saving ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Wallet className="h-3.5 w-3.5" />}
              {ar ? "حفظ الرسوم" : "Save fees"}
            </Button>
            {savedAt && <span className="text-xs text-emerald-700"><CheckCircle2 className="inline h-3 w-3" /> {ar ? "تم الحفظ" : "Saved"}</span>}
          </div>
        )}

        {/* Payments received */}
        <div className="border-t border-border pt-4">
          <p className="mb-2 text-xs font-semibold text-muted-foreground">{ar ? "المدفوعات المستلمة" : "Payments received"}</p>
          {matter.payments.length === 0 ? (
            <p className="text-xs text-muted-foreground">{ar ? "لا مدفوعات بعد." : "No payments yet."}</p>
          ) : (
            <ul className="space-y-1">
              {matter.payments.map((p) => (
                <li key={p.id} className="flex items-center justify-between rounded-md border border-border p-2 text-xs">
                  <span><span className="font-medium">{paymentKindLabel(p.kind, ar)}</span>{p.description && <span className="text-muted-foreground"> — {p.description}</span>}</span>
                  <span className="flex items-center gap-2"><span className="font-bold">{p.amountJOD} JOD</span><Badge variant={p.status === "PAID" ? "default" : "secondary"} className="text-[10px]">{p.status}</Badge></span>
                </li>
              ))}
            </ul>
          )}
        </div>
      </CardContent>
    </Card>
  );
}

// ---------- Messages Panel (lawyer ↔ client) ----------
function MessagesPanel({ matter, ar, onUpdated, currentUserId }: { matter: Matter; ar: boolean; onUpdated: () => void; currentUserId: string }) {
  const [text, setText] = useState("");
  const [sending, setSending] = useState(false);
  const conv = matter.conversations[0];

  async function send() {
    if (text.trim().length < 1) return;
    setSending(true);
    try {
      await fetch(`/api/legal/matters/${matter.id}/messages`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ body: text }),
      });
      setText("");
      onUpdated();
    } finally { setSending(false); }
  }

  return (
    <Card>
      <CardHeader><CardTitle className="flex items-center gap-2 text-base"><MessageSquare className="h-4 w-4" />{ar ? "الرسائل مع الموكل" : "Messages with client"}</CardTitle></CardHeader>
      <CardContent className="space-y-3">
        <div className="max-h-96 space-y-2 overflow-y-auto rounded-lg bg-muted/30 p-3">
          {!conv || conv.messages.length === 0 ? (
            <p className="py-8 text-center text-xs text-muted-foreground">{ar ? "لا رسائل بعد." : "No messages yet."}</p>
          ) : (
            conv.messages.map((m) => {
              const isMe = m.senderId === currentUserId;
              return (
                <div key={m.id} className={`flex ${isMe ? "justify-end" : "justify-start"}`}>
                  <div className={`max-w-[80%] rounded-lg px-3 py-1.5 text-sm ${isMe ? "bg-primary text-primary-foreground" : "bg-background border border-border"}`}>
                    <p className="whitespace-pre-wrap leading-6">{m.body}</p>
                    <p className="mt-0.5 text-[10px] opacity-70">{new Date(m.createdAt).toLocaleString(ar ? "ar-JO" : "en-US")}</p>
                  </div>
                </div>
              );
            })
          )}
        </div>
        <div className="flex gap-2">
          <Textarea value={text} onChange={(e) => setText(e.target.value)} placeholder={ar ? "اكتب رسالتك للموكل…" : "Type your message to the client…"} rows={2} className="text-sm" onKeyDown={(e) => { if (e.key === "Enter" && (e.ctrlKey || e.metaKey)) send(); }} />
          <Button onClick={send} disabled={sending || text.trim().length < 1} className="gap-2 self-end"><Send className="h-4 w-4" />{sending ? "…" : (ar ? "إرسال" : "Send")}</Button>
        </div>
      </CardContent>
    </Card>
  );
}

// ---------- Timeline Panel ----------
function TimelinePanel({ matter, ar, onUpdated, canAdd }: { matter: Matter; ar: boolean; onUpdated: () => void; canAdd: boolean }) {
  const [note, setNote] = useState("");
  const [adding, setAdding] = useState(false);

  async function addNote() {
    if (!note.trim()) return;
    setAdding(true);
    try {
      await fetch(`/api/legal/matters/${matter.id}/timeline`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ noteAr: note, noteEn: note, eventType: "note_added" }),
      });
      setNote("");
      onUpdated();
    } finally { setAdding(false); }
  }

  return (
    <Card>
      <CardHeader><CardTitle className="flex items-center gap-2 text-base"><Clock className="h-4 w-4" />{ar ? "الجدول الزمني" : "Timeline"}</CardTitle></CardHeader>
      <CardContent className="space-y-3">
        {canAdd && (
          <div className="flex gap-2">
            <Input value={note} onChange={(e) => setNote(e.target.value)} placeholder={ar ? "أضف ملاحظة للسجل الزمني…" : "Add a timeline note…"} className="text-sm" />
            <Button onClick={addNote} disabled={adding || !note.trim()} size="sm" className="gap-1.5"><StickyNote className="h-3.5 w-3.5" />{ar ? "إضافة" : "Add"}</Button>
          </div>
        )}
        <ol className="space-y-3">
          {matter.timelineEvents.length === 0 ? (
            <li className="text-xs text-muted-foreground">{ar ? "لا أحداث بعد." : "No events yet."}</li>
          ) : (
            matter.timelineEvents.map((ev) => (
              <li key={ev.id} className="flex gap-3">
                <div className="grid h-7 w-7 flex-shrink-0 place-items-center rounded-full bg-primary/10 text-primary text-[10px] font-bold">
                  {ev.actorRole === "lawyer" ? <Gavel className="h-3 w-3" /> : ev.actorRole === "client" ? <UserIcon className="h-3 w-3" /> : ev.actorRole === "admin" ? <ShieldCheck className="h-3 w-3" /> : <Clock className="h-3 w-3" />}
                </div>
                <div className="flex-1">
                  <p className="text-sm font-medium">{ar ? ev.titleAr : ev.titleEn}</p>
                  {ev.descriptionAr && <p className="text-xs text-muted-foreground">{ar ? ev.descriptionAr : ev.descriptionEn}</p>}
                  <p className="mt-0.5 text-[10px] text-muted-foreground">{new Date(ev.createdAt).toLocaleString(ar ? "ar-JO" : "en-US")} · {ev.actorRole}</p>
                </div>
              </li>
            ))
          )}
        </ol>
      </CardContent>
    </Card>
  );
}

// ---------- Lawyer Notes Panel (private) ----------
function LawyerNotesPanel({ matter, ar, onUpdated }: { matter: Matter; ar: boolean; onUpdated: () => void }) {
  const [notes, setNotes] = useState(matter.lawyerNotes ?? "");
  const [saving, setSaving] = useState(false);
  const [savedAt, setSavedAt] = useState<string | null>(null);

  useEffect(() => { setNotes(matter.lawyerNotes ?? ""); }, [matter.lawyerNotes]);

  async function save() {
    setSaving(true);
    try {
      await fetch(`/api/legal/matters/${matter.id}/fees`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ lawyerNotes: notes }),
      });
      setSavedAt(new Date().toISOString());
      onUpdated();
      setTimeout(() => setSavedAt(null), 3000);
    } finally { setSaving(false); }
  }

  return (
    <Card className="border-amber-200 bg-amber-50/50">
      <CardHeader>
        <CardTitle className="flex items-center gap-2 text-base"><StickyNote className="h-4 w-4 text-amber-700" />{ar ? "ملاحظات المحامي الخاصة" : "Lawyer private notes"}</CardTitle>
        <CardDescription className="text-xs">{ar ? "مرئية لك أنت والمشرف فقط — لا تصل للموكل." : "Visible only to you and admin — never shared with the client."}</CardDescription>
      </CardHeader>
      <CardContent className="space-y-2">
        <Textarea value={notes} onChange={(e) => setNotes(e.target.value)} rows={4} placeholder={ar ? "ملاحظات داخلية، تقييم القضية، المخاطر…" : "Internal notes, case assessment, risks…"} className="text-sm" />
        <div className="flex items-center gap-3">
          <Button onClick={save} disabled={saving} size="sm" variant="outline" className="gap-1.5">
            {saving ? <Loader2 className="h-3 w-3 animate-spin" /> : <StickyNote className="h-3 w-3" />}
            {ar ? "حفظ الملاحظات" : "Save notes"}
          </Button>
          {savedAt && <span className="text-xs text-emerald-700"><CheckCircle2 className="inline h-3 w-3" /> {ar ? "تم الحفظ" : "Saved"}</span>}
        </div>
      </CardContent>
    </Card>
  );
}

// ---------- helpers ----------
function remoteLabel(re: string, ar: boolean): string {
  if (re === "fully_remote") return ar ? "عن بُعد بالكامل" : "Fully remote";
  if (re === "partially_remote") return ar ? "جزئياً عن بُعد" : "Partially remote";
  if (re === "in_person_required") return ar ? "يتطلب حضوراً" : "In-person required";
  return ar ? "غير محدد" : "Unknown";
}
function taskStatusLabel(s: string, ar: boolean): string {
  const m: Record<string, { ar: string; en: string }> = {
    pending: { ar: "معلّق", en: "Pending" },
    in_progress: { ar: "قيد التنفيذ", en: "In progress" },
    completed: { ar: "مكتمل", en: "Completed" },
    blocked: { ar: "محظور", en: "Blocked" },
    skipped: { ar: "متخطّى", en: "Skipped" },
  };
  const v = m[s] ?? { ar: s, en: s };
  return ar ? v.ar : v.en;
}
function responsibleLabel(r: string, ar: boolean): string {
  const m: Record<string, { ar: string; en: string }> = {
    client: { ar: "الموكل", en: "Client" },
    lawyer: { ar: "المحامي", en: "Lawyer" },
    authority: { ar: "الجهة", en: "Authority" },
    platform: { ar: "المنصة", en: "Platform" },
  };
  const v = m[r] ?? { ar: r, en: r };
  return ar ? v.ar : v.en;
}
function paymentKindLabel(k: string, ar: boolean): string {
  const m: Record<string, { ar: string; en: string }> = {
    platform_fee: { ar: "رسوم منصة", en: "Platform fee" },
    lawyer_fee: { ar: "رسوم محامي", en: "Lawyer fee" },
    government_fee: { ar: "رسوم حكومية", en: "Government fee" },
    disbursement: { ar: "مصروف", en: "Disbursement" },
  };
  const v = m[k] ?? { ar: k, en: k };
  return ar ? v.ar : v.en;
}
function reviewLabel(s: string, ar: boolean): string {
  const m: Record<string, { ar: string; en: string }> = {
    approved: { ar: "موافق", en: "Approved" },
    rejected: { ar: "مرفوض", en: "Rejected" },
    needs_resubmission: { ar: "إعادة رفع", en: "Resubmit" },
    pending: { ar: "بانتظار", en: "Pending" },
  };
  const v = m[s] ?? { ar: s, en: s };
  return ar ? v.ar : v.en;
}
function clientStatusLabel(s: string, ar: boolean): string {
  const m: Record<string, { ar: string; en: string }> = {
    jordanian_abroad: { ar: "أردني مغترب", en: "Jordanian abroad" },
    foreigner: { ar: "أجنبي", en: "Foreigner" },
    dual: { ar: "مزدوج الجنسية", en: "Dual citizen" },
    resident: { ar: "مقيم", en: "Resident" },
    visitor: { ar: "زائر", en: "Visitor" },
  };
  const v = m[s] ?? { ar: s, en: s };
  return ar ? v.ar : v.en;
}
