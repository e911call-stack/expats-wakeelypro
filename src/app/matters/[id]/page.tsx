"use client";

import { useCallback, useEffect, useRef, useState } from "react";
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
  CheckCircle2, Circle, Loader2, MessageSquare, Send, Upload, Gavel, Building2, ScrollText,
  CreditCard, Calendar, MapPin, User as UserIcon, AlertCircle,
} from "lucide-react";

type Matter = {
  id: string;
  title: string;
  status: string;
  facts: string | null;
  aiAnalysis: string | null;
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
    documentRequirements: { id: string; slug: string; nameAr: string; nameEn: string; isRequired: boolean }[];
    officialSources: { officialSource: { id: string; slug: string; nameAr: string; nameEn: string; url: string | null } }[];
  } | null;
  legalProcedure: {
    id: string; nameAr: string; nameEn: string;
    remoteEligibility: string; remoteEligibilityReasonAr: string; remoteEligibilityReasonEn: string;
    authorityAr: string | null; authorityEn: string | null;
    legalBasisAr: string | null; legalBasisEn: string | null;
  } | null;
  practiceArea: { slug: string; nameAr: string; nameEn: string } | null;
  jurisdiction: { code: string; nameAr: string; nameEn: string } | null;
  client: { id: string; name: string; email: string; phone: string | null; currentCountry: string | null; currentCity: string | null; clientStatus: string | null; language: string };
  lawyer: { id: string; user: { id: string; name: string; email: string; phone: string | null } } | null;
  documents: {
    id: string; fileName: string; fileUrl: string; fileType: string; fileSize: number;
    description: string | null; requirementSlug: string | null; createdAt: string;
    reviewStatus: string | null; reviewNotes: string | null;
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
    messages: {
      id: string; senderId: string; body: string; readAt: string | null; createdAt: string;
    }[];
  }[];
  payments: {
    id: string; amountJOD: number; kind: string; status: string;
    description: string | null; paidAt: string | null; createdAt: string;
  }[];
  intake: { id: string; rawText: string; confidence: number } | null;
};

