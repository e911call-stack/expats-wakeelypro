import { requireAdmin } from "@/lib/require-admin";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";

function masked(value: string | undefined): string {
  if (!value) return "Not set";
  if (value.length <= 8) return `${value.slice(0, 2)}***`;
  return `${value.slice(0, 4)}…${value.slice(-2)}`;
}

export default async function AdminSettingsPage() {
  await requireAdmin();

  const checks = [
    {
      key: "DATABASE_URL",
      configured: Boolean(process.env.DATABASE_URL),
      labelEn: "Database (PostgreSQL / Supabase)",
      labelAr: "قاعدة البيانات (بوستجرس / سوبابيس)",
    },
    {
      key: "JWT_SECRET",
      configured: Boolean(process.env.JWT_SECRET),
      labelEn: "JWT signing secret",
      labelAr: "مفتاح توقيع JWT",
    },
    {
      key: "TWILIO_ACCOUNT_SID",
      configured: Boolean(process.env.TWILIO_ACCOUNT_SID),
      labelEn: "Twilio SMS (OTP)",
      labelAr: "رسائل Twilio (رمز التحقق)",
    },
    {
      key: "SUPABASE_URL",
      configured: Boolean(process.env.SUPABASE_URL),
      labelEn: "Supabase Storage",
      labelAr: "تخزين سوبابيس",
    },
  ];

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between gap-2">
        <div>
          <h1 className="text-2xl font-bold">Settings</h1>
          <p className="text-sm text-muted-foreground" dir="rtl">
            إعدادات المنصة
          </p>
        </div>
        <Badge variant="secondary">Coming next</Badge>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Environment checks / فحص البيئة</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          {checks.map((c) => (
            <div
              key={c.key}
              className="flex flex-wrap items-center justify-between gap-2 rounded-md border px-3 py-2"
            >
              <div>
                <p className="text-sm font-medium">
                  {c.labelEn} · {c.labelAr}
                </p>
                <p className="font-mono text-xs text-muted-foreground">
                  {c.key} = {c.configured ? masked(process.env[c.key]) : "—"}
                </p>
              </div>
              {c.configured ? (
                <Badge variant="success">Configured</Badge>
              ) : (
                <Badge variant="destructive">Not set</Badge>
              )}
            </div>
          ))}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Operational checklist / قائمة التشغيل</CardTitle>
        </CardHeader>
        <CardContent className="text-sm text-muted-foreground space-y-1">
          <ul className="list-disc ps-5 space-y-1">
            <li>Promote your account to ADMIN (see ADMIN.md / PROMOTE_ADMIN.sql).</li>
            <li>Sign out and sign in again so the JWT role refreshes.</li>
            <li>Verify the dashboard counts match the database.</li>
          </ul>
          <p dir="rtl">
            جرّب ترقية حسابك إلى مشرف (ADMIN) ثم سجّل الدخول مرة أخرى لتحديث الدور في JWT.
          </p>
        </CardContent>
      </Card>
    </div>
  );
}
