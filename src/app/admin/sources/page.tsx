"use client";

import { useCallback, useEffect, useState } from "react";
import { useLocale } from "@/lib/locale-provider";
import { useToast } from "@/hooks/use-toast";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import { Card, CardContent } from "@/components/ui/card";
import { Loader2, Plus, RefreshCw, Search, Pencil, Trash2, ExternalLink, Power } from "lucide-react";
import { AUTHORITY_TYPE_LABEL, type AdminSource } from "@/lib/admin/ops";

const AUTHORITY_TYPES = Object.keys(AUTHORITY_TYPE_LABEL);

interface FormState {
  slug: string;
  nameAr: string;
  nameEn: string;
  url: string;
  authorityType: string;
  country: string;
  region: string;
  notesAr: string;
  notesEn: string;
  isActive: boolean;
}

const emptyForm: FormState = {
  slug: "",
  nameAr: "",
  nameEn: "",
  url: "",
  authorityType: "ministry",
  country: "Jordan",
  region: "",
  notesAr: "",
  notesEn: "",
  isActive: true,
};

export default function AdminSourcesPage() {
  const { locale } = useLocale();
  const ar = locale === "ar";
  const { toast } = useToast();

  const [sources, setSources] = useState<AdminSource[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [showInactive, setShowInactive] = useState(true);
  const [saving, setSaving] = useState(false);
  const [deleting, setDeleting] = useState<string | null>(null);
  const [toggling, setToggling] = useState<string | null>(null);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editId, setEditId] = useState<string | null>(null);
  const [form, setForm] = useState<FormState>(emptyForm);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams();
      if (search.trim()) params.set("search", search.trim());
      if (showInactive) params.set("all", "true");
      const res = await fetch(`/api/admin/sources?${params.toString()}`, { cache: "no-store" });
      const data = await res.json();
      if (res.ok) setSources(data.sources ?? []);
      else toast({ title: ar ? "فشل تحميل المصادر" : "Failed to load sources", variant: "destructive" });
    } finally {
      setLoading(false);
    }
  }, [search, showInactive, ar, toast]);

  useEffect(() => {
    load();
  }, [load]);

  function openCreate() {
    setEditId(null);
    setForm(emptyForm);
    setDialogOpen(true);
  }

  function openEdit(s: AdminSource) {
    setEditId(s.id);
    setForm({
      slug: s.slug,
      nameAr: s.nameAr,
      nameEn: s.nameEn,
      url: s.url ?? "",
      authorityType: s.authorityType,
      country: s.country,
      region: s.region ?? "",
      notesAr: s.notesAr ?? "",
      notesEn: s.notesEn ?? "",
      isActive: s.isActive,
    });
    setDialogOpen(true);
  }

  async function save() {
    setSaving(true);
    try {
      const body = {
        slug: form.slug.trim(),
        nameAr: form.nameAr.trim(),
        nameEn: form.nameEn.trim(),
        url: form.url.trim() || null,
        authorityType: form.authorityType,
        country: form.country.trim() || "Jordan",
        region: form.region.trim() || null,
        notesAr: form.notesAr.trim() || null,
        notesEn: form.notesEn.trim() || null,
        isActive: form.isActive,
      };
      const res = await fetch(editId ? `/api/admin/sources/${editId}` : "/api/admin/sources", {
        method: editId ? "PATCH" : "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });
      const data = await res.json();
      if (!res.ok) {
        const msg = data.error === "slug_taken" ? (ar ? "المعرّف مستخدم مسبقاً" : "Slug already in use") : (data.message || "failed");
        throw new Error(msg);
      }
      toast({ title: ar ? "تم الحفظ" : "Saved" });
      setDialogOpen(false);
      await load();
    } catch (e) {
      toast({ title: ar ? "فشل الحفظ" : "Save failed", description: e instanceof Error ? e.message : undefined, variant: "destructive" });
    } finally {
      setSaving(false);
    }
  }

  async function toggleActive(s: AdminSource) {
    setToggling(s.id);
    try {
      const res = await fetch(`/api/admin/sources/${s.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ isActive: !s.isActive }),
      });
      if (!res.ok) throw new Error("failed");
      toast({ title: ar ? (s.isActive ? "تم التعطيل" : "تم التفعيل") : s.isActive ? "Deactivated" : "Activated" });
      await load();
    } catch {
      toast({ title: ar ? "فشل التحديث" : "Update failed", variant: "destructive" });
    } finally {
      setToggling(null);
    }
  }

  async function remove(s: AdminSource) {
    setDeleting(s.id);
    try {
      const res = await fetch(`/api/admin/sources/${s.id}`, { method: "DELETE" });
      if (!res.ok) throw new Error("failed");
      toast({ title: ar ? "تم الحذف (تعطيل)" : "Deleted (deactivated)" });
      await load();
    } catch {
      toast({ title: ar ? "فشل الحذف" : "Delete failed", variant: "destructive" });
    } finally {
      setDeleting(null);
    }
  }

  const active = sources.filter((s) => s.isActive).length;

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div>
          <h1 className="text-2xl font-bold">{ar ? "المصادر الرسمية" : "Official Sources"}</h1>
          <p className="text-sm text-muted-foreground" dir="rtl">
            {ar ? "الجهات الحكومية المرتبطة بالخدمات" : "Government authorities linked to services"}
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Button variant="outline" size="sm" onClick={load} disabled={loading} className="gap-2">
            <RefreshCw className={`h-3.5 w-3.5 ${loading ? "animate-spin" : ""}`} />
            {ar ? "تحديث" : "Refresh"}
          </Button>
          <Button size="sm" onClick={openCreate} className="gap-2">
            <Plus className="h-3.5 w-3.5" />
            {ar ? "مصدر جديد" : "New source"}
          </Button>
        </div>
      </div>

      <Card>
        <CardContent className="flex flex-wrap items-center gap-2 pt-4">
          <div className="relative min-w-[200px] flex-1">
            <Search className="absolute start-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <Input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && load()}
              placeholder={ar ? "بحث بالاسم / المعرّف" : "Search name / slug"}
              className="ps-9"
            />
          </div>
          <div className="flex items-center gap-2">
            <Switch id="show-inactive" checked={showInactive} onCheckedChange={setShowInactive} />
            <label htmlFor="show-inactive" className="text-sm">{ar ? "عرض المعطلة" : "Show inactive"}</label>
          </div>
          <Button variant="outline" size="sm" onClick={load}>{ar ? "تطبيق" : "Apply"}</Button>
          <Badge variant="secondary">{active} {ar ? "نشطة" : "active"}</Badge>
        </CardContent>
      </Card>

      {loading ? (
        <div className="flex justify-center py-16"><Loader2 className="h-8 w-8 animate-spin text-muted-foreground" /></div>
      ) : sources.length === 0 ? (
        <Card><CardContent className="py-12 text-center text-sm text-muted-foreground">
          {ar ? "لا توجد مصادر." : "No sources yet."}
        </CardContent></Card>
      ) : (
        <Card>
          <CardContent className="overflow-x-auto pt-4">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>{ar ? "الجهة" : "Authority"}</TableHead>
                  <TableHead>{ar ? "النوع" : "Type"}</TableHead>
                  <TableHead>{ar ? "الدولة / المنطقة" : "Country / Region"}</TableHead>
                  <TableHead>{ar ? "الحالة" : "Status"}</TableHead>
                  <TableHead className="text-end">{ar ? "إجراءات" : "Actions"}</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {sources.map((s) => (
                  <TableRow key={s.id} className={s.isActive ? "" : "opacity-60"}>
                    <TableCell>
                      <p className="font-medium">{ar ? s.nameAr : s.nameEn}</p>
                      <p className="text-xs text-muted-foreground" dir="ltr">{s.slug}</p>
                      {s.notesAr && ar && <p className="max-w-60 truncate text-xs text-muted-foreground">{s.notesAr}</p>}
                      {s.notesEn && !ar && <p className="max-w-60 truncate text-xs text-muted-foreground">{s.notesEn}</p>}
                    </TableCell>
                    <TableCell className="text-xs">{ar ? AUTHORITY_TYPE_LABEL[s.authorityType]?.ar ?? s.authorityType : AUTHORITY_TYPE_LABEL[s.authorityType]?.en ?? s.authorityType}</TableCell>
                    <TableCell className="text-xs">{s.country}{s.region ? ` / ${s.region}` : ""}</TableCell>
                    <TableCell>
                      <Switch
                        checked={s.isActive}
                        disabled={toggling === s.id}
                        onCheckedChange={() => toggleActive(s)}
                        aria-label="Active"
                      />
                    </TableCell>
                    <TableCell className="text-end">
                      <div className="flex items-center justify-end gap-1">
                        {s.url && (
                          <a href={s.url} target="_blank" rel="noreferrer" aria-label="Open">
                            <Button variant="ghost" size="sm"><ExternalLink className="h-3.5 w-3.5" /></Button>
                          </a>
                        )}
                        <Button variant="ghost" size="sm" onClick={() => openEdit(s)} aria-label="Edit">
                          <Pencil className="h-3.5 w-3.5" />
                        </Button>
                        <AlertDialog>
                          <AlertDialogTrigger asChild>
                            <Button variant="ghost" size="sm" aria-label="Delete">
                              <Trash2 className="h-3.5 w-3.5 text-destructive" />
                            </Button>
                          </AlertDialogTrigger>
                          <AlertDialogContent>
                            <AlertDialogHeader>
                              <AlertDialogTitle>{ar ? "حذف المصدر؟" : "Delete source?"}</AlertDialogTitle>
                              <AlertDialogDescription>
                                {ar ? `سيتم تعطيل "${ar ? s.nameAr : s.nameEn}" وستبقى في السجلات.` : `"${s.nameEn}" will be deactivated but kept on record.`}
                              </AlertDialogDescription>
                            </AlertDialogHeader>
                            <AlertDialogFooter>
                              <AlertDialogCancel>{ar ? "إلغاء" : "Cancel"}</AlertDialogCancel>
                              <AlertDialogAction onClick={() => remove(s)} disabled={deleting === s.id} className="gap-2 bg-destructive text-white hover:bg-destructive/90">
                                {deleting === s.id && <Loader2 className="h-4 w-4 animate-spin" />}
                                {ar ? "حذف" : "Delete"}
                              </AlertDialogAction>
                            </AlertDialogFooter>
                          </AlertDialogContent>
                        </AlertDialog>
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      )}

      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="max-h-[85vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>{editId ? (ar ? "تعديل المصدر" : "Edit source") : (ar ? "مصدر جديد" : "New source")}</DialogTitle>
            <DialogDescription>
              {ar ? "الجهات الرسمية التي تُستخدم لتوثيق متطلبات الخدمات." : "Official authorities used to document service requirements."}
            </DialogDescription>
          </DialogHeader>
          <div className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-2">
              <Label>{ar ? "المعرّف (slug)" : "Slug"}</Label>
              <Input value={form.slug} onChange={(e) => setForm({ ...form, slug: e.target.value })} placeholder="civil-status" dir="ltr" />
            </div>
            <div className="space-y-2">
              <Label>{ar ? "النوع" : "Type"}</Label>
              <Select value={form.authorityType} onValueChange={(v) => setForm({ ...form, authorityType: v })}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  {AUTHORITY_TYPES.map((t) => (
                    <SelectItem key={t} value={t}>{ar ? AUTHORITY_TYPE_LABEL[t].ar : AUTHORITY_TYPE_LABEL[t].en}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>{ar ? "الاسم (عربي)" : "Name (Arabic)"}</Label>
              <Input value={form.nameAr} onChange={(e) => setForm({ ...form, nameAr: e.target.value })} placeholder="دائرة الأحوال المدنية" />
            </div>
            <div className="space-y-2">
              <Label>{ar ? "الاسم (إنجليزي)" : "Name (English)"}</Label>
              <Input value={form.nameEn} onChange={(e) => setForm({ ...form, nameEn: e.target.value })} placeholder="Civil Status Dept" dir="ltr" />
            </div>
            <div className="space-y-2 sm:col-span-2">
              <Label>URL</Label>
              <Input value={form.url} onChange={(e) => setForm({ ...form, url: e.target.value })} placeholder="https://example.gov.jo" dir="ltr" />
            </div>
            <div className="space-y-2">
              <Label>{ar ? "الدولة" : "Country"}</Label>
              <Input value={form.country} onChange={(e) => setForm({ ...form, country: e.target.value })} placeholder="Jordan" dir="ltr" />
            </div>
            <div className="space-y-2">
              <Label>{ar ? "المنطقة" : "Region"}</Label>
              <Input value={form.region} onChange={(e) => setForm({ ...form, region: e.target.value })} placeholder="Amman" />
            </div>
            <div className="space-y-2 sm:col-span-2">
              <Label>{ar ? "ملاحظات (عربي)" : "Notes (Arabic)"}</Label>
              <Textarea value={form.notesAr} onChange={(e) => setForm({ ...form, notesAr: e.target.value })} />
            </div>
            <div className="space-y-2 sm:col-span-2">
              <Label>{ar ? "ملاحظات (إنجليزي)" : "Notes (English)"}</Label>
              <Textarea value={form.notesEn} onChange={(e) => setForm({ ...form, notesEn: e.target.value })} />
            </div>
            <div className="flex items-center gap-2 sm:col-span-2">
              <Switch id="source-active" checked={form.isActive} onCheckedChange={(v) => setForm({ ...form, isActive: v })} />
              <Label htmlFor="source-active" className="flex items-center gap-1"><Power className="h-3.5 w-3.5" />{ar ? "نشطة" : "Active"}</Label>
            </div>
          </div>
          <DialogFooter>
            <Button onClick={save} disabled={saving || !form.slug.trim() || !form.nameAr.trim() || !form.nameEn.trim()} className="gap-2">
              {saving && <Loader2 className="h-4 w-4 animate-spin" />}
              {ar ? "حفظ" : "Save"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
