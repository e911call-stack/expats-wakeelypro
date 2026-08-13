"use client";

import { useCallback, useEffect, useState } from "react";
import { useLocale } from "@/lib/locale-provider";
import { useToast } from "@/hooks/use-toast";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
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
import { Card, CardContent } from "@/components/ui/card";
import { Loader2, RefreshCw, Search, Pencil, ShieldCheck, ShieldX, Star, Globe2 } from "lucide-react";
import { fmtDate, type AdminLawyer } from "@/lib/admin/ops";

export default function AdminLawyersPage() {
  const { locale } = useLocale();
  const ar = locale === "ar";
  const { toast } = useToast();

  const [lawyers, setLawyers] = useState<AdminLawyer[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [verified, setVerified] = useState("");
  const [toggling, setToggling] = useState<string | null>(null);
  const [edit, setEdit] = useState<AdminLawyer | null>(null);
  const [editSpecialties, setEditSpecialties] = useState("");
  const [editCities, setEditCities] = useState("");
  const [editLanguages, setEditLanguages] = useState("");
  const [editHourlyRate, setEditHourlyRate] = useState("");
  const [editYearsExp, setEditYearsExp] = useState("");
  const [editVerified, setEditVerified] = useState(false);
  const [editAvailable, setEditAvailable] = useState(false);
  const [editRemote, setEditRemote] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams();
      if (search.trim()) params.set("search", search.trim());
      if (verified) params.set("verified", verified);
      const res = await fetch(`/api/admin/lawyers?${params.toString()}`, { cache: "no-store" });
      const data = await res.json();
      if (res.ok) setLawyers(data.lawyers ?? []);
      else toast({ title: ar ? "فشل تحميل المحامين" : "Failed to load lawyers", variant: "destructive" });
    } finally {
      setLoading(false);
    }
  }, [search, verified, ar, toast]);

  useEffect(() => {
    load();
  }, [load]);

  async function patch(id: string, body: Record<string, unknown>, okMsg: string) {
    const res = await fetch(`/api/admin/lawyers/${id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    });
    const data = await res.json();
    if (!res.ok) throw new Error(data.error || "failed");
    toast({ title: okMsg });
    await load();
  }

  async function toggleVerified(l: AdminLawyer) {
    setToggling(l.id);
    try {
      await patch(l.id, { verified: !l.verified }, ar ? (l.verified ? "أُزيل التوثيق" : "تم التوثيق") : l.verified ? "Unverified" : "Verified");
    } catch {
      toast({ title: ar ? "فشل التحديث" : "Update failed", variant: "destructive" });
    } finally {
      setToggling(null);
    }
  }

  async function toggleAvailable(l: AdminLawyer) {
    setToggling(l.id);
    try {
      await patch(l.id, { isAvailable: !l.isAvailable }, ar ? "تم تحديث التوفر" : "Availability updated");
    } catch {
      toast({ title: ar ? "فشل التحديث" : "Update failed", variant: "destructive" });
    } finally {
      setToggling(null);
    }
  }

  async function toggleRemote(l: AdminLawyer) {
    setToggling(l.id);
    try {
      await patch(l.id, { handlesRemoteMatters: !l.handlesRemoteMatters }, ar ? "تم تحديث العمل عن بُعد" : "Remote updated");
    } catch {
      toast({ title: ar ? "فشل التحديث" : "Update failed", variant: "destructive" });
    } finally {
      setToggling(null);
    }
  }

  async function saveEdit() {
    if (!edit) return;
    setToggling(edit.id);
    try {
      await patch(
        edit.id,
        {
          specialties: editSpecialties.split(",").map((s) => s.trim()).filter(Boolean),
          cities: editCities.split(",").map((s) => s.trim()).filter(Boolean),
          languages: editLanguages.split(",").map((s) => s.trim().toLowerCase()).filter(Boolean),
          hourlyRate: editHourlyRate ? Number(editHourlyRate) : null,
          yearsExperience: editYearsExp ? Number(editYearsExp) : null,
          verified: editVerified,
          isAvailable: editAvailable,
          handlesRemoteMatters: editRemote,
        },
        ar ? "تم الحفظ" : "Saved",
      );
      setEdit(null);
    } catch {
      toast({ title: ar ? "فشل الحفظ" : "Save failed", variant: "destructive" });
    } finally {
      setToggling(null);
    }
  }

  const verifiedCount = lawyers.filter((l) => l.verified).length;
  const availableCount = lawyers.filter((l) => l.isAvailable).length;

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div>
          <h1 className="text-2xl font-bold">{ar ? "المحامون" : "Lawyers"}</h1>
          <p className="text-sm text-muted-foreground" dir="rtl">
            {ar ? "التوثيق والتوفر والملفات" : "Verification, availability and profiles"}
          </p>
        </div>
        <Button variant="outline" size="sm" onClick={load} disabled={loading} className="gap-2">
          <RefreshCw className={`h-3.5 w-3.5 ${loading ? "animate-spin" : ""}`} />
          {ar ? "تحديث" : "Refresh"}
        </Button>
      </div>

      <div className="grid gap-3 sm:grid-cols-3">
        <Card><CardContent className="py-4">
          <p className="text-xs text-muted-foreground">{ar ? "إجمالي" : "Total"}</p>
          <p className="mt-1 text-2xl font-bold">{lawyers.length}</p>
        </CardContent></Card>
        <Card><CardContent className="py-4">
          <p className="text-xs text-muted-foreground">{ar ? "موثّقون" : "Verified"}</p>
          <p className="mt-1 text-2xl font-bold text-emerald-600">{verifiedCount}</p>
        </CardContent></Card>
        <Card><CardContent className="py-4">
          <p className="text-xs text-muted-foreground">{ar ? "متاحون" : "Available"}</p>
          <p className="mt-1 text-2xl font-bold">{availableCount}</p>
        </CardContent></Card>
      </div>

      <Card>
        <CardContent className="flex flex-wrap items-center gap-2 pt-4">
          <div className="relative min-w-[200px] flex-1">
            <Search className="absolute start-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <Input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && load()}
              placeholder={ar ? "بحث بالاسم / الهاتف / رقم النقابة" : "Search name / phone / bar number"}
              className="ps-9"
            />
          </div>
          <Select value={verified} onValueChange={setVerified}>
            <SelectTrigger className="w-40"><SelectValue placeholder={ar ? "التوثيق" : "Verified"} /></SelectTrigger>
            <SelectContent>
              <SelectItem value="all">{ar ? "الكل" : "All"}</SelectItem>
              <SelectItem value="true">{ar ? "موثّق" : "Verified"}</SelectItem>
              <SelectItem value="false">{ar ? "غير موثّق" : "Unverified"}</SelectItem>
            </SelectContent>
          </Select>
          <Button variant="outline" size="sm" onClick={load}>{ar ? "تطبيق" : "Apply"}</Button>
        </CardContent>
      </Card>

      {loading ? (
        <div className="flex justify-center py-16"><Loader2 className="h-8 w-8 animate-spin text-muted-foreground" /></div>
      ) : lawyers.length === 0 ? (
        <Card><CardContent className="py-12 text-center text-sm text-muted-foreground">
          {ar ? "لا يوجد محامون." : "No lawyers found."}
        </CardContent></Card>
      ) : (
        <Card>
          <CardContent className="overflow-x-auto pt-4">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>{ar ? "المحامي" : "Lawyer"}</TableHead>
                  <TableHead>{ar ? "نقابة" : "Bar"}</TableHead>
                  <TableHead>{ar ? "توثيق" : "Verified"}</TableHead>
                  <TableHead>{ar ? "متاح" : "Available"}</TableHead>
                  <TableHead>{ar ? "عن بُعد" : "Remote"}</TableHead>
                  <TableHead>{ar ? "تقييم" : "Rating"}</TableHead>
                  <TableHead>{ar ? "قضايا" : "Matters"}</TableHead>
                  <TableHead className="text-end">{ar ? "إجراءات" : "Actions"}</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {lawyers.map((l) => (
                  <TableRow key={l.id}>
                    <TableCell>
                      <p className="font-medium">{l.user.name}</p>
                      <p className="text-xs text-muted-foreground" dir="ltr">{l.user.phone ?? l.user.email ?? ""}</p>
                    </TableCell>
                    <TableCell className="text-xs">{l.barNumber ?? "—"}</TableCell>
                    <TableCell>
                      <Switch
                        checked={l.verified}
                        disabled={toggling === l.id}
                        onCheckedChange={() => toggleVerified(l)}
                        aria-label="Verified"
                      />
                    </TableCell>
                    <TableCell>
                      <Switch
                        checked={l.isAvailable}
                        disabled={toggling === l.id}
                        onCheckedChange={() => toggleAvailable(l)}
                        aria-label="Available"
                      />
                    </TableCell>
                    <TableCell>
                      <Switch
                        checked={l.handlesRemoteMatters}
                        disabled={toggling === l.id}
                        onCheckedChange={() => toggleRemote(l)}
                        aria-label="Remote"
                      />
                    </TableCell>
                    <TableCell>
                      {l.rating != null ? (
                        <span className="flex items-center gap-1 text-xs"><Star className="h-3.5 w-3.5 text-amber-500" />{l.rating}</span>
                      ) : (
                        <span className="text-xs text-muted-foreground">—</span>
                      )}
                    </TableCell>
                    <TableCell className="text-xs">{l.activeMattersCount}</TableCell>
                    <TableCell className="text-end">
                      <Dialog open={edit?.id === l.id} onOpenChange={(o) => !o && setEdit(null)}>
                        <DialogTrigger asChild>
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => {
                              setEdit(l);
                              setEditSpecialties((l.specialties ?? []).join(", "));
                              setEditCities((l.cities ?? []).join(", "));
                              setEditLanguages((l.languages ?? []).join(", "));
                              setEditHourlyRate(l.hourlyRate != null ? String(l.hourlyRate) : "");
                              setEditYearsExp(l.yearsExperience != null ? String(l.yearsExperience) : "");
                              setEditVerified(l.verified);
                              setEditAvailable(l.isAvailable);
                              setEditRemote(l.handlesRemoteMatters);
                            }}
                            aria-label="Edit"
                          >
                            <Pencil className="h-3.5 w-3.5" />
                          </Button>
                        </DialogTrigger>
                        <DialogContent>
                          <DialogHeader>
                            <DialogTitle>{ar ? "تعديل المحامي" : "Edit lawyer"} — {l.user.name}</DialogTitle>
                            <DialogDescription>
                              <span className="flex items-center gap-1">
                                {l.verified ? <ShieldCheck className="h-3.5 w-3.5 text-emerald-600" /> : <ShieldX className="h-3.5 w-3.5 text-muted-foreground" />}
                                {ar ? "توثيق وتفاصيل" : "Verification & details"} · {l.barNumber ?? "—"}
                              </span>
                            </DialogDescription>
                          </DialogHeader>
                          <div className="grid gap-4 sm:grid-cols-2">
                            <div className="space-y-2">
                              <label className="text-sm font-medium">{ar ? "التخصصات" : "Specialties"}</label>
                              <Input value={editSpecialties} onChange={(e) => setEditSpecialties(e.target.value)} placeholder="family, commercial" dir="ltr" />
                            </div>
                            <div className="space-y-2">
                              <label className="text-sm font-medium">{ar ? "المدن" : "Cities"}</label>
                              <Input value={editCities} onChange={(e) => setEditCities(e.target.value)} placeholder="Amman, Irbid" dir="ltr" />
                            </div>
                            <div className="space-y-2">
                              <label className="text-sm font-medium">{ar ? "اللغات" : "Languages"}</label>
                              <Input value={editLanguages} onChange={(e) => setEditLanguages(e.target.value)} placeholder="ar, en" dir="ltr" />
                            </div>
                            <div className="space-y-2">
                              <label className="text-sm font-medium">{ar ? "الساعة (JOD)" : "Hourly rate (JOD)"}</label>
                              <Input type="number" min={0} value={editHourlyRate} onChange={(e) => setEditHourlyRate(e.target.value)} />
                            </div>
                            <div className="space-y-2">
                              <label className="text-sm font-medium">{ar ? "سنوات الخبرة" : "Years experience"}</label>
                              <Input type="number" min={0} value={editYearsExp} onChange={(e) => setEditYearsExp(e.target.value)} />
                            </div>
                          </div>
                          <div className="flex flex-wrap gap-x-6 gap-y-3">
                            <div className="flex items-center gap-2">
                              <Switch id="edit-verified" checked={editVerified} onCheckedChange={setEditVerified} />
                              <label htmlFor="edit-verified" className="text-sm">{ar ? "موثّق" : "Verified"}</label>
                            </div>
                            <div className="flex items-center gap-2">
                              <Switch id="edit-available" checked={editAvailable} onCheckedChange={setEditAvailable} />
                              <label htmlFor="edit-available" className="text-sm">{ar ? "متاح" : "Available"}</label>
                            </div>
                            <div className="flex items-center gap-2">
                              <Switch id="edit-remote" checked={editRemote} onCheckedChange={setEditRemote} />
                              <label htmlFor="edit-remote" className="flex items-center gap-1 text-sm"><Globe2 className="h-3.5 w-3.5" />{ar ? "عن بُعد" : "Remote"}</label>
                            </div>
                          </div>
                          <DialogFooter>
                            <Button onClick={saveEdit} disabled={toggling === l.id} className="gap-2">
                              {toggling === l.id && <Loader2 className="h-4 w-4 animate-spin" />}
                              {ar ? "حفظ" : "Save"}
                            </Button>
                          </DialogFooter>
                        </DialogContent>
                      </Dialog>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      )}

      {lawyers.length > 0 && (
        <p className="text-xs text-muted-foreground">
          {ar ? `تاريخ الإنشاء لأول محامٍ: ${fmtDate(lawyers[lawyers.length - 1].createdAt)}` : `Oldest profile: ${fmtDate(lawyers[lawyers.length - 1].createdAt)}`}
        </p>
      )}
    </div>
  );
}
