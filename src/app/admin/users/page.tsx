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
import { Loader2, RefreshCw, Search, ShieldAlert, ShieldCheck, Gavel, User } from "lucide-react";
import { fmtDate, ROLE_LABEL, type AdminUser } from "@/lib/admin/ops";

const ROLES = ["CITIZEN", "LAWYER", "ADMIN"];

const ROLE_TONE: Record<string, "default" | "secondary" | "destructive"> = {
  ADMIN: "destructive",
  LAWYER: "default",
  CITIZEN: "secondary",
};

export default function AdminUsersPage() {
  const { locale } = useLocale();
  const ar = locale === "ar";
  const { toast } = useToast();

  const [users, setUsers] = useState<AdminUser[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [role, setRole] = useState("");
  const [updating, setUpdating] = useState<string | null>(null);
  const [edit, setEdit] = useState<AdminUser | null>(null);
  const [editRole, setEditRole] = useState("CITIZEN");
  const [editVerified, setEditVerified] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams();
      if (search.trim()) params.set("search", search.trim());
      if (role) params.set("role", role);
      const res = await fetch(`/api/admin/users?${params.toString()}`, { cache: "no-store" });
      const data = await res.json();
      if (res.ok) setUsers(data.users ?? []);
      else toast({ title: ar ? "فشل تحميل المستخدمين" : "Failed to load users", variant: "destructive" });
    } finally {
      setLoading(false);
    }
  }, [search, role, ar, toast]);

  useEffect(() => {
    load();
  }, [load]);

  async function patch(id: string, body: Record<string, unknown>, okMsg: string) {
    const res = await fetch(`/api/admin/users/${id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    });
    const data = await res.json();
    if (!res.ok) throw new Error(data.error || data.message || "failed");
    toast({ title: okMsg });
    await load();
  }

  async function toggleVerified(u: AdminUser) {
    setUpdating(u.id);
    try {
      await patch(u.id, { isVerified: !u.isVerified }, ar ? "تم تحديث التوثيق" : "Verification updated");
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
      await patch(edit.id, { role: editRole, isVerified: editVerified }, ar ? "تم الحفظ" : "Saved");
      setEdit(null);
    } catch {
      toast({ title: ar ? "فشل الحفظ" : "Save failed", variant: "destructive" });
    } finally {
      setUpdating(null);
    }
  }

  const admins = users.filter((u) => u.role === "ADMIN").length;
  const lawyers = users.filter((u) => u.role === "LAWYER").length;

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div>
          <h1 className="text-2xl font-bold">{ar ? "المستخدمون" : "Users"}</h1>
          <p className="text-sm text-muted-foreground" dir="rtl">
            {ar ? "إدارة الأدوار والتوثيق" : "Manage roles and verification"}
          </p>
        </div>
        <Button variant="outline" size="sm" onClick={load} disabled={loading} className="gap-2">
          <RefreshCw className={`h-3.5 w-3.5 ${loading ? "animate-spin" : ""}`} />
          {ar ? "تحديث" : "Refresh"}
        </Button>
      </div>

      <div className="grid gap-3 sm:grid-cols-3">
        <Card><CardContent className="py-4">
          <p className="text-xs text-muted-foreground">{ar ? "الإجمالي" : "Total"}</p>
          <p className="mt-1 text-2xl font-bold">{users.length}</p>
        </CardContent></Card>
        <Card><CardContent className="py-4">
          <p className="flex items-center gap-1 text-xs text-muted-foreground"><Gavel className="h-3 w-3" />{ar ? "محامون" : "Lawyers"}</p>
          <p className="mt-1 text-2xl font-bold">{lawyers}</p>
        </CardContent></Card>
        <Card><CardContent className="py-4">
          <p className="flex items-center gap-1 text-xs text-muted-foreground"><ShieldCheck className="h-3 w-3" />{ar ? "مشرفون" : "Admins"}</p>
          <p className="mt-1 text-2xl font-bold">{admins}</p>
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
              placeholder={ar ? "بحث بالاسم / الهاتف / البريد" : "Search name / phone / email"}
              className="ps-9"
            />
          </div>
          <Select value={role} onValueChange={setRole}>
            <SelectTrigger className="w-40"><SelectValue placeholder={ar ? "الدور" : "Role"} /></SelectTrigger>
            <SelectContent>
              <SelectItem value="all">{ar ? "كل الأدوار" : "All roles"}</SelectItem>
              {ROLES.map((r) => (
                <SelectItem key={r} value={r}>{ar ? ROLE_LABEL[r].ar : ROLE_LABEL[r].en}</SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Button variant="outline" size="sm" onClick={load}>{ar ? "تطبيق" : "Apply"}</Button>
        </CardContent>
      </Card>

      {loading ? (
        <div className="flex justify-center py-16"><Loader2 className="h-8 w-8 animate-spin text-muted-foreground" /></div>
      ) : users.length === 0 ? (
        <Card><CardContent className="py-12 text-center text-sm text-muted-foreground">
          {ar ? "لا يوجد مستخدمون مطابقون." : "No matching users."}
        </CardContent></Card>
      ) : (
        <Card>
          <CardContent className="overflow-x-auto pt-4">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>{ar ? "المستخدم" : "User"}</TableHead>
                  <TableHead>{ar ? "الدور" : "Role"}</TableHead>
                  <TableHead>{ar ? "توثيق" : "Verified"}</TableHead>
                  <TableHead>{ar ? "قضايا" : "Matters"}</TableHead>
                  <TableHead>{ar ? "دفعات" : "Payments"}</TableHead>
                  <TableHead>{ar ? "تاريخ الإنشاء" : "Created"}</TableHead>
                  <TableHead className="text-end">{ar ? "إجراءات" : "Actions"}</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {users.map((u) => (
                  <TableRow key={u.id}>
                    <TableCell>
                      <p className="font-medium">{u.name}</p>
                      <p className="text-xs text-muted-foreground" dir="ltr">{u.phone}{u.email ? ` · ${u.email}` : ""}</p>
                      {u.currentCountry && <p className="text-xs text-muted-foreground">{u.currentCountry}{u.clientStatus ? ` · ${u.clientStatus}` : ""}</p>}
                    </TableCell>
                    <TableCell>
                      <Badge variant={ROLE_TONE[u.role] ?? "secondary"} className="gap-1">
                        {u.role === "ADMIN" ? <ShieldAlert className="h-3 w-3" /> : u.role === "LAWYER" ? <Gavel className="h-3 w-3" /> : <User className="h-3 w-3" />}
                        {ar ? ROLE_LABEL[u.role]?.ar ?? u.role : ROLE_LABEL[u.role]?.en ?? u.role}
                      </Badge>
                      {u.lawyerProfile && (
                        <p className="mt-1 text-[10px] text-muted-foreground" dir="ltr">
                          Bar {u.lawyerProfile.barNumber ?? "—"} · {u.lawyerProfile.verified ? "verified" : "unverified"}
                        </p>
                      )}
                    </TableCell>
                    <TableCell>
                      <Switch
                        checked={u.isVerified}
                        disabled={updating === u.id}
                        onCheckedChange={() => toggleVerified(u)}
                        aria-label="Verified"
                      />
                    </TableCell>
                    <TableCell className="text-xs">
                      {u.mattersCount > 0 ? (
                        <Link href={`/admin/matters?client=${u.id}`} className="hover:underline">{u.mattersCount}</Link>
                      ) : (
                        "0"
                      )}
                    </TableCell>
                    <TableCell className="text-xs">{u.paymentsCount}</TableCell>
                    <TableCell className="text-xs text-muted-foreground">{fmtDate(u.createdAt)}</TableCell>
                    <TableCell className="text-end">
                      <AlertDialog>
                        <AlertDialogTrigger asChild>
                          <Button variant="outline" size="sm" onClick={() => { setEdit(u); setEditRole(u.role); setEditVerified(u.isVerified); }}>
                            {ar ? "تعديل الدور" : "Edit role"}
                          </Button>
                        </AlertDialogTrigger>
                        <AlertDialogContent>
                          <AlertDialogHeader>
                            <AlertDialogTitle>{ar ? "تعديل المستخدم" : "Edit user"} — {u.name}</AlertDialogTitle>
                            <AlertDialogDescription>
                              <div className="space-y-4 pt-2">
                                <div className="space-y-2">
                                  <label className="text-sm font-medium">{ar ? "الدور" : "Role"}</label>
                                  <Select value={editRole} onValueChange={setEditRole}>
                                    <SelectTrigger><SelectValue /></SelectTrigger>
                                    <SelectContent>
                                      {ROLES.map((r) => (
                                        <SelectItem key={r} value={r}>{ar ? ROLE_LABEL[r].ar : ROLE_LABEL[r].en}</SelectItem>
                                      ))}
                                    </SelectContent>
                                  </Select>
                                </div>
                                <div className="flex items-center gap-2">
                                  <Switch id="user-verified" checked={editVerified} onCheckedChange={setEditVerified} />
                                  <label htmlFor="user-verified" className="text-sm">{ar ? "حساب موثّق" : "Verified account"}</label>
                                </div>
                              </div>
                            </AlertDialogDescription>
                          </AlertDialogHeader>
                          <AlertDialogFooter>
                            <AlertDialogCancel>{ar ? "إلغاء" : "Cancel"}</AlertDialogCancel>
                            <AlertDialogAction onClick={saveEdit} disabled={updating === u.id} className="gap-2">
                              {updating === u.id && <Loader2 className="h-4 w-4 animate-spin" />}
                              {ar ? "حفظ" : "Save"}
                            </AlertDialogAction>
                          </AlertDialogFooter>
                        </AlertDialogContent>
                      </AlertDialog>
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
