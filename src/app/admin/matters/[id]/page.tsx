"use client";

import { useCallback, useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import Link from "next/link";
import { useLocale } from "@/lib/locale-provider";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Separator } from "@/components/ui/separator";
import {
  Loader2, ArrowLeft, ArrowRight, FileText, ListChecks, MessageSquare, Wallet, History,
  MapPin, Globe2, Gavel, ShieldAlert, User,
} from "lucide-react";
import { MATTER_STATUS_LABEL, PAYMENT_KIND_LABEL, PAYMENT_STATUS_LABEL, remoteLabel, type AdminMatter } from "@/lib/admin/ops";

interface Doc {
  id: string;
  fileName: string | null;
  status: string;
  uploadedAt: string | null;
}

interface Task {
  id: string;
  title: string;
  status: string;
}

interface TimelineEvent {
  id: string;
  type: string;
  description: string | null;
  createdAt: string;
}

interface Msg {
  id: string;
  body: string;
  senderId: string;
  createdAt: string;
}

export default function AdminMatterDetailPage() {
  const params = useParams<{ id: string }>();
  const router = useRouter();
  const { locale } = useLocale();
  const ar = locale === "ar";

  const [matter, setMatter] = useState<AdminMatter | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch(`/api/legal/matters/${params.id}`, { cache: "no-store" });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "load_failed");
      setMatter(data.matter ?? null);
    } catch (e) {
      setError(e instanceof Error ? e.message : "unknown");
    } finally {
      setLoading(false);
    }
  }, [params.id]);

  useEffect(() => {
    load();
  }, [load]);

  if (loading) {
    return <div className="flex justify-center py-20"><Loader2 className="h-8 w-8 animate-spin text-muted-foreground" /></div>;
  }

  if (error || !matter) {
    return (
      <div className="mx-auto max-w-2xl py-20">
        <Card>
          <CardContent className="py-12 text-center">
            <ShieldAlert className="mx-auto h-10 w-10 text-muted-foreground" />
            <h2 className="mt-3 text-lg font-bold">{ar ? "لا يمكن عرض القضية" : "Cannot view matter"}</h2>
            <p className="mt-1 text-sm text-muted-foreground">{error ?? "not_found"}</p>
            <Button className="mt-4" variant="outline" onClick={() => router.push("/admin/matters")}>
              {ar ? "عودة للقضايا" : "Back to matters"}
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  const docs = (matter as unknown as { documents?: Doc[] }).documents ?? [];
  const tasks = (matter as unknown as { tasks?: Task[] }).tasks ?? [];
  const timeline = (matter as unknown as { timelineEvents?: TimelineEvent[] }).timelineEvents ?? [];
  const conversations = (matter as unknown as { conversations?: { id: string; messages?: Msg[] }[] }).conversations ?? [];
  const messages = conversations[0]?.messages ?? [];
  const payments = (matter as unknown as { payments?: { id: string; amountJOD: number; kind: string; status: string; description: string | null; createdAt: string }[] }).payments ?? [];

  const status = MATTER_STATUS_LABEL[matter.status] ?? { ar: matter.status, en: matter.status };

  return (
    <div className="space-y-4">
      <Button variant="ghost" size="sm" onClick={() => router.push("/admin/matters")} className="gap-1 text-muted-foreground">
        {ar ? <ArrowRight className="h-4 w-4" /> : <ArrowLeft className="h-4 w-4" />}
        {ar ? "القضايا" : "Matters"}
      </Button>

      <Card>
        <CardHeader>
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div>
              <CardTitle className="text-xl">{matter.title}</CardTitle>
              <CardDescription className="mt-1 flex flex-wrap items-center gap-2">
                {matter.legalService && (
                  <span>{ar ? matter.legalService.nameAr : matter.legalService.nameEn}</span>
                )}
                <Badge>{ar ? status.ar : status.en}</Badge>
                <Badge variant={matter.remoteEligibility === "fully_remote" ? "success" : matter.remoteEligibility === "in_person_required" ? "destructive" : "secondary"}>
                  <Globe2 className="me-1 h-3 w-3" />
                  {remoteLabel(matter.remoteEligibility, ar)}
                </Badge>
                {matter.progressPercent != null && (
                  <Badge variant="outline">{matter.progressPercent}%</Badge>
                )}
              </CardDescription>
            </div>
            <Link href={`/matters/${matter.id}`} className="text-sm text-muted-foreground hover:underline">
              {ar ? "عرض كموكل ↗" : "View as client ↗"}
            </Link>
          </div>
        </CardHeader>
        <CardContent className="grid gap-4 text-sm sm:grid-cols-2 lg:grid-cols-4">
          <div className="space-y-1">
            <p className="flex items-center gap-1 text-xs font-semibold text-muted-foreground"><User className="h-3.5 w-3.5" />{ar ? "الموكل" : "Client"}</p>
            {matter.client ? (
              <>
                <p className="font-medium">{matter.client.name}</p>
                <p className="text-xs text-muted-foreground" dir="ltr">{matter.client.phone}</p>
                <p className="text-xs text-muted-foreground" dir="ltr">{matter.client.email}</p>
                {matter.client.currentCountry && (
                  <p className="flex items-center gap-1 text-xs text-muted-foreground"><MapPin className="h-3 w-3" />{matter.client.currentCountry}</p>
                )}
              </>
            ) : (
              <p className="text-muted-foreground">—</p>
            )}
          </div>
          <div className="space-y-1">
            <p className="flex items-center gap-1 text-xs font-semibold text-muted-foreground"><Gavel className="h-3.5 w-3.5" />{ar ? "المحامي" : "Lawyer"}</p>
            {matter.lawyer ? (
              <>
                <p className="font-medium">{matter.lawyer.user.name}</p>
                <p className="text-xs text-muted-foreground" dir="ltr">{matter.lawyer.user.phone}</p>
                <p className="text-xs text-muted-foreground" dir="ltr">{matter.lawyer.user.email}</p>
              </>
            ) : (
              <p className="text-muted-foreground">{ar ? "غير مسند" : "Not assigned"}</p>
            )}
          </div>
          <div className="space-y-1">
            <p className="text-xs font-semibold text-muted-foreground">{ar ? "الخدمة" : "Service"}</p>
            <p className="font-medium">{matter.legalService ? (ar ? matter.legalService.nameAr : matter.legalService.nameEn) : "—"}</p>
            <p className="text-xs text-muted-foreground">{matter.clientStatus ?? ""}</p>
          </div>
          <div className="space-y-1">
            <p className="text-xs font-semibold text-muted-foreground">{ar ? "البيانات" : "Meta"}</p>
            <p className="text-xs text-muted-foreground">{ar ? "أنشئت" : "Created"}: {new Date(matter.createdAt).toLocaleDateString(ar ? "ar-JO" : "en-US")}</p>
            <p className="text-xs text-muted-foreground">{matter.id.slice(0, 8)}…</p>
          </div>
        </CardContent>
      </Card>

      <Tabs defaultValue="documents">
        <TabsList className="grid w-full grid-cols-5">
          <TabsTrigger value="documents" className="gap-1"><FileText className="h-3.5 w-3.5" />{ar ? "مستندات" : "Docs"} ({docs.length})</TabsTrigger>
          <TabsTrigger value="tasks" className="gap-1"><ListChecks className="h-3.5 w-3.5" />{ar ? "مهام" : "Tasks"} ({tasks.length})</TabsTrigger>
          <TabsTrigger value="timeline" className="gap-1"><History className="h-3.5 w-3.5" />{ar ? "سجل" : "Timeline"} ({timeline.length})</TabsTrigger>
          <TabsTrigger value="messages" className="gap-1"><MessageSquare className="h-3.5 w-3.5" />{ar ? "رسائل" : "Messages"} ({messages.length})</TabsTrigger>
          <TabsTrigger value="payments" className="gap-1"><Wallet className="h-3.5 w-3.5" />{ar ? "دفعات" : "Payments"} ({payments.length})</TabsTrigger>
        </TabsList>

        <TabsContent value="documents">
          <Card>
            <CardContent className="pt-6">
              {docs.length === 0 ? (
                <p className="py-6 text-center text-sm text-muted-foreground">{ar ? "لا مستندات." : "No documents."}</p>
              ) : (
                <div className="space-y-2">
                  {docs.map((d) => (
                    <div key={d.id} className="flex items-center justify-between gap-2 text-sm">
                      <span className="truncate">{d.fileName ?? d.id.slice(0, 12)}</span>
                      <div className="flex shrink-0 items-center gap-2">
                        <Badge variant="outline" className="text-xs">{d.status}</Badge>
                        <span className="text-xs text-muted-foreground">
                          {d.uploadedAt ? new Date(d.uploadedAt).toLocaleDateString(ar ? "ar-JO" : "en-US") : ""}
                        </span>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="tasks">
          <Card>
            <CardContent className="pt-6">
              {tasks.length === 0 ? (
                <p className="py-6 text-center text-sm text-muted-foreground">{ar ? "لا مهام." : "No tasks."}</p>
              ) : (
                <ul className="space-y-1.5">
                  {tasks.map((t) => (
                    <li key={t.id} className="flex items-center justify-between gap-2 text-sm">
                      <span>{t.title}</span>
                      <Badge variant={t.status === "completed" ? "success" : "secondary"} className="text-xs">{t.status}</Badge>
                    </li>
                  ))}
                </ul>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="timeline">
          <Card>
            <CardContent className="pt-6">
              {timeline.length === 0 ? (
                <p className="py-6 text-center text-sm text-muted-foreground">{ar ? "لا أحداث." : "No events."}</p>
              ) : (
                <div className="space-y-3">
                  {timeline.map((e) => (
                    <div key={e.id} className="flex items-start justify-between gap-2 text-sm">
                      <div>
                        <Badge variant="outline" className="mb-1 text-[10px]">{e.type}</Badge>
                        {e.description && <p>{e.description}</p>}
                      </div>
                      <span className="shrink-0 text-xs text-muted-foreground">
                        {new Date(e.createdAt).toLocaleString(ar ? "ar-JO" : "en-US")}
                      </span>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="messages">
          <Card>
            <CardContent className="pt-6">
              {messages.length === 0 ? (
                <p className="py-6 text-center text-sm text-muted-foreground">{ar ? "لا رسائل." : "No messages."}</p>
              ) : (
                <div className="space-y-3">
                  {messages.map((msg) => (
                    <div key={msg.id} className="rounded-md border p-3">
                      <p className="text-sm">{msg.body}</p>
                      <p className="mt-1 text-xs text-muted-foreground">
                        {msg.senderId === matter.client?.id ? (ar ? "الموكل" : "Client") : msg.senderId} · {new Date(msg.createdAt).toLocaleString(ar ? "ar-JO" : "en-US")}
                      </p>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="payments">
          <Card>
            <CardContent className="pt-6">
              {payments.length === 0 ? (
                <p className="py-6 text-center text-sm text-muted-foreground">{ar ? "لا دفعات." : "No payments."}</p>
              ) : (
                <div className="space-y-2">
                  {payments.map((p) => (
                    <div key={p.id} className="flex items-center justify-between gap-2 text-sm">
                      <div>
                        <span className="font-medium">{p.amountJOD} JOD</span>
                        <span className="text-muted-foreground"> · {ar ? PAYMENT_KIND_LABEL[p.kind]?.ar ?? p.kind : PAYMENT_KIND_LABEL[p.kind]?.en ?? p.kind}</span>
                        {p.description && <p className="text-xs text-muted-foreground">{p.description}</p>}
                      </div>
                      <Badge variant={p.status === "PAID" ? "success" : p.status === "PENDING" ? "warning" : "secondary"} className="text-xs">
                        {ar ? PAYMENT_STATUS_LABEL[p.status]?.ar ?? p.status : PAYMENT_STATUS_LABEL[p.status]?.en ?? p.status}
                      </Badge>
                    </div>
                  ))}
                </div>
              )}
              <Separator className="my-4" />
              <Link href={`/admin/payments`} className="text-sm text-primary hover:underline">
                {ar ? "إدارة المدفوعات ←" : "Manage payments →"}
              </Link>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