const STATUS_LABEL: Record<string, { ar: string; en: string }> = {
  new_matter: { ar: "جديدة", en: "New" },
  service_recommended: { ar: "خدمة موصى بها", en: "Service recommended" },
  remote_eligibility_check: { ar: "فحص الأهلية عن بُعد", en: "Remote eligibility check" },
  documents_pending: { ar: "مستندات معلّقة", en: "Documents pending" },
  documents_received: { ar: "تم استلام المستندات", en: "Documents received" },
  in_progress: { ar: "قيد التنفيذ", en: "In progress" },
  in_review: { ar: "قيد المراجعة", en: "In review" },
  filing_prepared: { ar: "تجهيز التقديم", en: "Filing prepared" },
  filed_with_authority: { ar: "مقدّمة للجهة", en: "Filed with authority" },
  authority_processing: { ar: "قيد المعالجة من الجهة", en: "Authority processing" },
  ready_for_delivery: { ar: "جاهزة للتسليم", en: "Ready for delivery" },
  delivered: { ar: "تم التسليم", en: "Delivered" },
  cancelled: { ar: "ملغاة", en: "Cancelled" },
  // legacy
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

const TASK_TONES: Record<string, "default" | "secondary" | "destructive" | "outline"> = {
  pending: "secondary", in_progress: "default", completed: "default", blocked: "destructive", skipped: "outline",
};

export default function MatterDetailPage() {
  const params = useParams<{ id: string }>();
  const router = useRouter();
  const { locale } = useLocale();
  const { user } = useSession();
  const ar = locale === "ar";
  const [matter, setMatter] = useState<Matter | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(() => {
    if (!params?.id) return;
    fetch(`/api/legal/matters/${params.id}`)
      .then(async (r) => {
        if (!r.ok) throw new Error("not found");
        return r.json();
      })
      .then((d) => setMatter(d.matter))
      .catch((e) => setError(e.message))
      .finally(() => setLoading(false));
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
            <p className="mt-3 text-sm text-muted-foreground">{ar ? "القضية غير موجودة أو ليست لديك صلاحية." : "Matter not found or you do not have access."}</p>
            <Link href="/matters" className="mt-3 inline-block">
              <Button variant="outline">{ar ? "العودة للقضايا" : "Back to matters"}</Button>
            </Link>
          </CardContent>
        </Card>
      </div>
    );
  }

  const status = STATUS_LABEL[matter.status] ?? { ar: matter.status, en: matter.status };
  const reTone = REMOTE_TONES[matter.remoteEligibility] ?? "secondary";
  const isLawyer = user?.lawyerId && matter.lawyer?.id === user.lawyerId;
  const isClient = user?.id === matter.client.id;

  return (
    <div className="container mx-auto px-4 py-8 lg:py-12">
      <div className="mx-auto max-w-5xl">
        <Link href="/matters" className="mb-4 inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground">
          {ar ? <ArrowRight className="h-4 w-4" /> : <ArrowLeft className="h-4 w-4" />}
          {ar ? "العودة للقضايا" : "Back to matters"}
        </Link>

        {/* Header */}
        <Card className="mb-4">
          <CardContent className="pt-6">
            <div className="flex flex-wrap items-start justify-between gap-3">
              <div className="min-w-0 flex-1">
                <div className="mb-2 flex flex-wrap items-center gap-2">
                  <Badge>{ar ? status.ar : status.en}</Badge>
                  <Badge variant={reTone} className="gap-1">
                    <Globe className="h-3 w-3" />
                    {remoteLabel(matter.remoteEligibility, ar)}
                  </Badge>
                  {matter.urgency === "high" && <Badge variant="destructive">{ar ? "عاجل" : "Urgent"}</Badge>}
                  {matter.legalService && (
                    <Badge variant="outline">{ar ? matter.legalService.nameAr : matter.legalService.nameEn}</Badge>
                  )}
                  {matter.jurisdiction && (
                    <Badge variant="outline">{ar ? matter.jurisdiction.nameAr : matter.jurisdiction.nameEn}</Badge>
                  )}
                </div>
                <h1 className="text-2xl font-bold sm:text-3xl">{matter.title}</h1>
                <div className="mt-2 flex flex-wrap items-center gap-3 text-xs text-muted-foreground">
                  <span className="flex items-center gap-1">
                    <Calendar className="h-3 w-3" />
                    {new Date(matter.createdAt).toLocaleDateString(ar ? "ar-JO" : "en-US")}
                  </span>
                  <span className="flex items-center gap-1">
                    <UserIcon className="h-3 w-3" />
                    {ar ? "الموكل" : "Client"}: {matter.client.name}
                  </span>
                  {matter.client.currentCountry && (
                    <span className="flex items-center gap-1">
                      <MapPin className="h-3 w-3" />
                      {matter.client.currentCountry}
                    </span>
                  )}
                  {matter.lawyer && (
                    <span className="flex items-center gap-1">
                      <Gavel className="h-3 w-3" />
                      {ar ? "المحامي" : "Lawyer"}: {matter.lawyer.user.name}
                    </span>
                  )}
                </div>
              </div>
              <div className="w-40 text-end">
                <div className="mb-1 text-xs text-muted-foreground">{ar ? "التقدّم" : "Progress"}</div>
                <Progress value={matter.progressPercent} className="h-2" />
                <div className="mt-1 text-lg font-bold">{matter.progressPercent}%</div>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Remote eligibility banner */}
        <Card className="mb-4 border-primary/30 bg-primary/5">
          <CardContent className="py-4">
            <div className="flex items-start gap-2">
              <Globe className="mt-0.5 h-5 w-5 flex-shrink-0 text-primary" />
              <div className="flex-1">
                <p className="text-sm font-semibold">
                  {ar ? "حكم الإنجاز عن بُعد: " : "Remote-eligibility verdict: "}
                  <Badge variant={reTone} className="ms-1">
                    {remoteLabel(matter.remoteEligibility, ar)}
                  </Badge>
                </p>
                <p className="mt-1 text-xs leading-6 text-muted-foreground">
                  {ar ? (matter.remoteEligibilityReasonAr ?? matter.legalProcedure?.remoteEligibilityReasonAr) : (matter.remoteEligibilityReasonEn ?? matter.legalProcedure?.remoteEligibilityReasonEn)}
                </p>
                {matter.legalProcedure && (
                  <div className="mt-2 flex flex-wrap gap-3 text-xs text-muted-foreground">
                    {matter.legalProcedure.authorityAr && (
                      <span className="flex items-center gap-1">
                        <Landmark className="h-3 w-3" />
                        {ar ? matter.legalProcedure.authorityAr : matter.legalProcedure.authorityEn}
                      </span>
                    )}
                    {matter.legalProcedure.legalBasisAr && (
                      <span className="flex items-center gap-1">
                        <Scale className="h-3 w-3" />
                        {ar ? matter.legalProcedure.legalBasisAr : matter.legalProcedure.legalBasisEn}
                      </span>
                    )}
                  </div>
                )}
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Tabs */}
        <Tabs defaultValue="overview">
          <TabsList className="grid w-full grid-cols-3 sm:grid-cols-5">
            <TabsTrigger value="overview" className="gap-1 text-xs sm:text-sm">
              <ScrollText className="h-3.5 w-3.5" />
              <span className="hidden sm:inline">{ar ? "نظرة" : "Overview"}</span>
            </TabsTrigger>
            <TabsTrigger value="tasks" className="gap-1 text-xs sm:text-sm">
              <CheckCircle2 className="h-3.5 w-3.5" />
              <span className="hidden sm:inline">{ar ? "المهام" : "Tasks"}</span>
              <Badge variant="secondary" className="ml-1 text-[10px]">{matter.tasks.length}</Badge>
            </TabsTrigger>
            <TabsTrigger value="documents" className="gap-1 text-xs sm:text-sm">
              <FileText className="h-3.5 w-3.5" />
              <span className="hidden sm:inline">{ar ? "مستندات" : "Docs"}</span>
              <Badge variant="secondary" className="ml-1 text-[10px]">{matter.documents.length}</Badge>
            </TabsTrigger>
            <TabsTrigger value="messages" className="gap-1 text-xs sm:text-sm">
              <MessageSquare className="h-3.5 w-3.5" />
              <span className="hidden sm:inline">{ar ? "رسائل" : "Messages"}</span>
            </TabsTrigger>
            <TabsTrigger value="payments" className="gap-1 text-xs sm:text-sm">
              <CreditCard className="h-3.5 w-3.5" />
              <span className="hidden sm:inline">{ar ? "مدفوعات" : "Payments"}</span>
            </TabsTrigger>
          </TabsList>

          {/* Overview */}
          <TabsContent value="overview" className="space-y-4">
            <div className="grid gap-4 md:grid-cols-3">
              <Card className="md:col-span-2">
                <CardHeader>
                  <CardTitle className="text-base">{ar ? "الوقائع" : "Facts"}</CardTitle>
                </CardHeader>
                <CardContent>
                  <p className="whitespace-pre-wrap text-sm leading-7 text-muted-foreground">
                    {matter.facts || (ar ? "لا توجد وقائع مسجلة." : "No facts recorded.")}
                  </p>
                </CardContent>
              </Card>
              <Card>
                <CardHeader>
                  <CardTitle className="text-base">{ar ? "المحامي المسند" : "Assigned lawyer"}</CardTitle>
                </CardHeader>
                <CardContent>
                  {matter.lawyer ? (
                    <div className="space-y-2">
                      <p className="text-sm font-semibold">{matter.lawyer.user.name}</p>
                      <p className="text-xs text-muted-foreground">{matter.lawyer.user.email}</p>
                    </div>
                  ) : (
                    <p className="text-xs text-muted-foreground">
                      {ar ? "لم يُسند محامٍ بعد. سيتم إسناد محامٍ خلال 24 ساعة." : "No lawyer assigned yet. A lawyer will be assigned within 24 hours."}
                    </p>
                  )}
                </CardContent>
              </Card>
            </div>

            {/* Fee breakdown */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2 text-base">
                  <Building2 className="h-4 w-4" />
                  {ar ? "تقسيم الرسوم" : "Fee breakdown"}
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                <div className="grid gap-2 sm:grid-cols-3">
                  <FeeBox ar={ar} labelAr="رسوم المنصة" labelEn="Platform fee" value={`${matter.platformFeeJOD} JOD`} paid={matter.payments.some((p) => p.kind === "platform_fee" && p.status === "PAID")} />
                  <FeeBox ar={ar} labelAr="رسوم المحامي" labelEn="Lawyer fee" value={`${matter.lawyerFeeJOD} JOD`} paid={matter.payments.some((p) => p.kind === "lawyer_fee" && p.status === "PAID")} />
                  <FeeBox ar={ar} labelAr="رسوم حكومية" labelEn="Government fee" value={`${matter.governmentFeeJOD} JOD`} paid={matter.payments.some((p) => p.kind === "government_fee" && p.status === "PAID")} separate />
                </div>
                {matter.feeNotesAr && (
                  <Alert>
                    <ShieldAlert className="h-4 w-4" />
                    <AlertDescription className="text-xs">
                      {ar ? matter.feeNotesAr : matter.feeNotesEn}
                    </AlertDescription>
                  </Alert>
                )}
              </CardContent>
            </Card>

            {/* Timeline */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2 text-base">
                  <Clock className="h-4 w-4" />
                  {ar ? "الجدول الزمني" : "Timeline"}
                </CardTitle>
              </CardHeader>
              <CardContent>
                <ol className="space-y-3">
                  {matter.timelineEvents.length === 0 ? (
                    <li className="text-xs text-muted-foreground">{ar ? "لا أحداث بعد." : "No events yet."}</li>
                  ) : (
                    matter.timelineEvents.map((ev) => (
                      <li key={ev.id} className="flex gap-3">
                        <div className="grid h-7 w-7 flex-shrink-0 place-items-center rounded-full bg-primary/10 text-primary text-[10px] font-bold">
                          {ev.actorRole === "lawyer" ? <Gavel className="h-3 w-3" /> : ev.actorRole === "client" ? <UserIcon className="h-3 w-3" /> : <ShieldCheck className="h-3 w-3" />}
                        </div>
                        <div className="flex-1">
                          <p className="text-sm font-medium">{ar ? ev.titleAr : ev.titleEn}</p>
                          {ev.descriptionAr && <p className="text-xs text-muted-foreground">{ar ? ev.descriptionAr : ev.descriptionEn}</p>}
                          <p className="mt-0.5 text-[10px] text-muted-foreground">
                            {new Date(ev.createdAt).toLocaleString(ar ? "ar-JO" : "en-US")} · {ev.actorRole}
                          </p>
                        </div>
                      </li>
                    ))
                  )}
                </ol>
              </CardContent>
            </Card>
          </TabsContent>

          {/* Tasks */}
          <TabsContent value="tasks">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2 text-base">
                  <CheckCircle2 className="h-4 w-4" />
                  {ar ? "المهام" : "Tasks"}
                </CardTitle>
                <CardDescription>
                  {ar
                    ? "قائمة مهام القضية. المهام ذات العلامة تتطلب حضوراً شخصياً."
                    : "Matter task list. Tasks marked with shield require physical presence."}
                </CardDescription>
              </CardHeader>
              <CardContent>
                <ul className="space-y-2">
                  {matter.tasks.map((t) => (
                    <li key={t.id} className="rounded-lg border border-border p-3">
                      <div className="flex flex-wrap items-start justify-between gap-2">
                        <div className="min-w-0 flex-1">
                          <div className="flex items-center gap-2">
                            {t.status === "completed" ? (
                              <CheckCircle2 className="h-4 w-4 text-emerald-600" />
                            ) : t.status === "blocked" ? (
                              <AlertCircle className="h-4 w-4 text-destructive" />
                            ) : (
                              <Circle className="h-4 w-4 text-muted-foreground" />
                            )}
                            <p className={`text-sm font-medium ${t.status === "completed" ? "line-through opacity-60" : ""}`}>
                              {ar ? t.titleAr : t.titleEn}
                            </p>
                          </div>
                          {t.descriptionAr && (
                            <p className="mt-1 text-xs text-muted-foreground">{ar ? t.descriptionAr : t.descriptionEn}</p>
                          )}
                          <div className="mt-2 flex flex-wrap gap-1">
                            <Badge variant={TASK_TONES[t.status] ?? "secondary"} className="text-[10px]">
                              {taskStatusLabel(t.status, ar)}
                            </Badge>
                            <Badge variant="outline" className="text-[10px]">
                              {responsibleLabel(t.responsibleRole, ar)}
                            </Badge>
                            {t.requiresPhysicalPresence && (
                              <Badge variant="warning" className="text-[10px] gap-1">
                                <ShieldAlert className="h-2.5 w-2.5" />
                                {ar ? "حضور شخصي" : "In-person"}
                              </Badge>
                            )}
                          </div>
                        </div>
                        <TaskActions matterId={matter.id} taskId={t.id} currentStatus={t.status} canEdit={Boolean(isLawyer || isClient || user?.role === "ADMIN")} onUpdated={load} ar={ar} />
                      </div>
                    </li>
                  ))}
                </ul>
              </CardContent>
            </Card>
          </TabsContent>

          {/* Documents */}
          <TabsContent value="documents">
            <DocumentsPanel matter={matter} ar={ar} onUpdated={load} canUpload={Boolean(isClient || isLawyer || user?.role === "ADMIN")} />
          </TabsContent>

          {/* Messages */}
          <TabsContent value="messages">
            <MessagesPanel matter={matter} ar={ar} onUpdated={load} currentUserId={user?.id ?? ""} />
          </TabsContent>

          {/* Payments */}
          <TabsContent value="payments">
            <PaymentsPanel matter={matter} ar={ar} onUpdated={load} canPay={Boolean(isClient || user?.role === "ADMIN")} />
          </TabsContent>
        </Tabs>

        {/* Disclaimer */}
        <Alert className="mt-4">
          <ShieldAlert className="h-4 w-4" />
          <AlertDescription className="text-xs">
            {ar
              ? "الذكاء الاصطناعي للتنقّي فقط — لا يقدم استشارة قانونية. العمل الفعلي يقوم به محامٍ مرخص وجهات حكومية أردنية."
              : "AI is for navigation only — it does not provide legal advice. Actual work is done by a licensed lawyer and Jordanian government authorities."}
          </AlertDescription>
        </Alert>
      </div>
    </div>
  );
}

function TaskActions({ matterId, taskId, currentStatus, canEdit, onUpdated, ar }: {
  matterId: string; taskId: string; currentStatus: string; canEdit: boolean; onUpdated: () => void; ar: boolean;
}) {
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
    } finally {
      setBusy(false);
    }
  }
  if (!canEdit) return null;
  return (
    <div className="flex flex-wrap gap-1">
      {currentStatus !== "completed" && (
        <Button size="sm" variant="default" disabled={busy} onClick={() => update("completed")} className="h-7 text-xs">
          {busy ? "…" : (ar ? "إنجاز" : "Complete")}
        </Button>
      )}
      {currentStatus === "completed" && (
        <Button size="sm" variant="outline" disabled={busy} onClick={() => update("pending")} className="h-7 text-xs">
          {busy ? "…" : (ar ? "إعادة" : "Reopen")}
        </Button>
      )}
      {currentStatus !== "in_progress" && currentStatus !== "completed" && (
        <Button size="sm" variant="outline" disabled={busy} onClick={() => update("in_progress")} className="h-7 text-xs">
          {ar ? "بدء" : "Start"}
        </Button>
      )}
    </div>
  );
}

