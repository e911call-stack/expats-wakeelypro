import "server-only";
import { prisma } from "@/lib/db";
import type { LegalService, LegalProcedure, RemoteEligibility } from "@prisma/client";

/**
 * Phase 1 AI Service Recommender — STRICT CATALOG MATCHING.
 *
 * The AI must NEVER invent a service that does not exist in the LegalService
 * catalog. This rule-based matcher:
 * 1. Tokenizes the user's text.
 * 2. Scores each active LegalService by keyword overlap with its name/description/code.
 * 3. Returns the top match — or null (no match) rather than inventing.
 *
 * Returns: { service, procedure, score, matchedKeywords, remoteEligibility, documentSlugs }
 */
export interface ServiceRecommendation {
  service: LegalService;
  procedure: LegalProcedure | null;
  score: number;
  matchedKeywords: string[];
  remoteEligibility: RemoteEligibility;
  remoteEligibilityReasonAr: string | null;
  remoteEligibilityReasonEn: string | null;
  documentSlugs: { slug: string; nameAr: string; nameEn: string; isRequired: boolean }[];
  confidence: number; // 0..1
}

// Bilingual keyword map. Each service has a set of trigger keywords in AR and EN.
const KEYWORDS: Record<string, { ar: string[]; en: string[] }> = {
  "property-sale-from-abroad": {
    ar: ["بيع عقار", "بيع العقار", "عقار", "أرض", "شقة", "فيلا", "سند ملكية", "نقل ملكية", "تسجيل عقار", "دائرة الأراضي", "بيع من الخارج"],
    en: [
      "property sale", "sell property", "sell my house", "sell my apartment", "sell my land",
      "apartment sale", "land sale", "villa sale",
      "title deed", "transfer ownership", "register property", "land department", "sell from abroad",
      // Single-word triggers
      "apartment", "villa", "property",
    ],
  },
  "power-of-attorney": {
    ar: ["توكيل", "وكالة", "وكيل", "توكيل رسمي", "كاتب العدل", "وكالة قضائية", "وكالة عامة", "وكالة خاصة"],
    en: ["power of attorney", "poa", "notary", "authorize", "agent", "judicial poa", "general poa", "specific poa", "notarized"],
  },
  "inheritance-initiation": {
    ar: ["ميراث", "إرث", "تركة", "متوفى", "وفاة", "حصر إرث", "ورثة", "محكمة الشريعة", "تقسيم تركة", "صك حصر إرث"],
    en: ["inheritance", "estate", "deceased", "death", "heirs", "sharia court", "estate distribution", "inheritance certificate", "succession"],
  },
  "civil-status-update": {
    ar: ["أحوال مدنية", "قيد عائلي", "ولادة", "تسجيل ولادة", "تسجيل وفاة", "دفتر العائلة", "تصحيح قيد", "السفارة الأردنية"],
    en: ["civil status", "family register", "birth registration", "death registration", "family book", "civil record", "embassy registration"],
  },
  "company-formation": {
    ar: ["تأسيس شركة", "شركة", "ذات مسؤولية محدودة", "مساهمة", "مراقب الشركات", "تسجيل شركة", "رقم وطني", "غرفة التجارة"],
    en: ["company formation", "incorporate", "LLC", "limited liability", "public shareholding", "companies control", "register company", "national number", "chamber of commerce"],
  },
  "court-representation": {
    ar: ["محكمة", "قضية", "دعوى", "لائحة", "مذكرة", "جلسة", "صلح", "بداية", "استئناف", "تمييز", "تمثيل قضائي", "محامي للقضية", "وكالة قضائية"],
    en: ["court", "lawsuit", "litigation", "case", "pleading", "hearing", "magistrates", "first instance", "appeal", "cassation", "legal representation", "judicial case"],
  },
  "document-authentication": {
    ar: [
      "تصديق مستندات", "تصديق المستندات", "تصديق وثيقة", "تصديق وثائق",
      "تصديق شهادة", "تصديق شهاد",
      "تصديق إفادة", "تصديق درجة علمية", "تصديق شهادة جامعية", "تصديق شهادتي الجامعية",
      "تصديق وكالة", "تصديق عقد", "تصديق حكم قضائي", "تصديق شهادة ميلاد",
      "تصديق شهادة وفاة", "تصديق عقد زواج",
      "تصديقات", "وزارة الخارجية", "تصديق خارجية",
      "أبوستيل", "أبوسطيل", "apostille",
      "ترجمة محلفة", "ترجمة قانونية",
      "تصديق للخارج", "استخدام في الخارج",
      "تصديق", "توثيق",
    ],
    en: [
      "document authentication", "authenticate document", "authenticate my document",
      "authenticate degree", "authenticate my degree", "degree authentication",
      "authenticate certificate", "certificate authentication",
      "authenticate birth certificate", "authenticate death certificate",
      "authenticate marriage certificate", "authenticate power of attorney",
      "authenticate contract", "authenticate court judgment",
      "document legalization", "legalize document", "legalization",
      "sworn translation", "certified translation",
      "notarize document", "notarization",
      "ministry of foreign affairs", "mfa authentication", "mfa jordan",
      "use abroad", "use in abroad", "for use abroad", "for use in",
      "embassy authentication", "embassy legalization",
      "attest document", "attestation",
      "authenticate", "authentication", "legalize", "legalization",
      "apostille", "attest", "attestation", "notarize", "notarization",
    ],
  },
};

