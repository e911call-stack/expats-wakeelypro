"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { useLocale } from "@/lib/locale-provider";
import { useToast } from "@/hooks/use-toast";
import { Button } from "@/components/ui/button";
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
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
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
import { Loader2, Plus, RefreshCw, Search, Pencil, Trash2, Power } from "lucide-react";
import { REMOTE_LABEL, fmtJOD, type AdminService, type RemoteEligibility } from "@/lib/admin/services";

export default function AdminServicesPage() {
  const { locale } = useLocale();
  const ar = locale === "ar";
  const { toast } = useToast();

  const [services, setServices] = useState<AdminService[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [active, setActive] = useState<string>("");
  const [featured, setFeatured] = useState<string>("");
  const [deleting, setDeleting] = useState<string | null>(null);
  const [toggling, setToggling] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams();
      if (search.trim()) params.set("search", search.trim());
      if (active) params.set("active", active);
      if (featured) params.set("featured", featured);
      const res = await fetch(`/api/admin/services?${params.toString()}`, { cache: "no-store" });
      const data = await res.json();
      if (res.ok) setServices(data.services ?? []);
    } finally {
      setLoading(false);
    }
  }, [search, active, featured]);

  useEffect(() => {
    load();
  }, [load]);

  async function toggleActive(svc: AdminService) {
    setToggling(svc.id);
    try {
      const res = await fetch(`/api/admin/services/${svc.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ isActive: !svc.isActive }),
      });
      if (!res.ok) throw new Error("failed");
      toast({
        title: svc.isActive ? (ar ? "تم الإيقاف" : "Deactivated") : (ar ? "تم التفعيل" : "Activated"),
        description: ar ? "تم تحديث حالة الخدمة" : "Service status updated",
      });
      await load();
    } catch {
      toast({ title: ar ? "فشل التحديث" : "Update failed", variant: "destructive" });
    } finally {
      setToggling(null);
    }
  }

  async function deleteService(svc: AdminService) {
    setDeleting(svc.id);
    try {
      const res = await fetch(`/api/admin/services/${svc.id}`, { method: "DELETE" });
      if (!res.ok) throw new Error("failed");
      toast({ title: ar ? "تم الإيقاف" : "Deactivated", description: ar ? "تم إيقاف الخدمة" : "Service deactivated" });
      await load();
    } catch {
      toast({ title: ar ? "فشلت العملية" : "Action failed", variant: "destructive" });
    } finally {
      setDeleting(null);
    }
  }

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold">{ar ? "الخدمات" : "Services"}</h1>
          <p className="text-sm text-muted-foreground" dir="rtl">
            {ar ? "إدارة الخدمات القانونية" : "Manage legal services"}
          </p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" size="sm" onClick={load} disabled={loading} className="gap-2">
            <RefreshCw className={`h-3.5 w-3.5 ${loading ? "animate-spin" : ""}`} />
            {ar ? "تحديث" : "Refresh"}
          </Button>
          <Link href="/admin/services/new">
            <Button size="sm" className="gap-2">
              <Plus className="h-3.5 w-3.5" />
              {ar ? "إضافة خدمة" : "Add service"}
            </Button>
          </Link>
        </div>
      </div>

      <Card>
        <CardContent className="flex flex-wrap items-center gap-2 pt-4">
          <div className="relative min-w-[220px] flex-1">
            <Search className="absolute start-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <Input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && load()}
              placeholder={ar ? "بحث بالاسم / الكود / slug" : "Search by name / code / slug"}
              className="ps-9"
            />
          </div>
          <Select value={active} onValueChange={setActive}>
            <SelectTrigger className="w-40">
              <SelectValue placeholder={ar ? "الحالة" : "Status"} />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">{ar ? "الكل" : "All"}</SelectItem>
              <SelectItem value="true">{ar ? "مفعلة" : "Active"}</SelectItem>
              <SelectItem value="false">{ar ? "موقوفة" : "Inactive"}</SelectItem>
            </SelectContent>
          </Select>
          <Select value={featured} onValueChange={setFeatured}>
            <SelectTrigger className="w-40">
              <SelectValue placeholder={ar ? "مميزة" : "Featured"} />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">{ar ? "الكل" : "All"}</SelectItem>
              <SelectItem value="true">{ar ? "مميزة" : "Featured"}</SelectItem>
              <SelectItem value="false">{ar ? "غير مميزة" : "Not featured"}</SelectItem>
            </SelectContent>
          </Select>
          <Button variant="outline" size="sm" onClick={load}>
            {ar ? "تطبيق" : "Apply"}
          </Button>
        </CardContent>
      </Card>

      {loading ? (
        <div className="flex justify-center py-16">
          <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
        </div>
      ) : services.length === 0 ? (
        <Card>
          <CardContent className="py-12 text-center text-sm text-muted-foreground">
            {ar ? "لا توجد خدمات مطابقة." : "No matching services."}
          </CardContent>
        </Card>
      ) : (
        <Card>
          <CardContent className="overflow-x-auto pt-4">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>{ar ? "ترتيب" : "Sort"}</TableHead>
                  <TableHead>{ar ? "الاسم" : "Name"}</TableHead>
                  <TableHead>Code</TableHead>
                  <TableHead>{ar ? "الأهلية" : "Eligibility"}</TableHead>
                  <TableHead>{ar ? "رسوم المنصة" : "Platform fee"}</TableHead>
                  <TableHead>{ar ? "رسوم المحامي" : "Lawyer fee"}</TableHead>
                  <TableHead>{ar ? "مميزة" : "Featured"}</TableHead>
                  <TableHead>{ar ? "الحالة" : "Status"}</TableHead>
                  <TableHead className="text-end">{ar ? "إجراءات" : "Actions"}</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {services.map((s) => (
                  <TableRow key={s.id}>
                    <TableCell className="text-xs text-muted-foreground">{s.sortOrder}</TableCell>
                    <TableCell>
                      <div className="min-w-40">
                        <p className="font-medium">{s.nameEn}</p>
                        <p className="text-xs text-muted-foreground" dir="rtl">{s.nameAr}</p>
                        <p className="font-mono text-[10px] text-muted-foreground">{s.slug}</p>
                      </div>
                    </TableCell>
                    <TableCell className="font-mono text-xs">{s.code}</TableCell>
                    <TableCell>
                      <Badge variant="outline" className="text-xs">
                        {ar
                          ? REMOTE_LABEL[s.defaultRemoteEligibility as RemoteEligibility]?.ar
                          : REMOTE_LABEL[s.defaultRemoteEligibility as RemoteEligibility]?.en}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-xs">{fmtJOD(s.platformFeeDefault)}</TableCell>
                    <TableCell className="text-xs">
                      {fmtJOD(s.lawyerFeeMin)} – {fmtJOD(s.lawyerFeeMax)}
                    </TableCell>
                    <TableCell>
                      {s.isFeatured ? <Badge>{ar ? "مميزة" : "Featured"}</Badge> : <span className="text-xs text-muted-foreground">—</span>}
                    </TableCell>
                    <TableCell>
                      {s.isActive ? (
                        <Badge variant="success">{ar ? "مفعلة" : "Active"}</Badge>
                      ) : (
                        <Badge variant="destructive">{ar ? "موقوفة" : "Inactive"}</Badge>
                      )}
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center justify-end gap-1">
                        <Link href={`/admin/services/${s.id}`}>
                          <Button variant="ghost" size="sm" aria-label="Edit">
                            <Pencil className="h-3.5 w-3.5" />
                          </Button>
                        </Link>
                        <Button
                          variant="ghost"
                          size="sm"
                          disabled={toggling === s.id}
                          onClick={() => toggleActive(s)}
                          aria-label="Toggle active"
                        >
                          {toggling === s.id ? (
                            <Loader2 className="h-3.5 w-3.5 animate-spin" />
                          ) : (
                            <Power className="h-3.5 w-3.5" />
                          )}
                        </Button>
                        <AlertDialog>
                          <AlertDialogTrigger asChild>
                            <Button variant="ghost" size="sm" aria-label="Delete" disabled={deleting === s.id}>
                              <Trash2 className="h-3.5 w-3.5 text-destructive" />
                            </Button>
                          </AlertDialogTrigger>
                          <AlertDialogContent>
                            <AlertDialogHeader>
                              <AlertDialogTitle>
                                {ar ? "إيقاف الخدمة" : "Deactivate service?"}
                              </AlertDialogTitle>
                              <AlertDialogDescription>
                                {ar
                                  ? `سيتم إيقاف "${s.nameAr}" ولن تظهر في الكتالوج. القضايا المرتبطة لن تتأثر.`
                                  : `"${s.nameEn}" will be deactivated and hidden from the catalog. Existing matters are not affected.`}
                              </AlertDialogDescription>
                            </AlertDialogHeader>
                            <AlertDialogFooter>
                              <AlertDialogCancel>{ar ? "إلغاء" : "Cancel"}</AlertDialogCancel>
                              <AlertDialogAction
                                onClick={() => deleteService(s)}
                                className="bg-destructive text-white hover:bg-destructive/90"
                              >
                                {ar ? "إيقاف" : "Deactivate"}
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
    </div>
  );
}
