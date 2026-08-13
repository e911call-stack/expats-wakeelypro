"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { useLocale } from "@/lib/locale-provider";
import { useSession } from "@/lib/session-provider";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Alert, AlertDescription } from "@/components/ui/alert";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import { Label } from "@/components/ui/label";
import {
  ShieldAlert, Loader2, Gavel, Globe, RefreshCw, Users, FileText, Clock, CheckCircle2, ArrowDownUp, Eye, ChevronLeft, ChevronRight,
} from "lucide-react";

type Matter = {
  id: string;
  title: string;
  status: string;
  remoteEligibility: string;
  clientCountry: string | null;
  progressPercent: number;
  createdAt: string;
  legalService: { slug: string; nameAr: string; nameEn: string } | null;
  client: { id: string; name: string; email: string; phone: string | null; currentCountry: string | null; clientStatus: string | null } | null;
  lawyer: { id: string; user: { name: string; email: string } } | null;
  _count: { documents: number; tasks: number; conversations: number };
};

type Lawyer = {
  id: string;
  barNumber: string;
  name: string;
  email: string;
  rating: number;
  totalReviews: number;
  activeMattersCount: number;
  practiceAreas: { slug: string; nameAr: string; nameEn: string }[];
  cities: string[];
  languages: string[];
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
  lawyer_assigned: { ar: "تم إسناد محامٍ", en: "Lawyer assigned" },
};

const REMOTE_TONES: Record<string, "success" | "warning" | "danger" | "secondary"> = {
  fully_remote: "success", partially_remote: "warning", in_person_required: "danger", unknown: "secondary",
};

