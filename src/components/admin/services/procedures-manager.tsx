"use client";

import { useCallback, useEffect, useState } from "react";
import { useLocale } from "@/lib/locale-provider";
import { useToast } from "@/hooks/use-toast";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
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
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Loader2, Plus, Pencil, Trash2, X } from "lucide-react";
import {
  REMOTE_LABEL,
  linesToSteps,
  stepsToLines,
  type AdminProcedure,
  type RemoteEligibility,
} from "@/lib/admin/services";

interface Props {
  serviceId: string;
}

const EMPTY: {
  slug: string;
  nameAr: string;
  nameEn: string;
  remoteEligibility: RemoteEligibility;
  reasonAr: string;
  reasonEn: string;
  authorityAr: string;
  authorityEn: string;
  duration: string;
  sortOrder: string;
  legalBasisAr: string;
  legalBasisEn: string;
  notesAr: string;
  notesEn: string;
  remoteAr: string;
  remoteEn: string;
  physicalAr: string;
  physicalEn: string;
} = {
  slug: "",
  nameAr: "",
  nameEn: "",
  remoteEligibility: "partially_remote",
  reasonAr: "",
  reasonEn: "",
  authorityAr: "",
  authorityEn: "",
  duration: "30",
  sortOrder: "0",
  legalBasisAr: "",
  legalBasisEn: "",
  notesAr: "",
  notesEn: "",
  remoteAr: "",
  remoteEn: "",
  physicalAr: "",
  physicalEn: "",
};

