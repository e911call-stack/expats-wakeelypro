"use client";

import { createContext, useContext, useEffect, useState, type ReactNode } from "react";

export type Locale = "ar" | "en";

interface LocaleCtx {
  locale: Locale;
  setLocale: (l: Locale) => void;
  t: (key: string) => string;
  dir: "rtl" | "ltr";
}

const Ctx = createContext<LocaleCtx | null>(null);

const DICT: Record<Locale, Record<string, string>> = {
  ar: {
    "app.name": "الخدمات القانونية الأردنية للمغتربين",
    "app.tagline": "أنجز معاملاتك القانونية في الأردن من أي مكان في العالم",
    "nav.home": "الرئيسية",
    "nav.services": "الخدمات",
    "nav.matters": "قضاياي",
    "nav.lawyer": "لوحة المحامي",
    "nav.signin": "تسجيل الدخول",
    "nav.signout": "تسجيل الخروج",
    "cta.start": "أحتاج لإنجاز معاملة في الأردن",
    "cta.browse": "تصفح الخدمات",
    "cta.createMatter": "إنشاء قضية",
    "common.loading": "جارٍ التحميل…",
    "common.error": "حدث خطأ",
    "common.save": "حفظ",
    "common.cancel": "إلغاء",
    "common.back": "رجوع",
    "common.next": "التالي",
    "common.previous": "السابق",
    "common.required": "مطلوب",
    "common.optional": "اختياري",
    "auth.signin.title": "تسجيل الدخول",
    "auth.signin.phone": "رقم الهاتف",
    "auth.signin.sendCode": "أرسل رمز التحقق",
    "auth.signin.code": "رمز التحقق",
    "auth.signin.verify": "تأكيد",
    "auth.signin.phonePlaceholder": "+962790000000",
    "auth.signin.codePlaceholder": "123456",
  },
  en: {
    "app.name": "Jordan Legal Services for Expats",
    "app.tagline": "Get your legal matters done in Jordan from anywhere in the world",
    "nav.home": "Home",
    "nav.services": "Services",
    "nav.matters": "My Matters",
    "nav.lawyer": "Lawyer Dashboard",
    "nav.signin": "Sign in",
    "nav.signout": "Sign out",
    "cta.start": "I need to handle something in Jordan",
    "cta.browse": "Browse services",
    "cta.createMatter": "Create a matter",
    "common.loading": "Loading…",
    "common.error": "An error occurred",
    "common.save": "Save",
    "common.cancel": "Cancel",
    "common.back": "Back",
    "common.next": "Next",
    "common.previous": "Previous",
    "common.required": "Required",
    "common.optional": "Optional",
    "auth.signin.title": "Sign in",
    "auth.signin.phone": "Phone number",
    "auth.signin.sendCode": "Send verification code",
    "auth.signin.code": "Verification code",
    "auth.signin.verify": "Verify",
    "auth.signin.phonePlaceholder": "+962790000000",
    "auth.signin.codePlaceholder": "123456",
  },
};

export function LocaleProvider({ children, initial = "ar" }: { children: ReactNode; initial?: Locale }) {
  const [locale, setLocaleState] = useState<Locale>(initial);

  useEffect(() => {
    const saved = (typeof window !== "undefined" && localStorage.getItem("ewp.locale")) as Locale | null;
    if (saved === "ar" || saved === "en") setLocaleState(saved);
  }, []);

  const setLocale = (l: Locale) => {
    setLocaleState(l);
    if (typeof window !== "undefined") localStorage.setItem("ewp.locale", l);
  };

  const dir = locale === "ar" ? "rtl" : "ltr";

  useEffect(() => {
    if (typeof document !== "undefined") {
      document.documentElement.lang = locale;
      document.documentElement.dir = dir;
    }
  }, [locale, dir]);

  const t = (key: string) => DICT[locale][key] ?? DICT.en[key] ?? key;

  return <Ctx.Provider value={{ locale, setLocale, t, dir }}>{children}</Ctx.Provider>;
}

export function useLocale(): LocaleCtx {
  const v = useContext(Ctx);
  if (!v) {
    return {
      locale: "ar",
      setLocale: () => {},
      t: (k: string) => DICT.ar[k] ?? k,
      dir: "rtl" as const,
    };
  }
  return v;
}
