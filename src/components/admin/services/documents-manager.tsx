"use client";

import { useCallback, useEffect, useState } from "react";
import { useLocale } from "@/lib/locale-provider";
import { useToast } from "@/hooks/use-toast";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
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
import type { AdminDocumentRequirement } from "@/lib/admin/services";

interface Props {
  serviceId: string;
}

interface DocForm {
  slug: string;
  nameAr: string;
  nameEn: string;
  descriptionAr: string;
  descriptionEn: string;
  provider: string;
  stage: string;
  sortOrder: string;
  isRequired: boolean;
  acceptsDigital: boolean;
  requiresOriginal: boolean;
  requiresNotarization: boolean;
  requiresApostille: boolean;
}

const EMPTY: DocForm = {
  slug: "",
  nameAr: "",
  nameEn: "",
  descriptionAr: "",
  descriptionEn: "",
  provider: "client",
  stage: "at_intake",
  sortOrder: "0",
  isRequired: true,
  acceptsDigital: true,
  requiresOriginal: false,
  requiresNotarization: false,
  requiresApostille: false,
};

const STAGES: { value: string; ar: string; en: string }[] = [
  { value: "at_intake", ar: "عند التقديم", en: "At intake" },
  { value: "at_filing", ar: "عند التقديم للجهة", en: "At filing" },
  { value: "at_signing", ar: "عند التوقيع", en: "At signing" },
  { value: "at_notary", ar: "عند الكاتب العدل", en: "At notary" },
  { value: "ongoing", ar: "مستمر", en: "Ongoing" },
];

const PROVIDERS: { value: string; ar: string; en: string }[] = [
  { value: "client", ar: "الموكل", en: "Client" },
  { value: "lawyer", ar: "المحامي", en: "Lawyer" },
  { value: "authority", ar: "الجهة", en: "Authority" },
];

