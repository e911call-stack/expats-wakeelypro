"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { useLocale } from "@/lib/locale-provider";
import { useSession } from "@/lib/session-provider";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Alert, AlertDescription } from "@/components/ui/alert";
import {
  Bell, Loader2, CheckCheck, MessageSquare, FileText, Gavel, CreditCard,
  ShieldCheck, Clock, Users,
} from "lucide-react";

type Notification = {
  id: string;
  kind: string;
  title: string;
  body: string | null;
  link: string | null;
  readAt: string | null;
  createdAt: string;
};

const KIND_ICON: Record<string, React.ComponentType<{ className?: string }>> = {
  new_message: MessageSquare,
  document_uploaded: FileText,
  matter_status_changed: Clock,
  task_completed: CheckCheck,
  task_assigned: CheckCheck,
  payment_received: CreditCard,
  deadline_approaching: Clock,
  lawyer_assigned: Gavel,
  matched_lawyer: Users,
};

export default function NotificationsPage() {
  const { locale } = useLocale();
  const { user, loading: sessionLoading } = useSession();
  const ar = locale === "ar";
  const [items, setItems] = useState<Notification[]>([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [loading, setLoading] = useState(true);
  const [markingAll, setMarkingAll] = useState(false);

  const load = useCallback(async () => {
    try {
      const res = await fetch("/api/notifications", { cache: "no-store" });
      const d = await res.json();
      setItems(d.notifications ?? []);
      setUnreadCount(d.unreadCount ?? 0);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    if (user) load();
    else setLoading(false);
  }, [user, load]);

  async function markOne(id: string) {
    await fetch(`/api/notifications/${id}/read`, { method: "PATCH" });
    setItems((prev) => prev.map((n) => n.id === id ? { ...n, readAt: new Date().toISOString() } : n));
    setUnreadCount((c) => Math.max(0, c - 1));
  }

  async function markAll() {
    setMarkingAll(true);
    try {
      await fetch("/api/notifications/read-all", { method: "POST" });
      setItems((prev) => prev.map((n) => ({ ...n, readAt: n.readAt ?? new Date().toISOString() })));
      setUnreadCount(0);
    } finally {
      setMarkingAll(false);
    }
  }

  if (sessionLoading) {
    return <div className="container mx-auto px-4 py-16"><div className="flex justify-center"><Loader2 className="h-8 w-8 animate-spin text-muted-foreground" /></div></div>;
  }

  if (!user) {
    return (
      <div className="container mx-auto px-4 py-16">
        <Card className="mx-auto max-w-md">
          <CardContent className="py-8 text-center">
            <Bell className="mx-auto h-10 w-10 text-muted-foreground" />
            <h2 className="mt-3 text-lg font-bold">{ar ? "تسجيل الدخول مطلوب" : "Sign in required"}</h2>
            <p className="mt-1 text-sm text-muted-foreground">
              {ar ? "سجّل الدخول بحساب تجريبي لرؤية إشعاراتك." : "Sign in with a demo account to see your notifications."}
            </p>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="container mx-auto px-4 py-8 lg:py-12">
      <div className="mx-auto max-w-2xl">
        <div className="mb-6 flex flex-wrap items-center justify-between gap-4">
          <div>
            <Badge variant="secondary" className="mb-2 gap-1">
              <Bell className="h-3 w-3" />
              {ar ? "الإشعارات" : "Notifications"}
            </Badge>
            <h1 className="text-2xl font-bold sm:text-3xl">
              {ar ? "إشعاراتك" : "Your notifications"}
            </h1>
            <p className="mt-1 text-sm text-muted-foreground">
              {unreadCount > 0
                ? (ar ? `لديك ${unreadCount} إشعار غير مقروء` : `You have ${unreadCount} unread notification(s)`)
                : (ar ? "لا إشعارات غير مقروءة" : "No unread notifications")}
            </p>
          </div>
          {unreadCount > 0 && (
            <Button variant="outline" size="sm" onClick={markAll} disabled={markingAll} className="gap-2">
              {markingAll ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <CheckCheck className="h-3.5 w-3.5" />}
              {ar ? "تعليم الكل كمقروء" : "Mark all as read"}
            </Button>
          )}
        </div>

        {loading ? (
          <div className="flex justify-center py-16"><Loader2 className="h-8 w-8 animate-spin text-muted-foreground" /></div>
        ) : items.length === 0 ? (
          <Card><CardContent className="py-12 text-center">
            <Bell className="mx-auto h-10 w-10 text-muted-foreground" />
            <h2 className="mt-3 text-sm font-semibold">{ar ? "لا إشعارات بعد" : "No notifications yet"}</h2>
            <p className="mt-1 text-xs text-muted-foreground">
              {ar ? "ستظهر هنا الإشعارات الجديدة." : "New notifications will appear here."}
            </p>
          </CardContent></Card>
        ) : (
          <div className="space-y-2">
            {items.map((n) => {
              const Icon = KIND_ICON[n.kind] ?? Bell;
              const isUnread = !n.readAt;
              return (
                <Card
                  key={n.id}
                  className={isUnread ? "border-primary/40 bg-primary/5" : ""}
                >
                  <CardContent className="pt-4">
                    <div className="flex items-start gap-3">
                      <div className={`grid h-9 w-9 flex-shrink-0 place-items-center rounded-lg ${isUnread ? "bg-primary text-primary-foreground" : "bg-muted text-muted-foreground"}`}>
                        <Icon className="h-4 w-4" />
                      </div>
                      <div className="min-w-0 flex-1">
                        <div className="flex items-start justify-between gap-2">
                          <p className={`text-sm ${isUnread ? "font-bold" : "font-medium"}`}>{n.title}</p>
                          <span className="flex-shrink-0 text-[10px] text-muted-foreground">
                            {new Date(n.createdAt).toLocaleString(ar ? "ar-JO" : "en-US")}
                          </span>
                        </div>
                        {n.body && <p className="mt-1 text-xs text-muted-foreground leading-5">{n.body}</p>}
                        <div className="mt-2 flex items-center gap-2">
                          {n.link && (
                            <Link href={n.link}>
                              <Button size="sm" variant="outline" className="h-6 text-[11px]">
                                {ar ? "عرض" : "View"}
                              </Button>
                            </Link>
                          )}
                          {isUnread && (
                            <Button size="sm" variant="ghost" onClick={() => markOne(n.id)} className="h-6 text-[11px]">
                              {ar ? "تعليم كمقروء" : "Mark as read"}
                            </Button>
                          )}
                        </div>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