export default function AdminMattersPage() {
  const { locale } = useLocale();
  const { user, loading: sessionLoading } = useSession();
  const ar = locale === "ar";
  const [matters, setMatters] = useState<Matter[]>([]);
  const [lawyers, setLawyers] = useState<Lawyer[]>([]);
  const [loading, setLoading] = useState(true);
  const [assigning, setAssigning] = useState<string | null>(null);
  const [assignError, setAssignError] = useState<string | null>(null);
  const [assignSuccess, setAssignSuccess] = useState<string | null>(null);

  // Filters
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [assignedFilter, setAssignedFilter] = useState<string>("all");
  const [needsAssignment, setNeedsAssignment] = useState(false);
  const [search, setSearch] = useState("");
  const [page, setPage] = useState(1);
  const [total, setTotal] = useState(0);
  const perPage = 25;
  const [changingStatus, setChangingStatus] = useState<string | null>(null);
  const [statusMsg, setStatusMsg] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams();
      if (statusFilter !== "all") params.set("status", statusFilter);
      if (assignedFilter !== "all") params.set("assigned", assignedFilter);
      if (needsAssignment) params.set("needsAssignment", "true");
      if (search.trim()) params.set("search", search.trim());
      params.set("page", String(page));
      params.set("perPage", String(perPage));
      const [mRes, lRes] = await Promise.all([
        fetch(`/api/admin/matters?${params.toString()}`, { cache: "no-store" }),
        fetch("/api/lawyers", { cache: "no-store" }),
      ]);
      const m = await mRes.json();
      const l = await lRes.json();
      setMatters(m.matters ?? []);
      setTotal(m.total ?? 0);
      setLawyers(l.lawyers ?? []);
    } finally {
      setLoading(false);
    }
  }, [statusFilter, assignedFilter, needsAssignment, search, page]);

  useEffect(() => {
    if (user && user.role === "ADMIN") load();
    else setLoading(false);
  }, [user, load]);

  async function changeStatus(matterId: string, status: string) {
    if (!status) return;
    setChangingStatus(matterId);
    setStatusMsg(null);
    try {
      const res = await fetch(`/api/legal/matters/${matterId}/status`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.message || data.error || "status_update_failed");
      setStatusMsg(ar ? `تم تحديث الحالة إلى ${STATUS_LABEL[status]?.ar ?? status}` : `Status updated to ${STATUS_LABEL[status]?.en ?? status}`);
      await load();
    } catch (e) {
      setAssignError(e instanceof Error ? e.message : "status_update_failed");
    } finally {
      setChangingStatus(null);
      setTimeout(() => { setStatusMsg(null); setAssignError(null); }, 4000);
    }
  }

  async function assignLawyer(matterId: string, lawyerId: string) {
    if (!lawyerId) return;
    setAssigning(matterId);
    setAssignError(null);
    setAssignSuccess(null);
    try {
      const res = await fetch(`/api/legal/matters/${matterId}/assign`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ lawyerId }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.message || data.error || "assign_failed");
      setAssignSuccess(ar ? `تم إسناد المحامي للقضية بنجاح` : `Lawyer assigned successfully`);
      await load();
    } catch (e) {
      setAssignError(e instanceof Error ? e.message : "unknown_error");
    } finally {
      setAssigning(null);
      setTimeout(() => { setAssignSuccess(null); setAssignError(null); }, 4000);
    }
  }

  if (sessionLoading) {
    return <div className="container mx-auto px-4 py-16"><div className="flex justify-center"><Loader2 className="h-8 w-8 animate-spin text-muted-foreground" /></div></div>;
  }

  if (!user || user.role !== "ADMIN") {
    return (
      <div className="container mx-auto px-4 py-16">
        <Card className="mx-auto max-w-md">
          <CardContent className="py-8 text-center">
            <ShieldAlert className="mx-auto h-10 w-10 text-muted-foreground" />
            <h2 className="mt-3 text-lg font-bold">{ar ? "لوحة المشرف" : "Admin dashboard"}</h2>
            <p className="mt-1 text-sm text-muted-foreground">
              {ar
                ? "سجّل الدخول بحساب المشرف التجريبي (admin@example.com) لعرض هذه اللوحة."
                : "Sign in with the demo admin account (admin@example.com) to view this dashboard."}
            </p>
          </CardContent>
        </Card>
      </div>
    );
  }

  const unassigned = matters.filter((m) => !m.lawyer);
  const assigned = matters.filter((m) => m.lawyer);
  const totalPages = Math.max(1, Math.ceil(total / perPage));

  return (
    <div className="container mx-auto px-4 py-8 lg:py-12">
      <div className="mx-auto max-w-5xl">
        <div className="mb-6 flex flex-wrap items-center justify-between gap-4">
          <div>
            <Badge variant="secondary" className="mb-2 gap-1">
              <Users className="h-3 w-3" />
              {ar ? "لوحة المشرف" : "Admin dashboard"}
            </Badge>
            <h1 className="text-2xl font-bold sm:text-3xl">
              {ar ? "إسناد المحامين للقضايا" : "Assign lawyers to matters"}
            </h1>
            <p className="mt-1 text-sm text-muted-foreground">
              {ar
                ? "راجع القضايا الجديدة وأسند لكل منها محامياً موثقاً."
                : "Review new matters and assign each a verified lawyer."}
            </p>
          </div>
          <Button variant="outline" size="sm" onClick={load} disabled={loading} className="gap-2">
            <RefreshCw className={`h-3.5 w-3.5 ${loading ? "animate-spin" : ""}`} />
            {ar ? "تحديث" : "Refresh"}
          </Button>
        </div>

        {/* Filters */}
        <Card className="mb-6">
          <CardContent className="flex flex-wrap items-end gap-3 py-4">
            <div className="space-y-1.5">
              <Label className="text-xs text-muted-foreground">{ar ? "بحث" : "Search"}</Label>
              <input
                type="search"
                value={search}
                onChange={(e) => { setSearch(e.target.value); setPage(1); }}
                placeholder={ar ? "عنوان، موكل، هاتف…" : "Title, client, phone…"}
                className="h-9 w-56 rounded-md border border-input bg-background px-3 text-sm"
              />
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs text-muted-foreground">{ar ? "الحالة" : "Status"}</Label>
              <Select value={statusFilter} onValueChange={(v) => { setStatusFilter(v); setPage(1); }}>
                <SelectTrigger className="w-48"><SelectValue /></SelectTrigger>
                <SelectContent className="max-h-72">
                  <SelectItem value="all">{ar ? "كل الحالات" : "All statuses"}</SelectItem>
                  {Object.keys(STATUS_LABEL).map((s) => (
                    <SelectItem key={s} value={s}>{STATUS_LABEL[s][ar ? "ar" : "en"]}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs text-muted-foreground">{ar ? "الإسناد" : "Assignment"}</Label>
              <Select value={assignedFilter} onValueChange={(v) => { setAssignedFilter(v); setPage(1); }}>
                <SelectTrigger className="w-40"><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">{ar ? "الكل" : "All"}</SelectItem>
                  <SelectItem value="unassigned">{ar ? "غير مسندة" : "Unassigned"}</SelectItem>
                  <SelectItem value="assigned">{ar ? "مسندة" : "Assigned"}</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="flex items-center gap-2 pb-2">
              <Button
                variant={needsAssignment ? "default" : "outline"}
                size="sm"
                onClick={() => setNeedsAssignment((v) => !v)}
              >
                <Gavel className="h-3.5 w-3.5" />
                {ar ? "تحتاج إسناداً" : "Needs assignment"}
              </Button>
            </div>
            <Button variant="ghost" size="sm" onClick={() => { setStatusFilter("all"); setAssignedFilter("all"); setNeedsAssignment(false); setSearch(""); setPage(1); }} className="gap-1">
              <ArrowDownUp className="h-3.5 w-3.5" />
              {ar ? "مسح" : "Clear"}
            </Button>
          </CardContent>
        </Card>

        {/* Stats */}
        <div className="mb-6 grid gap-3 sm:grid-cols-3">
          <Card><CardContent className="py-4">
            <p className="text-xs text-muted-foreground">{ar ? "بانتظار الإسناد" : "Awaiting assignment"}</p>
            <p className="mt-1 text-2xl font-bold">{unassigned.length}</p>
          </CardContent></Card>
          <Card><CardContent className="py-4">
            <p className="text-xs text-muted-foreground">{ar ? "تم الإسناد" : "Assigned"}</p>
            <p className="mt-1 text-2xl font-bold">{assigned.length}</p>
          </CardContent></Card>
          <Card><CardContent className="py-4">
            <p className="text-xs text-muted-foreground">{ar ? "محامون متاحون" : "Available lawyers"}</p>
            <p className="mt-1 text-2xl font-bold">{lawyers.length}</p>
          </CardContent></Card>
        </div>

        {assignSuccess && <Alert><AlertDescription className="text-emerald-700"><CheckCircle2 className="inline h-3.5 w-3.5 me-1" />{assignSuccess}</AlertDescription></Alert>}
        {statusMsg && <Alert><AlertDescription className="text-emerald-700"><CheckCircle2 className="inline h-3.5 w-3.5 me-1" />{statusMsg}</AlertDescription></Alert>}
        {assignError && <Alert variant="destructive"><AlertDescription>{assignError}</AlertDescription></Alert>}

        {loading ? (
          <div className="flex justify-center py-16"><Loader2 className="h-8 w-8 animate-spin text-muted-foreground" /></div>
        ) : (
          <div className="space-y-6">
            {/* Unassigned */}
            <section>
              <h2 className="mb-3 text-lg font-bold">
                {ar ? "قضايا بانتظار الإسناد" : "Awaiting assignment"}
                <Badge variant="secondary" className="ms-2">{unassigned.length}</Badge>
              </h2>
              {unassigned.length === 0 ? (
                <Card><CardContent className="py-8 text-center text-sm text-muted-foreground">
                  {ar ? "لا قضايا بانتظار الإسناد." : "No matters awaiting assignment."}
                </CardContent></Card>
              ) : (
                <div className="space-y-3">
                  {unassigned.map((m) => (
                    <UnassignedMatterCard
                      key={m.id}
                      matter={m}
                      lawyers={lawyers}
                      ar={ar}
                      onAssign={assignLawyer}
                      assigning={assigning === m.id}
                    />
                  ))}
                </div>
              )}
            </section>

            {/* Assigned */}
            {assigned.length > 0 && (
              <section>
                <h2 className="mb-3 text-lg font-bold">
                  {ar ? "قضايا تم إسنادها" : "Assigned matters"}
                  <Badge variant="secondary" className="ms-2">{assigned.length}</Badge>
                </h2>
                <div className="space-y-3">
                  {assigned.map((m) => (
                    <Card key={m.id}>
                      <CardContent className="pt-6">
                        <div className="flex flex-wrap items-start justify-between gap-3">
                          <div className="min-w-0 flex-1">
                            <div className="mb-1 flex flex-wrap items-center gap-2">
                              <Link href={`/matters/${m.id}`} className="text-base font-bold hover:underline">
                                {m.title}
                              </Link>
                              <Badge>{STATUS_LABEL[m.status]?.[ar ? "ar" : "en"] ?? m.status}</Badge>
                              <Badge variant={REMOTE_TONES[m.remoteEligibility] ?? "secondary"} className="gap-1">
                                <Globe className="h-3 w-3" />
                                {remoteLabel(m.remoteEligibility, ar)}
                              </Badge>
                            </div>
                            <div className="flex flex-wrap items-center gap-3 text-xs text-muted-foreground">
                              {m.client && <span>· {ar ? "الموكل" : "Client"}: {m.client.name} ({m.client.currentCountry ?? "—"})</span>}
                              <span className="flex items-center gap-1"><Gavel className="h-3 w-3" /> {m.lawyer?.user.name}</span>
                              <span className="flex items-center gap-1"><FileText className="h-3 w-3" /> {m._count.documents} {ar ? "مستند" : "docs"}</span>
                              <span className="flex items-center gap-1"><Clock className="h-3 w-3" /> {new Date(m.createdAt).toLocaleDateString(ar ? "ar-JO" : "en-US")}</span>
                            </div>
                          </div>
                          <div className="w-full sm:w-72">
                            <div className="flex gap-2">
                              <Select value={m.status} onValueChange={(v) => changeStatus(m.id, v)} disabled={changingStatus === m.id}>
                                <SelectTrigger className="flex-1 text-xs"><SelectValue /></SelectTrigger>
                                <SelectContent className="max-h-72">
                                  {Object.keys(STATUS_LABEL).map((s) => (
                                    <SelectItem key={s} value={s}>{STATUS_LABEL[s][ar ? "ar" : "en"]}</SelectItem>
                                  ))}
                                </SelectContent>
                              </Select>
                              <Link href={`/admin/matters/${m.id}`}>
                                <Button variant="outline" size="sm" className="gap-1">
                                  {changingStatus === m.id ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Eye className="h-3.5 w-3.5" />}
                                  {ar ? "عرض" : "View"}
                                </Button>
                              </Link>
                            </div>
                            <p className="mt-1 text-[10px] text-muted-foreground">{ar ? "غيّر الحالة من القائمة" : "Change status from the list"}</p>
                          </div>
                        </div>
                      </CardContent>
                    </Card>
                  ))}
                </div>
              </section>
            )}
          </div>
        )}

        {!loading && totalPages > 1 && (
          <div className="mt-6 flex flex-wrap items-center justify-between gap-3">
            <p className="text-xs text-muted-foreground">
              {ar
                ? `${total} ${ar ? "قضية" : "matters"} · صفحة ${page} / ${totalPages}`
                : `${total} matters · Page ${page} of ${totalPages}`}
            </p>
            <div className="flex gap-2">
              <Button variant="outline" size="sm" disabled={page <= 1} onClick={() => setPage((p) => Math.max(1, p - 1))} className="gap-1">
                <ChevronLeft className="h-3.5 w-3.5" />
                {ar ? "السابق" : "Previous"}
              </Button>
              <Button variant="outline" size="sm" disabled={page >= totalPages} onClick={() => setPage((p) => p + 1)} className="gap-1">
                {ar ? "التالي" : "Next"}
                <ChevronRight className="h-3.5 w-3.5" />
              </Button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

function UnassignedMatterCard({
  matter, lawyers, ar, onAssign, assigning,
}: {
  matter: Matter; lawyers: Lawyer[]; ar: boolean; onAssign: (matterId: string, lawyerId: string) => void; assigning: boolean;
}) {
  const [selectedLawyer, setSelectedLawyer] = useState<string>("");
  const status = STATUS_LABEL[matter.status] ?? { ar: matter.status, en: matter.status };
  // Score lawyers by practice-area overlap with the matter's legal service
  const sortedLawyers = [...lawyers].sort((a, b) => {
    const aMatch = matter.legalService
      ? a.practiceAreas.some((pa) => matter.legalService?.slug.startsWith(pa.slug) || pa.slug.startsWith(matter.legalService?.slug ?? ""))
      : false;
    const bMatch = matter.legalService
      ? b.practiceAreas.some((pa) => matter.legalService?.slug.startsWith(pa.slug) || pa.slug.startsWith(matter.legalService?.slug ?? ""))
      : false;
    if (aMatch && !bMatch) return -1;
    if (!aMatch && bMatch) return 1;
    return b.rating - a.rating;
  });

  return (
    <Card>
      <CardContent className="pt-6">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div className="min-w-0 flex-1">
            <div className="mb-1 flex flex-wrap items-center gap-2">
              <Link href={`/matters/${matter.id}`} className="text-base font-bold hover:underline">
                {matter.title}
              </Link>
              <Badge>{ar ? status.ar : status.en}</Badge>
              <Badge variant={REMOTE_TONES[matter.remoteEligibility] ?? "secondary"} className="gap-1">
                <Globe className="h-3 w-3" />
                {remoteLabel(matter.remoteEligibility, ar)}
              </Badge>
            </div>
            <div className="flex flex-wrap items-center gap-3 text-xs text-muted-foreground">
              {matter.legalService && <span>{ar ? matter.legalService.nameAr : matter.legalService.nameEn}</span>}
              {matter.client && <span>· {ar ? "الموكل" : "Client"}: {matter.client.name}</span>}
              {matter.clientCountry && <span>· {matter.clientCountry}</span>}
              <span className="flex items-center gap-1"><Clock className="h-3 w-3" /> {new Date(matter.createdAt).toLocaleDateString(ar ? "ar-JO" : "en-US")}</span>
              <span>· {matter._count.documents} {ar ? "مستند" : "docs"}</span>
              <span>· {matter._count.tasks} {ar ? "مهمة" : "tasks"}</span>
            </div>
          </div>
          <div className="w-full sm:w-72">
            <div className="mb-2 flex items-center gap-2">
              <select
                value={matter.status}
                disabled
                className="flex-1 rounded-md border border-input bg-muted px-2 py-1.5 text-xs"
                aria-label="Status"
              >
                <option>{ar ? status.ar : status.en}</option>
              </select>
              <Link href={`/admin/matters/${matter.id}`}>
                <Button variant="outline" size="sm" className="gap-1">
                  <Eye className="h-3.5 w-3.5" />
                  {ar ? "عرض" : "View"}
                </Button>
              </Link>
            </div>
            <label className="mb-1 block text-xs font-semibold text-muted-foreground">
              {ar ? "اختر محامياً للإسناد" : "Select a lawyer to assign"}
            </label>
            <div className="flex gap-2">
              <select
                value={selectedLawyer}
                onChange={(e) => setSelectedLawyer(e.target.value)}
                disabled={assigning}
                className="flex-1 rounded-md border border-input bg-background px-2 py-1.5 text-xs"
              >
                <option value="">{ar ? "— اختر —" : "— Select —"}</option>
                {sortedLawyers.map((l) => {
                  const matched = matter.legalService && l.practiceAreas.some((pa) =>
                    matter.legalService?.slug.startsWith(pa.slug) || pa.slug.startsWith(matter.legalService?.slug ?? "")
                  );
                  return (
                    <option key={l.id} value={l.id}>
                      {l.name} · ⭐{l.rating} ({l.activeMattersCount} {ar ? "قضية" : "active"}){matched ? " ✓" : ""}
                    </option>
                  );
                })}
              </select>
              <Button
                size="sm"
                disabled={!selectedLawyer || assigning}
                onClick={() => onAssign(matter.id, selectedLawyer)}
                className="gap-1"
              >
                {assigning ? <Loader2 className="h-3 w-3 animate-spin" /> : <Gavel className="h-3 w-3" />}
                {ar ? "إسناد" : "Assign"}
              </Button>
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

function remoteLabel(re: string, ar: boolean): string {
  if (re === "fully_remote") return ar ? "عن بُعد" : "Remote";
  if (re === "partially_remote") return ar ? "جزئي" : "Partial";
  if (re === "in_person_required") return ar ? "حضور" : "In-person";
  return ar ? "غير محدد" : "Unknown";
}
