import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export function formatDate(date: Date | string, locale: "ar" | "en" = "ar") {
  const d = typeof date === "string" ? new Date(date) : date;
  return new Intl.DateTimeFormat(locale === "ar" ? "ar-JO" : "en-US", {
    year: "numeric",
    month: "long",
    day: "numeric",
  }).format(d);
}

export function formatRelativeTime(date: Date | string, locale: "ar" | "en" = "ar") {
  const d = typeof date === "string" ? new Date(date) : date;
  const diffMs = Date.now() - d.getTime();
  const diffMin = Math.floor(diffMs / 60000);
  const diffHr = Math.floor(diffMin / 60);
  const diffDay = Math.floor(diffHr / 24);
  const rtf = new Intl.RelativeTimeFormat(locale === "ar" ? "ar-JO" : "en-US", { numeric: "auto" });
  if (diffMin < 1) return locale === "ar" ? "الآن" : "just now";
  if (diffMin < 60) return rtf.format(-diffMin, "minute");
  if (diffHr < 24) return rtf.format(-diffHr, "hour");
  if (diffDay < 30) return rtf.format(-diffDay, "day");
  return formatDate(d, locale);
}

export function formatJOD(amount: number, locale: "ar" | "en" = "ar") {
  return new Intl.NumberFormat(locale === "ar" ? "ar-JO" : "en-US", {
    style: "currency",
    currency: "JOD",
    minimumFractionDigits: 0,
  }).format(amount);
}