/**
 * Score a single text against the catalog.
 * Returns null if no service has at least one keyword match.
 */
export async function recommendService(text: string): Promise<ServiceRecommendation | null> {
  const cleaned = text.trim();
  if (cleaned.length < 5) return null;

  const lower = cleaned.toLowerCase();

  // Pre-compile word-boundary regexes for short single-word English keywords (cached)
  const wordBoundaryCache = new Map<string, RegExp>();
  function wordMatch(kw: string): boolean {
    const isShortSingleWord = !kw.includes(" ") && kw.length <= 12;
    if (!isShortSingleWord) {
      return lower.includes(kw.toLowerCase());
    }
    let re = wordBoundaryCache.get(kw);
    if (!re) {
      re = new RegExp(`\\b${kw.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")}\\b`, "i");
      wordBoundaryCache.set(kw, re);
    }
    return re.test(lower);
  }

  // Score each service
  const scores: { serviceSlug: string; score: number; matched: string[] }[] = [];
  for (const [slug, kws] of Object.entries(KEYWORDS)) {
    let score = 0;
    const matched: string[] = [];
    for (const ar of kws.ar) {
      if (cleaned.includes(ar)) {
        score += ar.length > 5 ? 3 : 2;
        matched.push(ar);
      }
    }
    for (const en of kws.en) {
      if (wordMatch(en)) {
        score += en.length > 5 ? 3 : 2;
        matched.push(en);
      }
    }
    if (score > 0) scores.push({ serviceSlug: slug, score, matched });
  }

  scores.sort((a, b) => b.score - a.score);
  const top = scores[0];
  if (!top) return null;

  const service = await prisma.legalService.findUnique({
    where: { slug: top.serviceSlug },
    include: {
      procedures: true,
      documentRequirements: { orderBy: { sortOrder: "asc" } },
    },
  });
  if (!service) return null;

  const procedure = service.procedures[0] ?? null;
  const remoteEligibility = procedure?.remoteEligibility ?? service.defaultRemoteEligibility;
  const reasonAr = procedure?.remoteEligibilityReasonAr ?? null;
  const reasonEn = procedure?.remoteEligibilityReasonEn ?? null;

  const documentSlugs = service.documentRequirements.map((d) => ({
    slug: d.slug,
    nameAr: d.nameAr,
    nameEn: d.nameEn,
    isRequired: d.isRequired,
  }));

  const confidence = Math.min(1, top.score / 10);

  return {
    service,
    procedure,
    score: top.score,
    matchedKeywords: top.matched,
    remoteEligibility,
    remoteEligibilityReasonAr: reasonAr,
    remoteEligibilityReasonEn: reasonEn,
    documentSlugs,
    confidence,
  };
}

/**
 * Strict helper: returns true only if the LegalProcedure says fully_remote.
 * The AI must NEVER claim a matter can be completed fully remotely unless this is true.
 */
export function canCompleteFullyRemote(p: { remoteEligibility: RemoteEligibility } | null): boolean {
  return p?.remoteEligibility === "fully_remote";
}

/**
 * Bilingual labels for the RemoteEligibility enum.
 */
export function remoteEligibilityLabel(re: RemoteEligibility, locale: "ar" | "en"): { label: string; tone: "success" | "warning" | "danger" | "neutral" } {
  switch (re) {
    case "fully_remote":
      return { label: locale === "ar" ? "قابل للإنجاز عن بُعد بالكامل" : "Fully remote eligible", tone: "success" };
    case "partially_remote":
      return { label: locale === "ar" ? "قابل للإنجاز جزئياً عن بُعد" : "Partially remote eligible", tone: "warning" };
    case "in_person_required":
      return { label: locale === "ar" ? "يتطلب حضوراً شخصياً" : "In-person presence required", tone: "danger" };
    case "unknown":
      return { label: locale === "ar" ? "غير محدد" : "Unknown", tone: "neutral" };
  }
}
