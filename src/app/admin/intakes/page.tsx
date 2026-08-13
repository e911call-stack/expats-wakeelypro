"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { useLocale } from "@/lib/locale-provider";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Loader2, Search, FileText, Paperclip, RefreshCw, Save } from "lucide-react";

type Intake = {
  id: string; status: "in_progress" | "completed" | "abandoned"; language: "ar" | "en"; rawText: string;
  finalSummary: string | null; confidence: number; createdAt: string; updatedAt: string;
  user: { id: string; name: string; phone: string; email: string | null; currentCountry: string | null; currentCity: string | null };
  matter: { id: string; status: string } | null;
  structured: Record<string, unknown>;
  supportingDocuments: { fileName: string; fileType: string; fileSize: number; hasContent: boolean }[];
};

const STATUS_LABELS = {
  in_progress: { ar: "قيد المراجعة", en: "In review" },
  completed: { ar: "مكتمل", en: "Completed" },
  abandoned: { ar: "متروك", en: "Abandoned" },
};

function formatBytes(bytes: number) {
  if (!bytes) return "0 B";
  if (bytes < 1024 * 1024) return `${Math.round(bytes / 1024)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

export default function AdminIntakesPage() {
  const { locale } = useLocale();
  const ar = locale === "ar";
  const [intakes, setIntakes] = useState<Intake[]>([]);
  const [search, setSearch] = useState("");
  const [status, setStatus] = useState("");
  const [expanded, setExpanded] = useState<string | null>(null);
  const [notes, setNotes] = useState<Record<string, string>>({});
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [total, setTotal] = useState(0);

  const load = useCallback(async () => {
    setLoading(true); setError(null);
    try {
      const params = new URLSearchParams({ perPage: "50" });
      if (search.trim()) params.set("search", search.trim());
      if (status) params.set("status", status);
      const response = await fetch(`/api/admin/intakes?${params}`);
      const data = await response.json();
      if (!response.ok) throw new Error(data.error || "load_failed");
      setIntakes(data.intakes ?? []); setTotal(data.total ?? 0);
    } catch (err) {
      setError(err instanceof Error ? err.message : "load_failed");
    } finally { setLoading(false); }
  }, [search, status]);

  useEffect(() => { void load(); }, [load]);

  const counts = useMemo(() => ({
    all: intakes.length,
    completed: intakes.filter((item) => item.status === "completed").length,
    inProgress: intakes.filter((item) => item.status === "in_progress").length,
    documents: intakes.reduce((sum, item) => sum + item.supportingDocuments.length, 0),
  }), [intakes]);

  async function updateIntake(id: string, nextStatus?: string, note?: string) {
    setSaving(id); setError(null);
    try {
      const response = await fetch(`/api/admin/intakes/${id}`, { method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ ...(nextStatus ? { status: nextStatus } : {}), ...(note !== undefined ? { adminNote: note } : {}) }) });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error || "update_failed");
      await load();
    } catch (err) { setError(err instanceof Error ? err.message : "update_failed"); }
    finally { setSaving(null); }
  }

  return (
    <div className="space-y-6" dir={ar ? "rtl" : "ltr"}>
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div><p className="text-sm font-medium text-primary">{ar ? "إدارة الطلبات" : "Request management"}</p><h1 className="text-3xl font-bold tracking-tight">{ar ? "طلبات الاستشارة الأولية" : "Client intake requests"}</h1><p className="mt-1 text-muted-foreground">{ar ? "راجع الطلبات والبيانات والمستندات المرفقة من مكان واحد." : "Review submitted requests, client details, narratives, and uploaded documents in one place."}</p></div>
        <Button variant="outline" onClick={() => void load()} disabled={loading}><RefreshCw className={`me-2 h-4 w-4 ${loading ? "animate-spin" : ""}`} />{ar ? "تحديث" : "Refresh"}</Button>
      </div>

      <div className="grid gap-3 sm:grid-cols-4"><Card><CardContent className="p-4"><p className="text-xs text-muted-foreground">{ar ? "المعروض" : "Displayed"}</p><p className="mt-1 text-2xl font-bold">{counts.all}</p><p className="text-xs text-muted-foreground">{ar ? `من أصل ${total}` : `of ${total} total`}</p></CardContent></Card><Card><CardContent className="p-4"><p className="text-xs text-muted-foreground">{ar ? "قيد المراجعة" : "In review"}</p><p className="mt-1 text-2xl font-bold">{counts.inProgress}</p></CardContent></Card><Card><CardContent className="p-4"><p className="text-xs text-muted-foreground">{ar ? "مكتمل" : "Completed"}</p><p className="mt-1 text-2xl font-bold">{counts.completed}</p></CardContent></Card><Card><CardContent className="p-4"><p className="text-xs text-muted-foreground">{ar ? "المستندات" : "Documents"}</p><p className="mt-1 text-2xl font-bold">{counts.documents}</p></CardContent></Card></div>

      <Card><CardContent className="flex flex-col gap-3 p-4 sm:flex-row"><div className="relative flex-1"><Search className="pointer-events-none absolute start-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" /><Input className="ps-9" value={search} onChange={(event) => setSearch(event.target.value)} placeholder={ar ? "ابحث بالاسم أو الهاتف أو البريد أو نص الطلب…" : "Search name, phone, email, or request text…"} /></div><select value={status} onChange={(event) => setStatus(event.target.value)} className="h-10 rounded-md border border-input bg-white/90 px-3 text-sm"><option value="">{ar ? "كل الحالات" : "All statuses"}</option><option value="in_progress">{ar ? STATUS_LABELS.in_progress.ar : STATUS_LABELS.in_progress.en}</option><option value="completed">{ar ? STATUS_LABELS.completed.ar : STATUS_LABELS.completed.en}</option><option value="abandoned">{ar ? STATUS_LABELS.abandoned.ar : STATUS_LABELS.abandoned.en}</option></select></CardContent></Card>

      {error && <p className="rounded-md border border-destructive/30 bg-destructive/5 p-3 text-sm text-destructive">{error}</p>}
      {loading ? <div className="flex items-center justify-center py-16 text-muted-foreground"><Loader2 className="me-2 h-5 w-5 animate-spin" />{ar ? "جارٍ التحميل…" : "Loading…"}</div> : intakes.length === 0 ? <Card><CardContent className="py-16 text-center text-muted-foreground">{ar ? "لا توجد طلبات مطابقة." : "No matching intake requests."}</CardContent></Card> : <div className="space-y-4">{intakes.map((intake) => {
        const structured = intake.structured;
        const selected = String(structured.selectedServiceSlug ?? "");
        const note = notes[intake.id] ?? String(structured.adminNote ?? "");
        return <Card key={intake.id} className="overflow-hidden"><CardHeader className="cursor-pointer" onClick={() => setExpanded(expanded === intake.id ? null : intake.id)}><div className="flex flex-wrap items-start justify-between gap-3"><div className="flex items-start gap-3"><div className="rounded-lg bg-primary/10 p-2"><FileText className="h-5 w-5 text-primary" /></div><div><CardTitle className="text-lg">{intake.user.name || (ar ? "عميل بدون اسم" : "Unnamed client")}</CardTitle><p className="mt-1 text-sm text-muted-foreground">{intake.user.phone}{intake.user.email ? ` · ${intake.user.email}` : ""}</p><p className="mt-1 text-xs text-muted-foreground">{new Date(intake.createdAt).toLocaleString(ar ? "ar-JO" : "en-GB")} · {intake.id}</p></div></div><div className="flex items-center gap-2"><Badge variant={intake.status === "completed" ? "default" : intake.status === "abandoned" ? "destructive" : "secondary"}>{ar ? STATUS_LABELS[intake.status].ar : STATUS_LABELS[intake.status].en}</Badge>{intake.supportingDocuments.length > 0 && <Badge variant="outline"><Paperclip className="me-1 h-3 w-3" />{intake.supportingDocuments.length}</Badge>}</div></div></CardHeader>
          {expanded === intake.id && <CardContent className="space-y-5 border-t bg-muted/10 pt-5"><div className="grid gap-4 md:grid-cols-2"><div className="rounded-lg border bg-white/80 p-4"><p className="mb-2 text-xs font-semibold uppercase tracking-wide text-primary">{ar ? "تفاصيل العميل" : "Client details"}</p><dl className="space-y-2 text-sm"><div className="flex justify-between gap-3"><dt className="text-muted-foreground">{ar ? "الدولة" : "Country"}</dt><dd>{String(structured.clientCountry ?? intake.user.currentCountry ?? "—")}</dd></div><div className="flex justify-between gap-3"><dt className="text-muted-foreground">{ar ? "المدينة" : "City"}</dt><dd>{String(structured.clientCity ?? intake.user.currentCity ?? "—")}</dd></div><div className="flex justify-between gap-3"><dt className="text-muted-foreground">{ar ? "الصفة" : "Status"}</dt><dd>{String(structured.clientStatus ?? "—")}</dd></div><div className="flex justify-between gap-3"><dt className="text-muted-foreground">{ar ? "الاستعجال" : "Urgency"}</dt><dd>{String(structured.urgency ?? "—")}</dd></div><div className="flex justify-between gap-3"><dt className="text-muted-foreground">{ar ? "الإجراء" : "Procedure"}</dt><dd className="max-w-[65%] break-words text-end">{selected || "—"}</dd></div></dl></div><div className="rounded-lg border bg-white/80 p-4"><p className="mb-2 text-xs font-semibold uppercase tracking-wide text-primary">{ar ? "الإجراء الإداري" : "Admin action"}</p><div className="space-y-3"><select value={intake.status} onChange={(event) => void updateIntake(intake.id, event.target.value)} disabled={saving === intake.id} className="h-10 w-full rounded-md border border-input bg-white px-3 text-sm"><option value="in_progress">{ar ? STATUS_LABELS.in_progress.ar : STATUS_LABELS.in_progress.en}</option><option value="completed">{ar ? STATUS_LABELS.completed.ar : STATUS_LABELS.completed.en}</option><option value="abandoned">{ar ? STATUS_LABELS.abandoned.ar : STATUS_LABELS.abandoned.en}</option></select><Textarea value={note} onChange={(event) => setNotes((current) => ({ ...current, [intake.id]: event.target.value }))} rows={3} placeholder={ar ? "ملاحظة داخلية…" : "Internal note…"} /><Button onClick={() => void updateIntake(intake.id, undefined, note)} disabled={saving === intake.id}><Save className="me-2 h-4 w-4" />{ar ? "حفظ الملاحظة" : "Save note"}</Button></div></div></div><div className="rounded-lg border bg-white/80 p-4"><p className="mb-2 text-xs font-semibold uppercase tracking-wide text-primary">{ar ? "ما كتبه العميل" : "Client narrative"}</p><p className="whitespace-pre-wrap text-sm leading-7">{intake.rawText}</p></div>{intake.finalSummary && <div className="rounded-lg border bg-white/80 p-4"><p className="mb-2 text-xs font-semibold uppercase tracking-wide text-primary">{ar ? "الملخص" : "Summary"}</p><p className="text-sm">{intake.finalSummary}</p></div>}<div className="rounded-lg border bg-white/80 p-4"><p className="mb-3 text-xs font-semibold uppercase tracking-wide text-primary">{ar ? "المستندات المرفقة" : "Uploaded documents"}</p>{intake.supportingDocuments.length === 0 ? <p className="text-sm text-muted-foreground">{ar ? "لم يرفق العميل مستندات." : "No documents were uploaded."}</p> : <div className="grid gap-2 sm:grid-cols-2">{intake.supportingDocuments.map((file) => <div key={file.fileName} className="flex items-center justify-between gap-3 rounded-md border p-3 text-sm"><div className="flex min-w-0 items-center gap-2"><Paperclip className="h-4 w-4 shrink-0 text-primary" /><span className="truncate">{file.fileName}</span></div><span className="shrink-0 text-xs text-muted-foreground">{formatBytes(file.fileSize)}</span></div>)}</div>}</div></CardContent>}
        </Card>;
      })}</div>}
    </div>
  );
}