export function ProceduresManager({ serviceId }: Props) {
  const { locale } = useLocale();
  const ar = locale === "ar";
  const { toast } = useToast();

  const [procedures, setProcedures] = useState<AdminProcedure[]>([]);
  const [loading, setLoading] = useState(true);
  const [editingId, setEditingId] = useState<string | null>(null); // null = closed, "new" = create
  const [form, setForm] = useState(EMPTY);
  const [saving, setSaving] = useState(false);
  const [deleting, setDeleting] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch(`/api/admin/services/${serviceId}/procedures`, { cache: "no-store" });
      const data = await res.json();
      if (res.ok) setProcedures(data.procedures ?? []);
    } finally {
      setLoading(false);
    }
  }, [serviceId]);

  useEffect(() => {
    load();
  }, [load]);

  function openEdit(p: AdminProcedure) {
    const lines = {
      remote: stepsToLines(p.remoteSteps),
      physical: stepsToLines(p.physicalPresenceSteps),
    };
    setForm({
      slug: p.slug,
      nameAr: p.nameAr,
      nameEn: p.nameEn,
      remoteEligibility: p.remoteEligibility,
      reasonAr: p.remoteEligibilityReasonAr,
      reasonEn: p.remoteEligibilityReasonEn,
      authorityAr: p.authorityAr ?? "",
      authorityEn: p.authorityEn ?? "",
      duration: String(p.estimatedDurationDays),
      sortOrder: String(p.sortOrder),
      legalBasisAr: p.legalBasisAr ?? "",
      legalBasisEn: p.legalBasisEn ?? "",
      notesAr: p.notesAr ?? "",
      notesEn: p.notesEn ?? "",
      remoteAr: lines.remote.ar,
      remoteEn: lines.remote.en,
      physicalAr: lines.physical.ar,
      physicalEn: lines.physical.en,
    });
    setEditingId(p.id);
  }

  function openNew() {
    setForm(EMPTY);
    setEditingId("new");
  }

  function closeEditor() {
    setEditingId(null);
  }

  async function handleSave() {
    setSaving(true);
    const payload = {
      slug: form.slug.trim(),
      nameAr: form.nameAr.trim(),
      nameEn: form.nameEn.trim(),
      remoteEligibility: form.remoteEligibility,
      remoteEligibilityReasonAr: form.reasonAr.trim(),
      remoteEligibilityReasonEn: form.reasonEn.trim(),
      authorityAr: form.authorityAr.trim() || null,
      authorityEn: form.authorityEn.trim() || null,
      estimatedDurationDays: Number(form.duration) || 0,
      sortOrder: Number(form.sortOrder) || 0,
      legalBasisAr: form.legalBasisAr.trim() || null,
      legalBasisEn: form.legalBasisEn.trim() || null,
      notesAr: form.notesAr.trim() || null,
      notesEn: form.notesEn.trim() || null,
      remoteSteps: linesToSteps(form.remoteAr, form.remoteEn),
      physicalPresenceSteps: linesToSteps(form.physicalAr, form.physicalEn),
    };

    try {
      const isEdit = editingId !== "new" && editingId !== null;
      const res = await fetch(
        isEdit
          ? `/api/admin/services/${serviceId}/procedures/${editingId}`
          : `/api/admin/services/${serviceId}/procedures`,
        {
          method: isEdit ? "PATCH" : "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(payload),
        },
      );
      const data = await res.json();
      if (!res.ok) {
        toast({
          title: ar ? "فشل الحفظ" : "Save failed",
          description: data.error === "slug_taken" ? (ar ? "الـ slug مستخدم مسبقاً" : "Slug already in use") : (data.error || "error"),
          variant: "destructive",
        });
        return;
      }
      toast({ title: ar ? "تم الحفظ" : "Saved" });
      setEditingId(null);
      await load();
    } catch {
      toast({ title: ar ? "خطأ في الشبكة" : "Network error", variant: "destructive" });
    } finally {
      setSaving(false);
    }
  }

  async function deleteProcedure(id: string) {
    setDeleting(id);
    try {
      const res = await fetch(`/api/admin/services/${serviceId}/procedures/${id}`, { method: "DELETE" });
      if (!res.ok) throw new Error("failed");
      toast({ title: ar ? "تم الحذف" : "Deleted" });
      if (editingId === id) setEditingId(null);
      await load();
    } catch {
      toast({ title: ar ? "فشل الحذف" : "Delete failed", variant: "destructive" });
    } finally {
      setDeleting(null);
    }
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h3 className="text-lg font-semibold">{ar ? "الإجراءات" : "Procedures"}</h3>
        {editingId === null && (
          <Button size="sm" onClick={openNew} className="gap-2">
            <Plus className="h-3.5 w-3.5" />
            {ar ? "إضافة إجراء" : "Add procedure"}
          </Button>
        )}
      </div>

      {loading ? (
        <div className="flex justify-center py-10">
          <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
        </div>
      ) : procedures.length === 0 && editingId === null ? (
        <Card>
          <CardContent className="py-8 text-center text-sm text-muted-foreground">
            {ar ? "لا توجد إجراءات لهذه الخدمة." : "No procedures for this service yet."}
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-3">
          {procedures.map((p) => (
            <Card key={p.id}>
              <CardContent className="flex flex-wrap items-center justify-between gap-3 py-4">
                <div className="min-w-0">
                  <p className="font-medium">{p.nameEn}</p>
                  <p className="text-xs text-muted-foreground" dir="rtl">{p.nameAr}</p>
                  <div className="mt-1 flex flex-wrap gap-1.5">
                    <Badge variant="outline" className="text-[10px]">
                      {ar ? REMOTE_LABEL[p.remoteEligibility]?.ar : REMOTE_LABEL[p.remoteEligibility]?.en}
                    </Badge>
                    <Badge variant="secondary" className="text-[10px]">
                      {p.remoteSteps.length} remote · {p.physicalPresenceSteps.length} physical
                    </Badge>
                  </div>
                </div>
                <div className="flex gap-1">
                  <Button variant="ghost" size="sm" onClick={() => openEdit(p)}>
                    <Pencil className="h-3.5 w-3.5" />
                  </Button>
                  <AlertDialog>
                    <AlertDialogTrigger asChild>
                      <Button variant="ghost" size="sm" disabled={deleting === p.id}>
                        <Trash2 className="h-3.5 w-3.5 text-destructive" />
                      </Button>
                    </AlertDialogTrigger>
                    <AlertDialogContent>
                      <AlertDialogHeader>
                        <AlertDialogTitle>{ar ? "حذف الإجراء؟" : "Delete procedure?"}</AlertDialogTitle>
                        <AlertDialogDescription>
                          {ar ? "سيتم حذف هذا الإجراء نهائياً." : "This procedure will be permanently deleted."}
                        </AlertDialogDescription>
                      </AlertDialogHeader>
                      <AlertDialogFooter>
                        <AlertDialogCancel>{ar ? "إلغاء" : "Cancel"}</AlertDialogCancel>
                        <AlertDialogAction
                          className="bg-destructive text-white hover:bg-destructive/90"
                          onClick={() => deleteProcedure(p.id)}
                        >
                          {ar ? "حذف" : "Delete"}
                        </AlertDialogAction>
                      </AlertDialogFooter>
                    </AlertDialogContent>
                  </AlertDialog>
                </div>
              </CardContent>
            </Card>
          ))}

          {editingId !== null && (
            <Card>
              <CardHeader className="flex flex-row items-center justify-between">
                <CardTitle className="text-base">
                  {editingId === "new" ? (ar ? "إجراء جديد" : "New procedure") : (ar ? "تعديل الإجراء" : "Edit procedure")}
                </CardTitle>
                <Button variant="ghost" size="sm" onClick={closeEditor}>
                  <X className="h-4 w-4" />
                </Button>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid gap-3 sm:grid-cols-2">
                  <div className="space-y-1.5">
                    <Label>Slug *</Label>
                    <Input value={form.slug} onChange={(e) => setForm({ ...form, slug: e.target.value })} dir="ltr" placeholder="poa-remote-steps" />
                  </div>
                  <div className="space-y-1.5">
                    <Label>{ar ? "المدة (أيام)" : "Duration (days)"}</Label>
                    <Input type="number" value={form.duration} onChange={(e) => setForm({ ...form, duration: e.target.value })} />
                  </div>
                  <div className="space-y-1.5">
                    <Label>{ar ? "الاسم (عربي)" : "Name (AR)"} *</Label>
                    <Input value={form.nameAr} onChange={(e) => setForm({ ...form, nameAr: e.target.value })} dir="rtl" />
                  </div>
                  <div className="space-y-1.5">
                    <Label>{ar ? "الاسم (إنجليزي)" : "Name (EN)"} *</Label>
                    <Input value={form.nameEn} onChange={(e) => setForm({ ...form, nameEn: e.target.value })} dir="ltr" />
                  </div>
                  <div className="space-y-1.5">
                    <Label>{ar ? "الأهلية عن بُعد" : "Remote eligibility"}</Label>
                    <Select
                      value={form.remoteEligibility}
                      onValueChange={(v) => setForm({ ...form, remoteEligibility: v as RemoteEligibility })}
                    >
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        {(Object.keys(REMOTE_LABEL) as RemoteEligibility[]).map((r) => (
                          <SelectItem key={r} value={r}>
                            {ar ? REMOTE_LABEL[r].ar : REMOTE_LABEL[r].en}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-1.5">
                    <Label>{ar ? "الترتيب" : "Sort order"}</Label>
                    <Input type="number" value={form.sortOrder} onChange={(e) => setForm({ ...form, sortOrder: e.target.value })} />
                  </div>
                  <div className="space-y-1.5">
                    <Label>{ar ? "سبب الأهلية (عربي)" : "Reason (AR)"} *</Label>
                    <Textarea value={form.reasonAr} onChange={(e) => setForm({ ...form, reasonAr: e.target.value })} dir="rtl" rows={2} />
                  </div>
                  <div className="space-y-1.5">
                    <Label>{ar ? "سبب الأهلية (إنجليزي)" : "Reason (EN)"} *</Label>
                    <Textarea value={form.reasonEn} onChange={(e) => setForm({ ...form, reasonEn: e.target.value })} dir="ltr" rows={2} />
                  </div>
                  <div className="space-y-1.5">
                    <Label>{ar ? "الجهة (عربي)" : "Authority (AR)"}</Label>
                    <Input value={form.authorityAr} onChange={(e) => setForm({ ...form, authorityAr: e.target.value })} dir="rtl" />
                  </div>
                  <div className="space-y-1.5">
                    <Label>{ar ? "الجهة (إنجليزي)" : "Authority (EN)"}</Label>
                    <Input value={form.authorityEn} onChange={(e) => setForm({ ...form, authorityEn: e.target.value })} dir="ltr" />
                  </div>
                  <div className="space-y-1.5">
                    <Label>{ar ? "الأساس القانوني (عربي)" : "Legal basis (AR)"}</Label>
                    <Textarea value={form.legalBasisAr} onChange={(e) => setForm({ ...form, legalBasisAr: e.target.value })} dir="rtl" rows={2} />
                  </div>
                  <div className="space-y-1.5">
                    <Label>{ar ? "الأساس القانوني (إنجليزي)" : "Legal basis (EN)"}</Label>
                    <Textarea value={form.legalBasisEn} onChange={(e) => setForm({ ...form, legalBasisEn: e.target.value })} dir="ltr" rows={2} />
                  </div>
                </div>

                <div className="grid gap-3 sm:grid-cols-2">
                  <div className="space-y-1.5">
                    <Label>{ar ? "خطوات عن بُعد (عربي) — سطر لكل خطوة" : "Remote steps (AR) — one per line"}</Label>
                    <Textarea value={form.remoteAr} onChange={(e) => setForm({ ...form, remoteAr: e.target.value })} dir="rtl" rows={4} />
                  </div>
                  <div className="space-y-1.5">
                    <Label>{ar ? "خطوات عن بُعد (إنجليزي)" : "Remote steps (EN)"}</Label>
                    <Textarea value={form.remoteEn} onChange={(e) => setForm({ ...form, remoteEn: e.target.value })} dir="ltr" rows={4} />
                  </div>
                  <div className="space-y-1.5">
                    <Label>{ar ? "خطوات الحضور الفعلي (عربي)" : "Physical steps (AR)"}</Label>
                    <Textarea value={form.physicalAr} onChange={(e) => setForm({ ...form, physicalAr: e.target.value })} dir="rtl" rows={4} />
                  </div>
                  <div className="space-y-1.5">
                    <Label>{ar ? "خطوات الحضور الفعلي (إنجليزي)" : "Physical steps (EN)"}</Label>
                    <Textarea value={form.physicalEn} onChange={(e) => setForm({ ...form, physicalEn: e.target.value })} dir="ltr" rows={4} />
                  </div>
                </div>

                <div className="flex gap-2">
                  <Button onClick={handleSave} disabled={saving} className="gap-2">
                    {saving && <Loader2 className="h-4 w-4 animate-spin" />}
                    {ar ? "حفظ الإجراء" : "Save procedure"}
                  </Button>
                  <Button variant="outline" onClick={closeEditor}>
                    {ar ? "إلغاء" : "Cancel"}
                  </Button>
                </div>
              </CardContent>
            </Card>
          )}
        </div>
      )}
    </div>
  );
}