function DocumentsPanel({ matter, ar, onUpdated, canUpload }: {
  matter: Matter; ar: boolean; onUpdated: () => void; canUpload: boolean;
}) {
  const [uploading, setUploading] = useState(false);
  const [fileName, setFileName] = useState("");
  const [fileType, setFileType] = useState("pdf");
  const [description, setDescription] = useState("");
  const [requirementSlug, setRequirementSlug] = useState("");
  const [base64Data, setBase64Data] = useState<string | null>(null);
  const fileRef = useRef<HTMLInputElement>(null);

  function onFileSelected(e: React.ChangeEvent<HTMLInputElement>) {
    const f = e.target.files?.[0];
    if (!f) return;
    setFileName(f.name);
    setFileType(f.type || "file");
    const reader = new FileReader();
    reader.onload = () => setBase64Data(reader.result as string);
    reader.readAsDataURL(f);
  }

  async function upload() {
    if (!fileName || !base64Data) return;
    setUploading(true);
    try {
      await fetch(`/api/legal/matters/${matter.id}/documents`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          fileName, fileBase64: base64Data, fileType, fileSize: 0,
          description: description || undefined,
          requirementSlug: requirementSlug || undefined,
        }),
      });
      setFileName(""); setDescription(""); setRequirementSlug(""); setBase64Data(null);
      if (fileRef.current) fileRef.current.value = "";
      onUpdated();
    } finally {
      setUploading(false);
    }
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2 text-base">
          <FileText className="h-4 w-4" />
          {ar ? "المستندات" : "Documents"}
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Checklist vs uploaded */}
        {matter.legalService && (
          <div>
            <p className="mb-2 text-xs font-semibold text-muted-foreground">
              {ar ? "قائمة المتطلبات" : "Requirements checklist"}
            </p>
            <ul className="space-y-1.5">
              {matter.legalService.documentRequirements.map((r) => {
                const uploaded = matter.documents.some((d) => d.requirementSlug === r.slug);
                return (
                  <li key={r.id} className="flex items-center justify-between rounded-md border border-border p-2 text-xs">
                    <span className="flex items-center gap-1.5">
                      {uploaded ? <CheckCircle2 className="h-3 w-3 text-emerald-600" /> : <Circle className="h-3 w-3 text-muted-foreground" />}
                      {ar ? r.nameAr : r.nameEn}
                    </span>
                    <Badge variant={uploaded ? "default" : "secondary"} className="text-[10px]">
                      {uploaded ? (ar ? "مرفوع" : "Uploaded") : (r.isRequired ? (ar ? "مطلوب" : "Required") : (ar ? "اختياري" : "Optional"))}
                    </Badge>
                  </li>
                );
              })}
            </ul>
          </div>
        )}

        {/* Upload */}
        {canUpload && (
          <div className="rounded-lg border border-dashed border-border p-4">
            <p className="mb-2 text-xs font-semibold">{ar ? "رفع مستند جديد" : "Upload a new document"}</p>
            <div className="grid gap-2 sm:grid-cols-2">
              <div>
                <Label className="text-xs">{ar ? "الملف" : "File"}</Label>
                <input
                  ref={fileRef}
                  type="file"
                  onChange={onFileSelected}
                  className="mt-1 block w-full text-xs file:me-2 file:rounded file:border-0 file:bg-primary file:px-3 file:py-1 file:text-primary-foreground"
                />
              </div>
              <div>
                <Label className="text-xs">{ar ? "متطلبات مرتبط" : "Linked requirement"}</Label>
                <select
                  value={requirementSlug}
                  onChange={(e) => setRequirementSlug(e.target.value)}
                  className="mt-1 w-full rounded-md border border-input bg-background px-2 py-1 text-xs"
                >
                  <option value="">{ar ? "— بدون —" : "— None —"}</option>
                  {matter.legalService?.documentRequirements.map((r) => (
                    <option key={r.id} value={r.slug}>{ar ? r.nameAr : r.nameEn}</option>
                  ))}
                </select>
              </div>
            </div>
            <Textarea
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder={ar ? "وصف مختصر (اختياري)" : "Brief description (optional)"}
              rows={2}
              className="mt-2 text-xs"
            />
            <Button onClick={upload} disabled={uploading || !base64Data} size="sm" className="mt-2 gap-2">
              <Upload className="h-3 w-3" />
              {uploading ? (ar ? "جارٍ الرفع…" : "Uploading…") : (ar ? "رفع" : "Upload")}
            </Button>
          </div>
        )}

        {/* Uploaded docs */}
        <ul className="space-y-2">
          {matter.documents.length === 0 ? (
            <li className="text-xs text-muted-foreground">{ar ? "لا مستندات مرفوعة بعد." : "No documents uploaded yet."}</li>
          ) : (
            matter.documents.map((d) => (
              <li key={d.id} className="flex items-center justify-between rounded-lg border border-border p-2">
                <div className="min-w-0 flex-1">
                  <p className="truncate text-sm font-medium">{d.fileName}</p>
                  <p className="text-xs text-muted-foreground">
                    {new Date(d.createdAt).toLocaleDateString(ar ? "ar-JO" : "en-US")}
                    {d.requirementSlug && ` · ${d.requirementSlug}`}
                    {d.reviewStatus && ` · ${docReviewLabel(d.reviewStatus, ar)}`}
                    {d.reviewNotes && <span className="block text-[10px] text-amber-700">“{d.reviewNotes}”</span>}
                  </p>
                </div>
                {d.fileUrl.startsWith("data:") ? (
                  <a href={d.fileUrl} download={d.fileName}>
                    <Button size="sm" variant="outline" className="h-7 text-xs">{ar ? "تنزيل" : "Download"}</Button>
                  </a>
                ) : (
                  <a href={d.fileUrl} target="_blank" rel="noopener noreferrer">
                    <Button size="sm" variant="outline" className="h-7 text-xs">{ar ? "عرض" : "View"}</Button>
                  </a>
                )}
              </li>
            ))
          )}
        </ul>
      </CardContent>
    </Card>
  );
}

