"use client";

import { Suspense, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { useLocale } from "@/lib/locale-provider";
import { useSession } from "@/lib/session-provider";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { ArrowLeft, ArrowRight, Loader2, Phone, KeyRound, ShieldCheck } from "lucide-react";

type Step = "phone" | "code" | "verifying";

export default function SignInPage() {
  return (
    <Suspense fallback={<div className="container mx-auto px-4 py-16"><div className="flex justify-center"><Loader2 className="h-8 w-8 animate-spin text-muted-foreground" /></div></div>}>
      <SignInForm />
    </Suspense>
  );
}

function SignInForm() {
  const router = useRouter();
  const search = useSearchParams();
  const { locale } = useLocale();
  const { refresh } = useSession();
  const ar = locale === "ar";

  const [step, setStep] = useState<Step>("phone");
  const [phone, setPhone] = useState("");
  const [code, setCode] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [devCode, setDevCode] = useState<string | null>(null);

  const redirect = search.get("redirect") || "/";

  async function sendCode() {
    if (!phone || !/^\+[1-9]\d{6,14}$/.test(phone)) {
      setError(ar ? "رقم هاتف غير صالح. استخدم صيغة E.164 مثل +962790000000" : "Invalid phone. Use E.164 format like +962790000000");
      return;
    }
    setError(null);
    setStep("verifying");
    try {
      const res = await fetch("/api/auth/otp/request", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ phone }),
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data.message || data.error || "unknown_error");
        setStep("phone");
        return;
      }
      if (data.devCode) {
        // Dev mode: code is returned (no SMS provider configured)
        setDevCode(data.devCode);
      }
      setStep("code");
    } catch (e) {
      setError(e instanceof Error ? e.message : "network_error");
      setStep("phone");
    }
  }

  async function verifyCode() {
    if (!code || code.length < 4) {
      setError(ar ? "الرمز غير صالح" : "Invalid code");
      return;
    }
    setError(null);
    setStep("verifying");
    try {
      const res = await fetch("/api/auth/otp/verify", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ phone, code }),
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data.error === "invalid_code"
          ? (ar ? "رمز غير صحيح أو منتهي الصلاحية" : "Invalid or expired code")
          : (data.message || data.error || "unknown_error"));
        setStep("code");
        return;
      }
      await refresh();
      router.push(redirect);
    } catch (e) {
      setError(e instanceof Error ? e.message : "network_error");
      setStep("code");
    }
  }

  return (
    <div className="container mx-auto px-4 py-16">
      <div className="mx-auto max-w-md">
        <Card>
          <CardHeader>
            <div className="mb-2 grid h-12 w-12 place-items-center rounded-xl bg-primary text-primary-foreground">
              <ShieldCheck className="h-6 w-6" />
            </div>
            <CardTitle className="text-xl">{ar ? "تسجيل الدخول" : "Sign in"}</CardTitle>
            <CardDescription>
              {ar
                ? "أدخل رقم هاتفك لتصلك رسالة نصية برمز التحقق"
                : "Enter your phone number to receive a verification code via SMS"}
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            {step === "phone" && (
              <div className="space-y-3">
                <div>
                  <Label htmlFor="phone">{ar ? "رقم الهاتف" : "Phone number"}</Label>
                  <div className="relative mt-1">
                    <Phone className="absolute start-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                    <Input
                      id="phone"
                      type="tel"
                      value={phone}
                      onChange={(e) => setPhone(e.target.value)}
                      placeholder="+962790000000"
                      className="ps-9"
                      autoFocus
                    />
                  </div>
                </div>
                {error && <Alert variant="destructive"><AlertDescription>{error}</AlertDescription></Alert>}
                <Button onClick={sendCode} className="w-full gap-2">
                  {ar ? "أرسل الرمز" : "Send code"}
                  {ar ? <ArrowLeft className="h-4 w-4" /> : <ArrowRight className="h-4 w-4" />}
                </Button>
              </div>
            )}

            {step === "code" && (
              <div className="space-y-3">
                <div>
                  <Label htmlFor="code">{ar ? "رمز التحقق" : "Verification code"}</Label>
                  <div className="relative mt-1">
                    <KeyRound className="absolute start-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                    <Input
                      id="code"
                      type="text"
                      inputMode="numeric"
                      pattern="[0-9]*"
                      maxLength={6}
                      value={code}
                      onChange={(e) => setCode(e.target.value.replace(/\D/g, ""))}
                      placeholder="123456"
                      className="ps-9 text-center text-lg tracking-widest"
                      autoFocus
                    />
                  </div>
                </div>
                {devCode && (
                  <Alert>
                    <AlertDescription className="text-xs">
                      <strong>Dev mode:</strong> Your code is <code className="rounded bg-muted px-2 py-0.5 font-mono">{devCode}</code>
                      (Configure Twilio env vars to send real SMS.)
                    </AlertDescription>
                  </Alert>
                )}
                {error && <Alert variant="destructive"><AlertDescription>{error}</AlertDescription></Alert>}
                <Button onClick={verifyCode} className="w-full gap-2">
                  {ar ? "تأكيد" : "Verify"}
                </Button>
                <Button variant="ghost" onClick={() => setStep("phone")} className="w-full text-xs">
                  {ar ? "تغيير رقم الهاتف" : "Change phone number"}
                </Button>
              </div>
            )}

            {step === "verifying" && (
              <div className="flex flex-col items-center gap-3 py-8">
                <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
                <p className="text-sm text-muted-foreground">{ar ? "جارٍ المعالجة…" : "Processing…"}</p>
              </div>
            )}
          </CardContent>
        </Card>

        <p className="mt-4 text-center text-xs text-muted-foreground">
          {ar
            ? "بالتسجيل، أنت توافق على شروط الخدمة وسياسة الخصوصية."
            : "By signing in, you agree to the Terms of Service and Privacy Policy."}
        </p>
      </div>
    </div>
  );
}
