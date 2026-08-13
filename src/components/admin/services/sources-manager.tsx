"use client";

import { useCallback, useEffect, useState } from "react";
import { useLocale } from "@/lib/locale-provider";
import { useToast } from "@/hooks/use-toast";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
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
import { Card, CardContent } from "@/components/ui/card";
import { Loader2, Link2, Plus, Trash2 } from "lucide-react";
import type { AdminSourceLink, OfficialSourceOption } from "@/lib/admin/services";

interface Props {
  serviceId: string;
  sources: OfficialSourceOption[];
}

export function SourcesManager({ serviceId, sources }: Props) {
  const { locale } = useLocale();
  const ar = locale === "ar";
  const { toast } = useToast();

  const [links, setLinks] = useState<AdminSourceLink[]>([]);
  const [loading, setLoading] = useState(true);
  const [selected, setSelected] = useState<string>("");
  const [relationType, setRelationType] = useState("primary");
  const [notes, setNotes] = useState("");
  const [adding, setAdding] = useState(false);
  const [removing, setRemoving] = useState<string | null>(null);
  const [updating, setUpdating] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch(`/api/admin/services/${serviceId}/sources`, { cache: "no-store" });
      const data = await res.json();
      if (res.ok) setLinks(data.links ?? []);
    } finally {
      setLoading(false);
    }
  }, [serviceId]);

  useEffect(() => {
    load();
  }, [load]);

  const linkedIds = new Set(links.map((l) => l.officialSource.id));
  const available = sources.filter((s) => !linkedIds.has(s.id));

  async function addLink() {
    if (!selected) return;
    setAdding(true);
    try {
      const res = await fetch(`/api/admin/services/${serviceId}/sources`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ officialSourceId: selected, relationType, notesAr: notes, notesEn: notes }),
      });
      if (!res.ok) {
        toast({ title: ar ? "فشل الربط" : "Link failed", variant: "destructive" });
        return;
      }
      toast({ title: ar ? "تم الربط" : "Linked" });
      setSelected("");
      setNotes("");
      setRelationType("primary");
      await load();
    } catch {
      toast({ title: ar ? "خطأ في الشبكة" : "Network error", variant: "destructive" });
    } finally {
      setAdding(false);
    }
  }

  async function updateRelation(link: AdminSourceLink, value: string) {
    setUpdating(link.id);
    try {
      const res = await fetch(`/api/admin/services/${serviceId}/sources/${link.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ relationType: value }),
      });
      if (!res.ok) throw new Error("failed");
      toast({ title: ar ? "تم التحديث" : "Updated" });
      await load();
    } catch {
      toast({ title: ar ? "فشل التحديث" : "Update failed", variant: "destructive" });
    } finally {
      setUpdating(null);
    }
  }

  async function removeLink(id: string) {
    setRemoving(id);
    try {
      const res = await fetch(`/api/admin/services/${serviceId}/sources/${id}`, { method: "DELETE" });
      if (!res.ok) throw new Error("failed");
      toast({ title: ar ? "تمت إزالة الرابط" : "Link removed" });
      await load();
    } catch {
      toast({ title: ar ? "فشلت العملية" : "Action failed", variant: "destructive" });
    } finally {
      setRemoving(null);
    }
  }

  return (
    <div className="space-y-4">
      <h3 className="text-lg font-semibold">{ar ? "المصادر الرسمية المرتبطة" : "Linked official sources"}</h3>

      {loading ? (
        <div className="flex justify-center py-10">
          <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
        </div>
      ) : links.length === 0 ? (
        <Card>
          <CardContent className="py-8 text-center text-sm text-muted-foreground">
            {ar ? "لا توجد مصادر رسمية مرتبطة." : "No official sources linked."}
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-2">
          {links.map((l) => (
            <Card key={l.id}>
              <CardContent className="flex flex-wrap items-center justify-between gap-3 py-3">
                <div className="flex min-w-0 items-center gap-2">
                  <Link2 className="h-4 w-4 shrink-0 text-muted-foreground" />
                  <div className="min-w-0">
                    <p className="font-medium">{l.officialSource.nameEn}</p>
                    <p className="text-xs text-muted-foreground" dir="rtl">{l.officialSource.nameAr}</p>
                  </div>
                  <Badge variant="outline" className="text-[10px]">{l.officialSource.authorityType}</Badge>
                </div>
                <div className="flex items-center gap-2">
                  <Select value={l.relationType} onValueChange={(v) => updateRelation(l, v)} disabled={updating === l.id}>
                    <SelectTrigger className="w-40 h-8 text-xs">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="primary">{ar ? "رئيسي" : "Primary"}</SelectItem>
                      <SelectItem value="secondary">{ar ? "ثانوي" : "Secondary"}</SelectItem>
                      <SelectItem value="reference">{ar ? "مرجع" : "Reference"}</SelectItem>
                    </SelectContent>
                  </Select>
                  <AlertDialog>
                    <AlertDialogTrigger asChild>
                      <Button variant="ghost" size="sm" disabled={removing === l.id}>
                        <Trash2 className="h-3.5 w-3.5 text-destructive" />
                      </Button>
                    </AlertDialogTrigger>
                    <AlertDialogContent>
                      <AlertDialogHeader>
                        <AlertDialogTitle>{ar ? "إزالة الرابط؟" : "Remove link?"}</AlertDialogTitle>
                        <AlertDialogDescription>
                          {ar ? "سيتم إزالة هذا المصدر من الخدمة." : "This source will be unlinked from the service."}
                        </AlertDialogDescription>
                      </AlertDialogHeader>
                      <AlertDialogFooter>
                        <AlertDialogCancel>{ar ? "إلغاء" : "Cancel"}</AlertDialogCancel>
                        <AlertDialogAction
                          className="bg-destructive text-white hover:bg-destructive/90"
                          onClick={() => removeLink(l.id)}
                        >
                          {ar ? "إزالة" : "Remove"}
                        </AlertDialogAction>
                      </AlertDialogFooter>
                    </AlertDialogContent>
                  </AlertDialog>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      <Card>
        <CardContent className="space-y-3 py-4">
          <p className="text-sm font-medium">{ar ? "ربط مصدر رسمي" : "Link an official source"}</p>
          <div className="grid gap-3 sm:grid-cols-3">
            <div className="space-y-1.5">
              <Label>{ar ? "المصدر" : "Source"}</Label>
              <Select value={selected} onValueChange={setSelected}>
                <SelectTrigger>
                  <SelectValue placeholder={ar ? "اختر مصدراً" : "Select source"} />
                </SelectTrigger>
                <SelectContent>
                  {available.length === 0 && <SelectItem value="__none__" disabled>{ar ? "لا مصادر متاحة" : "No sources available"}</SelectItem>}
                  {available.map((s) => (
                    <SelectItem key={s.id} value={s.id}>
                      {s.nameEn}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1.5">
              <Label>{ar ? "نوع العلاقة" : "Relation"}</Label>
              <Select value={relationType} onValueChange={setRelationType}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="primary">{ar ? "رئيسي" : "Primary"}</SelectItem>
                  <SelectItem value="secondary">{ar ? "ثانوي" : "Secondary"}</SelectItem>
                  <SelectItem value="reference">{ar ? "مرجع" : "Reference"}</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1.5">
              <Label>{ar ? "ملاحظات" : "Notes"}</Label>
              <Input value={notes} onChange={(e) => setNotes(e.target.value)} />
            </div>
          </div>
          <Button size="sm" onClick={addLink} disabled={!selected || adding} className="gap-2">
            {adding ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Plus className="h-3.5 w-3.5" />}
            {ar ? "ربط المصدر" : "Link source"}
          </Button>
        </CardContent>
      </Card>
    </div>
  );
}