function MessagesPanel({ matter, ar, onUpdated, currentUserId }: {
  matter: Matter; ar: boolean; onUpdated: () => void; currentUserId: string;
}) {
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
    } finally {
      setSending(false);
    }
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2 text-base">
          <MessageSquare className="h-4 w-4" />
          {ar ? "الرسائل" : "Messages"}
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-3">
        <div className="max-h-96 space-y-2 overflow-y-auto rounded-lg bg-muted/30 p-3">
          {!conv || conv.messages.length === 0 ? (
            <p className="text-center text-xs text-muted-foreground py-8">
              {ar ? "لا رسائل بعد. ابدأ المحادثة." : "No messages yet. Start the conversation."}
            </p>
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
          <Textarea
            value={text}
            onChange={(e) => setText(e.target.value)}
            placeholder={ar ? "اكتب رسالتك…" : "Type your message…"}
            rows={2}
            className="text-sm"
            onKeyDown={(e) => { if (e.key === "Enter" && (e.ctrlKey || e.metaKey)) send(); }}
          />
          <Button onClick={send} disabled={sending || text.trim().length < 1} className="gap-2 self-end">
            <Send className="h-4 w-4" />
            {sending ? "…" : (ar ? "إرسال" : "Send")}
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}

function PaymentsPanel({ matter, ar, onUpdated, canPay }: {
  matter: Matter; ar: boolean; onUpdated: () => void; canPay: boolean;
}) {
  const [paying, setPaying] = useState<string | null>(null);
  const [payMsg, setPayMsg] = useState<string | null>(null);
  const [checkoutUrl, setCheckoutUrl] = useState<string | null>(null);

  async function pay(kind: "platform_fee" | "lawyer_fee" | "government_fee", amount: number) {
    setPaying(kind);
    setPayMsg(null);
    setCheckoutUrl(null);
    try {
      const res = await fetch(`/api/legal/matters/${matter.id}/payments`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ kind, amountJOD: amount }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.message || data.error || "payment_failed");
      if (data.checkoutUrl) {
        setCheckoutUrl(data.checkoutUrl);
        setPayMsg(ar
          ? "تم إنشاء طلب الدفع عبر CliQ — أكّد الدفع في تطبيق بنكك، ثم عُد لتحديث الصفحة."
          : "CliQ payment request created — approve it in your banking app, then refresh.");
      } else {
        onUpdated();
      }
    } catch (e) {
      setPayMsg(e instanceof Error ? e.message : "payment_failed");
    } finally {
      setPaying(null);
    }
  }

  const platformPaid = matter.payments.some((p) => p.kind === "platform_fee" && p.status === "PAID");
  const lawyerPaid = matter.payments.some((p) => p.kind === "lawyer_fee" && p.status === "PAID");
  const govPaid = matter.payments.some((p) => p.kind === "government_fee" && p.status === "PAID");

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2 text-base">
          <CreditCard className="h-4 w-4" />
          {ar ? "المدفوعات" : "Payments"}
        </CardTitle>
        <CardDescription>
          {ar
            ? "ادفع رسوم المنصة والمحامي منفصلة. الرسوم الحكومية تُدفع مباشرة للجهة."
            : "Pay platform and lawyer fees separately. Government fees are paid directly to the authority."}
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="grid gap-2 sm:grid-cols-3">
          <PaymentBox ar={ar} labelAr="رسوم المنصة" labelEn="Platform fee" amount={matter.platformFeeJOD} paid={platformPaid} canPay={canPay} paying={paying === "platform_fee"} onPay={() => pay("platform_fee", matter.platformFeeJOD)} />
          <PaymentBox ar={ar} labelAr="رسوم المحامي" labelEn="Lawyer fee" amount={matter.lawyerFeeJOD} paid={lawyerPaid} canPay={canPay} paying={paying === "lawyer_fee"} onPay={() => pay("lawyer_fee", matter.lawyerFeeJOD)} />
          <PaymentBox ar={ar} labelAr="رسوم حكومية (تُدفع للجهة)" labelEn="Government fee (to authority)" amount={matter.governmentFeeJOD} paid={govPaid} canPay={canPay} paying={paying === "government_fee"} onPay={() => pay("government_fee", matter.governmentFeeJOD)} />
        </div>

        {payMsg && (
          <Alert variant={checkoutUrl ? "default" : "destructive"}>
            <AlertDescription className="text-sm">{payMsg}</AlertDescription>
            {checkoutUrl && (
              <a href={checkoutUrl} target="_blank" rel="noopener noreferrer" className="mt-2 inline-block text-sm font-semibold text-primary underline">
                {ar ? "فتح صفحة الدفع" : "Open payment page"}
              </a>
            )}
          </Alert>
        )}

        {matter.payments.length > 0 && (
          <div>
            <p className="mb-2 text-xs font-semibold text-muted-foreground">{ar ? "سجل المدفوعات" : "Payment history"}</p>
            <ul className="space-y-1">
              {matter.payments.map((p) => (
                <li key={p.id} className="flex items-center justify-between rounded-md border border-border p-2 text-xs">
                  <div>
                    <span className="font-medium">{paymentKindLabel(p.kind, ar)}</span>
                    {p.description && <span className="text-muted-foreground"> — {p.description}</span>}
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="font-bold">{p.amountJOD} JOD</span>
                    <Badge variant={p.status === "PAID" ? "default" : "secondary"} className="text-[10px]">{p.status}</Badge>
                  </div>
                </li>
              ))}
            </ul>
          </div>
        )}
      </CardContent>
    </Card>
  );
}