export function DocumentsManager({ serviceId }: Props) {
  const { locale } = useLocale();
  const ar = locale === "ar";
  const { toast } = useToast();

  const [docs, setDocs] = useState<AdminDocumentRequirement[]>([]);
  const [loading, setLoading] = useState(true);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [form, setForm] = useState<DocForm>(EMPTY);
  const [saving, setSaving] = useState(false);
  const [deleting, setDeleting] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch(`/api/admin/services/${serviceId}/documents`, { cache: "no-store" });
      const data = await res.json();
      if (res.ok) setDocs(data.documents ?? []);
    } finally {
      setLoading(false);
    }
  }, [serviceId]);

  useEffect(() => {
    load();
  }, [load]);

  function openEdit(d: AdminDocumentRequirement) {
    setForm({
      slug: d.slug,
      nameAr: d.nameAr,
      nameEn: d.nameEn,
      descriptionAr: d.descriptionAr ?? "",
      descriptionEn: d.descriptionEn ?? "",
      provider: d.provider,
      stage: d.stage,
      sortOrder: String(d.sortOrder),
      isRequired: d.isRequired,
      acceptsDigital: d.acceptsDigital,
      requiresOriginal: d.requiresOriginal,
      requiresNotarization: d.requiresNotarization,
      requiresApostille: d.requiresApostille,
    });
    setEditingId(d.id);
  }

  function openNew() {
    setForm(EMPTY);
    setEditingId("new");
  }

  async function handleSave() {
    setSaving(true);
    const payload = {
      slug: form.slug.trim(),
      nameAr: form.nameAr.trim(),
      nameEn: form.nameEn.trim(),
      descriptionAr: form.descriptionAr.trim() || null,
      descriptionEn: form.descriptionEn.trim() || null,
      provider: form.provider,
      stage: form.stage,
      sortOrder: Number(form.sortOrder) || 0,
      isRequired: form.isRequired,
      acceptsDigital: form.acceptsDigital,
      requiresOriginal: form.requiresOriginal,
      requiresNotarization: form.requiresNotarization,
      requiresApostille: form.requiresApostille,
    };

    try {
      const isEdit = editingId !== "new" && editingId !== null;
      const res = await fetch(
        isEdit
          ? `/api/admin/services/${serviceId}/documents/${editingId}`
          : `/api/admin/services/${serviceId}/documents`,
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

  async function deleteDoc(id: string) {
    setDeleting(id);
    try {
      const res = await fetch(`/api/admin/services/${serviceId}/documents/${id}`, { method: "DELETE" });
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
        <h3 className="text-lg font-semibold">{ar ? "متطلبات المستندات" : "Document requirements"}</h3>
        {editingId === null && (
          <Button size="sm" onClick={openNew} className="gap-2">
            <Plus className="h-3.5 w-3.5" />
            {ar ? "إضافة مستند" : "Add document"}
          </Button>
        )}
      </div>

      {loading ? (
        <div className="flex justify-center py-10">
          <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
        </div>
      ) : docs.length === 0 && editingId === null ? (
        <Card>
          <CardContent className="py-8 text-center text-sm text-muted-foreground">
            {ar ? "لا توجد متطلبات مستندات." : "No document requirements yet."}
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-3">
          {docs.map((d) => (
            <Card key={d.id}>
              <CardContent className="flex flex-wrap items-center justify-between gap-3 py-4">
                <div className="min-w-0">
                  <p className="font-medium">
                    {d.nameEn} {d.isRequired && <Badge variant="outline" className="ms-1 text-[10px]">required</Badge>}
                  </p>
                  <p className="text-xs text-muted-foreground" dir="rtl">{d.nameAr}</p>
                  <div className="mt-1 flex flex-wrap gap-1.5">
                    <Badge variant="secondary" className="text-[10px]">{d.provider}</Badge>
                    <Badge variant="secondary" className="text-[10px]">{d.stage}</Badge>
                    {d.acceptsDigital && <Badge variant="outline" className="text-[10px]">digital</Badge>}
                    {d.requiresOriginal && <Badge variant="outline" className="text-[10px]">original</Badge>}
                    {d.requiresNotarization && <Badge variant="outline" className="text-[10px]">notarized</Badge>}
                    {d.requiresApostille && <Badge variant="outline" className="text-[10px]">apostille</Badge>}
                  </div>
                </div>
                <div className="flex gap-1">
                  <Button variant="ghost" size="sm" onClick={() => openEdit(d)}>
                    <Pencil className="h-3.5 w-3.5" />
                  </Button>
                  <AlertDialog>
                    <AlertDialogTrigger asChild>
                      <Button variant="ghost" size="sm" disabled={deleting === d.id}>
                        <Trash2 className="h-3.5 w-3.5 text-destructive" />
                      </Button>
                    </AlertDialogTrigger>
                    <AlertDialogContent>
                      <AlertDialogHeader>
                        <AlertDialogTitle>{ar ? "حذف المتطلب؟" : "Delete requirement?"}</AlertDialogTitle>
                        <AlertDialogDescription>
                          {ar ? "سيتم حذف هذا المتطلب نهائياً." : "This requirement will be permanently deleted."}
                        </AlertDialogDescription>
                      </AlertDialogHeader>
                      <AlertDialogFooter>
                        <AlertDialogCancel>{ar ? "إلغاء" : "Cancel"}</AlertDialogCancel>
                        <AlertDialogAction
                          className="bg-destructive text-white hover:bg-destructive/90"
                          onClick={() => deleteDoc(d.id)}
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
                  {editingId === "new" ? (ar ? "متطلب جديد" : "New requirement") : (ar ? "تعديل المتطلب" : "Edit requirement")}
                </CardTitle>
                <Button variant="ghost" size="sm" onClick={() => setEditingId(null)}>
                  <X className="h-4 w-4" />
                </Button>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid gap-3 sm:grid-cols-2">
                  <div className="space-y-1.5">
                    <Label>Slug *</Label>
                    <Input value={form.slug} onChange={(e) => setForm({ ...form, slug: e.target.value })} dir="ltr" />
                  </div>
                  <div className="space-y-1.5">
                    <Label>{ar ? "الترتيب" : "Sort order"}</Label>
                    <Input type="number" value={form.sortOrder} onChange={(e) => setForm({ ...form, sortOrder: e.target.value })} />
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
                    <Label>{ar ? "الوصف (عربي)" : "Description (AR)"}</Label>
                    <Textarea value={form.descriptionAr} onChange={(e) => setForm({ ...form, descriptionAr: e.target.value })} dir="rtl" rows={2} />
                  </div>
                  <div className="space-y-1.5">
                    <Label>{ar ? "الوصف (إنجليزي)" : "Description (EN)"}</Label>
                    <Textarea value={form.descriptionEn} onChange={(e) => setForm({ ...form, descriptionEn: e.target.value })} dir="ltr" rows={2} />
                  </div>
                  <div className="space-y-1.5">
                    <Label>{ar ? "المصدر" : "Provider"}</Label>
                    <Select value={form.provider} onValueChange={(v) => setForm({ ...form, provider: v })}>
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        {PROVIDERS.map((p) => (
                          <SelectItem key={p.value} value={p.value}>
                            {ar ? p.ar : p.en}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-1.5">
                    <Label>{ar ? "المرحلة" : "Stage"}</Label>
                    <Select value={form.stage} onValueChange={(v) => setForm({ ...form, stage: v })}>
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        {STAGES.map((s) => (
                          <SelectItem key={s.value} value={s.value}>
                            {ar ? s.ar : s.en}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                </div>

                <div className="flex flex-wrap gap-x-6 gap-y-3">
                  <div className="flex items-center gap-2">
                    <Switch id="isRequired" checked={form.isRequired} onCheckedChange={(v) => setForm({ ...form, isRequired: v })} />
                    <Label htmlFor="isRequired">{ar ? "إلزامي" : "Required"}</Label>
                  </div>
                  <div className="flex items-center gap-2">
                    <Switch id="acceptsDigital" checked={form.acceptsDigital} onCheckedChange={(v) => setForm({ ...form, acceptsDigital: v })} />
                    <Label htmlFor="acceptsDigital">{ar ? "نسخة رقمية مقبولة" : "Digital accepted"}</Label>
                  </div>
                  <div className="flex items-center gap-2">
                    <Switch id="requiresOriginal" checked={form.requiresOriginal} onCheckedChange={(v) => setForm({ ...form, requiresOriginal: v })} />
                    <Label htmlFor="requiresOriginal">{ar ? "يتطلب الأصل" : "Original required"}</Label>
                  </div>
                  <div className="flex items-center gap-2">
                    <Switch id="requiresNotarization" checked={form.requiresNotarization} onCheckedChange={(v) => setForm({ ...form, requiresNotarization: v })} />
                    <Label htmlFor="requiresNotarization">{ar ? "يتطلب توثيقاً" : "Notarization"}</Label>
                  </div>
                  <div className="flex items-center gap-2">
                    <Switch id="requiresApostille" checked={form.requiresApostille} onCheckedChange={(v) => setForm({ ...form, requiresApostille: v })} />
                    <Label htmlFor="requiresApostille">{ar ? "يتطلب أبوستيل" : "Apostille"}</Label>
                  </div>
                </div>

                <div className="flex gap-2">
                  <Button onClick={handleSave} disabled={saving} className="gap-2">
                    {saving && <Loader2 className="h-4 w-4 animate-spin" />}
                    {ar ? "حفظ المتطلب" : "Save requirement"}
                  </Button>
                  <Button variant="outline" onClick={() => setEditingId(null)}>
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
