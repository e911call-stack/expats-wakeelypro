"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
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
import { Loader2, RefreshCw, Search, Pencil, CheckCircle2, Circle } from "lucide-react";
import {
  PAYMENT_KIND_LABEL,
  PAYMENT_STATUS_LABEL,
  type AdminPayment,
} from "@/lib/admin/ops";

const STATUSES = Object.keys(PAYMENT_STATUS_LABEL);
const KINDS = Object.keys(PAYMENT_KIND_LABEL);

const STATUS_TONE: Record<string, "success" | "warning" | "destructive" | "secondary"> = {
  PAID: "success",
  PENDING: "warning",
  FAILED: "destructive",
  REFUNDED: "secondary",
};

export default function AdminPaymentsPage() {
  const { locale } = useLocale();
  const ar = locale === "ar";
  const { toast } = useToast();

  const [payments, setPayments] = useState<AdminPayment[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [status, setStatus] = useState("");
  const [kind, setKind] = useState("");
  const [updating, setUpdating] = useState<string | null>(null);
  const [edit, setEdit] = useState<AdminPayment | null>(null);
  const [editStatus, setEditStatus] = useState("PAID");
  const [editDesc, setEditDesc] = useState("");

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams();
      if (search.trim()) params.set("search", search.trim());
      if (status) params.set("status", status);
      if (kind) params.set("kind", kind);
      const res = await fetch(`/api/admin/payments?${params.toString()}`, { cache: "no-store" });
      const data = await res.json();
      if (res.ok) setPayments(data.payments ?? []);
      else toast({ title: ar ? "فشل تحميل المدفوعات" : "Failed to load payments", variant: "destructive" });
    } finally {
      setLoading(false);
    }
  }, [search, status, kind, ar, toast]);

  useEffect(() => {
    load();
  }, [load]);

  async function patchStatus(p: AdminPayment, next: string) {
    setUpdating(p.id);
    try {
      const res = await fetch(`/api/admin/payments/${p.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status: next }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "failed");
      toast({ title: ar ? "تم تحديث الحالة" : "Status updated" });
      await load();
    } catch {
      toast({ title: ar ? "فشل التحديث" : "Update failed", variant: "destructive" });
    } finally {
      setUpdating(null);
    }
  }

  async function saveEdit() {
    if (!edit) return;
    setUpdating(edit.id);
    try {
      const res = await fetch(`/api/admin/payments/${edit.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          status: editStatus,
          description: editDesc.trim() || null,
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "failed");
      toast({ title: ar ? "تم الحفظ" : "Saved" });
      setEdit(null);
      await load();
    } catch {
      toast({ title: ar ? "فشل الحفظ" : "Save failed", variant: "destructive" });
    } finally {
      setUpdating(null);
    }
  }

  const totals = {
    paid: payments.filter((p) => p.status === "PAID").reduce((s, p) => s + p.amountJOD, 0),
    pending: payments.filter((p) => p.status === "PENDING").reduce((s, p) => s + p.amountJOD, 0),
  };

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div>
          <h1 className="text-2xl font-bold">{ar ? "المدفوعات" : "Payments"}</h1>
          <p className="text-sm text-muted-foreground" dir="rtl">
            {ar ? "إدارة المدفوعات وحالاتها" : "Manage payments and statuses"}
          </p>
        </div>
        <Button variant="outline" size="sm" onClick={load} disabled={loading} className="gap-2">
          <RefreshCw className={`h-3.5 w-3.5 ${loading ? "animate-spin" : ""}`} />
          {ar ? "تحديث" : "Refresh"}
        </Button>
      </div>

      <div className="grid gap-3 sm:grid-cols-3">
        <Card><CardContent className="py-4">
          <p className="text-xs text-muted-foreground">{ar ? "إجمالي مدفوع" : "Paid total"}</p>
          <p className="mt-1 text-2xl font-bold text-emerald-600">{totals.paid} JOD</p>
        </CardContent></Card>
        <Card><CardContent className="py-4">
          <p className="text-xs text-muted-foreground">{ar ? "معلّق" : "Pending total"}</p>
          <p className="mt-1 text-2xl font-bold text-amber-600">{totals.pending} JOD</p>
        </CardContent></Card>
        <Card><CardContent className="py-4">
          <p className="text-xs text-muted-foreground">{ar ? "عدد العمليات" : "Transactions"}</p>
          <p className="mt-1 text-2xl font-bold">{payments.length}</p>
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
              placeholder={ar ? "بحث بالاسم / الهاتف / الوصف" : "Search name / phone / description"}
              className="ps-9"
            />
          </div>
          <Select value={status} onValueChange={setStatus}>
            <SelectTrigger className="w-44"><SelectValue placeholder={ar ? "الحالة" : "Status"} /></SelectTrigger>
            <SelectContent>
              <SelectItem value="all">{ar ? "كل الحالات" : "All statuses"}</SelectItem>
              {STATUSES.map((s) => (
                <SelectItem key={s} value={s}>{ar ? PAYMENT_STATUS_LABEL[s].ar : PAYMENT_STATUS_LABEL[s].en}</SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Select value={kind} onValueChange={setKind}>
            <SelectTrigger className="w-44"><SelectValue placeholder={ar ? "النوع" : "Kind"} /></SelectTrigger>
            <SelectContent>
              <SelectItem value="all">{ar ? "كل الأنواع" : "All kinds"}</SelectItem>
              {KINDS.map((k) => (
                <SelectItem key={k} value={k}>{ar ? PAYMENT_KIND_LABEL[k].ar : PAYMENT_KIND_LABEL[k].en}</SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Button variant="outline" size="sm" onClick={load}>{ar ? "تطبيق" : "Apply"}</Button>
        </CardContent>
      </Card>

      {loading ? (
        <div className="flex justify-center py-16"><Loader2 className="h-8 w-8 animate-spin text-muted-foreground" /></div>
      ) : payments.length === 0 ? (
        <Card><CardContent className="py-12 text-center text-sm text-muted-foreground">
          {ar ? "لا توجد مدفوعات مطابقة." : "No matching payments."}
        </CardContent></Card>
      ) : (
        <Card>
          <CardContent className="overflow-x-auto pt-4">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>{ar ? "المبلغ" : "Amount"}</TableHead>
                  <TableHead>{ar ? "النوع" : "Kind"}</TableHead>
                  <TableHead>{ar ? "الحالة" : "Status"}</TableHead>
                  <TableHead>{ar ? "المستخدم" : "User"}</TableHead>
                  <TableHead>{ar ? "القضية" : "Matter"}</TableHead>
                  <TableHead>{ar ? "التاريخ" : "Date"}</TableHead>
                  <TableHead className="text-end">{ar ? "إجراءات" : "Actions"}</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {payments.map((p) => (
                  <TableRow key={p.id}>
                    <TableCell className="font-medium">{p.amountJOD} JOD</TableCell>
                    <TableCell className="text-xs">{ar ? PAYMENT_KIND_LABEL[p.kind]?.ar ?? p.kind : PAYMENT_KIND_LABEL[p.kind]?.en ?? p.kind}</TableCell>
                    <TableCell>
                      <Badge variant={STATUS_TONE[p.status] ?? "secondary"} className="text-xs">
                        {p.status === "PAID" ? <CheckCircle2 className="me-1 h-3 w-3" /> : p.status === "PENDING" ? <Circle className="me-1 h-3 w-3" /> : null}
                        {ar ? PAYMENT_STATUS_LABEL[p.status]?.ar ?? p.status : PAYMENT_STATUS_LABEL[p.status]?.en ?? p.status}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      <p className="text-sm">{p.user.name}</p>
                      <p className="text-xs text-muted-foreground" dir="ltr">{p.user.phone ?? p.user.email ?? ""}</p>
                    </TableCell>
                    <TableCell className="max-w-44">
                      {p.matter ? (
                        <Link href={`/admin/matters/${p.matter.id}`} className="text-sm hover:underline">
                          {p.matter.title}
                        </Link>
                      ) : (
                        <span className="text-xs text-muted-foreground">—</span>
                      )}
                    </TableCell>
                    <TableCell className="text-xs text-muted-foreground">
                      {new Date(p.createdAt).toLocaleDateString(ar ? "ar-JO" : "en-US")}
                      {p.paidAt ? ` · ${ar ? "دفعت" : "paid"} ${new Date(p.paidAt).toLocaleDateString(ar ? "ar-JO" : "en-US")}` : ""}
                    </TableCell>
                    <TableCell className="text-end">
                      <div className="flex items-center justify-end gap-1">
                        {p.status === "PENDING" && (
                          <Button size="sm" variant="outline" disabled={updating === p.id} onClick={() => patchStatus(p, "PAID")} className="h-8 gap-1">
                            {updating === p.id ? <Loader2 className="h-3 w-3 animate-spin" /> : <CheckCircle2 className="h-3 w-3" />}
                            {ar ? "مدفوع" : "Mark paid"}
                          </Button>
                        )}
                        <Dialog open={edit?.id === p.id} onOpenChange={(o) => !o && setEdit(null)}>
                          <DialogTrigger asChild>
                            <Button variant="ghost" size="sm" onClick={() => { setEdit(p); setEditStatus(p.status); setEditDesc(p.description ?? ""); }} aria-label="Edit">
                              <Pencil className="h-3.5 w-3.5" />
                            </Button>
                          </DialogTrigger>
                          <DialogContent>
                            <DialogHeader>
                              <DialogTitle>{ar ? "تحديث الدفعة" : "Update payment"}</DialogTitle>
                              <DialogDescription>
                                {p.user.name} · {p.amountJOD} JOD
                                {p.providerRef ? ` · ${p.providerRef}` : ""}
                              </DialogDescription>
                            </DialogHeader>
                            <div className="space-y-4">
                              <div className="space-y-2">
                                <label className="text-sm font-medium">{ar ? "الحالة" : "Status"}</label>
                                <Select value={editStatus} onValueChange={setEditStatus}>
                                  <SelectTrigger><SelectValue /></SelectTrigger>
                                  <SelectContent>
                                    {STATUSES.map((s) => (
                                      <SelectItem key={s} value={s}>{ar ? PAYMENT_STATUS_LABEL[s].ar : PAYMENT_STATUS_LABEL[s].en}</SelectItem>
                                    ))}
                                  </SelectContent>
                                </Select>
                              </div>
                              <div className="space-y-2">
                                <label className="text-sm font-medium">{ar ? "الوصف" : "Description"}</label>
                                <Input value={editDesc} onChange={(e) => setEditDesc(e.target.value)} />
                              </div>
                            </div>
                            <DialogFooter>
                              <Button onClick={saveEdit} disabled={updating === p.id} className="gap-2">
                                {updating === p.id && <Loader2 className="h-4 w-4 animate-spin" />}
                                {ar ? "حفظ" : "Save"}
                              </Button>
                            </DialogFooter>
                          </DialogContent>
                        </Dialog>
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