function PaymentBox({ ar, labelAr, labelEn, amount, paid, canPay, paying, onPay }: {
  ar: boolean; labelAr: string; labelEn: string; amount: number; paid: boolean;
  canPay: boolean; paying: boolean; onPay: () => void;
}) {
  return (
    <div className="rounded-lg border border-border p-3">
      <p className="text-xs text-muted-foreground">{ar ? labelAr : labelEn}</p>
      <p className="mt-1 text-lg font-bold">{amount} JOD</p>
      <div className="mt-2">
        {paid ? (
          <Badge variant="default" className="gap-1">
            <CheckCircle2 className="h-3 w-3" />
            {ar ? "مدفوع" : "Paid"}
          </Badge>
        ) : canPay && amount > 0 ? (
          <Button size="sm" onClick={onPay} disabled={paying} className="h-7 gap-1 text-xs">
            <CreditCard className="h-3 w-3" />
            {paying ? "…" : (ar ? "ادفع" : "Pay")}
          </Button>
        ) : (
          <Badge variant="secondary" className="text-[10px]">{ar ? "بانتظار" : "Pending"}</Badge>
        )}
      </div>
    </div>
  );
}

function FeeBox({ ar, labelAr, labelEn, value, paid, separate }: { ar: boolean; labelAr: string; labelEn: string; value: string; paid: boolean; separate?: boolean }) {
  const sepLabel = ar ? "(تُدفع للجهة منفصلة)" : "(paid to authority separately)";
  return (
    <div className={`rounded-lg border p-3 ${separate ? "border-dashed border-muted bg-muted/20" : "border-border"}`}>
      <p className="text-xs text-muted-foreground">
        {ar ? labelAr : labelEn}
        {separate && <span className="ms-1 text-[10px] text-amber-700">{sepLabel}</span>}
      </p>
      <p className="mt-1 text-sm font-bold">{value}</p>
      {paid && <p className="mt-1 text-[10px] text-emerald-600">{ar ? "مدفوع" : "Paid"}</p>}
    </div>
  );
}

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
function docReviewLabel(s: string, ar: boolean): string {
  const m: Record<string, { ar: string; en: string }> = {
    pending: { ar: "بانتظار المراجعة", en: "Pending review" },
    approved: { ar: "موافق عليه", en: "Approved" },
    rejected: { ar: "مرفوض", en: "Rejected" },
    needs_resubmission: { ar: "يحتاج إعادة رفع", en: "Needs resubmission" },
  };
  const v = m[s] ?? { ar: s, en: s };
  return ar ? v.ar : v.en;
}
