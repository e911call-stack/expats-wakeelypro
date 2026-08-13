import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { requireRole } from "@/lib/session-server";

export const runtime = "nodejs";

/**
 * POST /api/admin/seed
 *
 * Seeds the database with Phase 1 legal services data.
 * Idempotent - safe to call multiple times.
 * ADMIN only.
 */
export async function POST() {
  const auth = await requireRole("ADMIN");
  if ("status" in auth) return NextResponse.json({ error: auth.status === 401 ? "unauthorized" : "forbidden" }, { status: auth.status });
  const session = auth.session;

  try {
    const results = await seedDatabase();
    return NextResponse.json({ 
      success: true, 
      message: "Database seeded successfully",
      ...results 
    });
  } catch (error) {
    console.error("Seed error:", error);
    return NextResponse.json(
      { success: false, error: "Failed to seed database" },
      { status: 500 }
    );
  }
}

/**
 * GET /api/admin/seed
 * Returns current database status (counts of records)
 * ADMIN only.
 */
export async function GET() {
  const auth = await requireRole("ADMIN");
  if ("status" in auth) return NextResponse.json({ error: auth.status === 401 ? "unauthorized" : "forbidden" }, { status: auth.status });
  const session = auth.session;
  try {
    const [servicesCount, practiceAreasCount, sourcesCount] = await Promise.all([
      prisma.legalService.count({ where: { isActive: true } }),
      prisma.practiceArea.count({ where: { isActive: true } }),
      prisma.officialSource.count({ where: { isActive: true } }),
    ]);

    return NextResponse.json({
      status: "ok",
      counts: {
        services: servicesCount,
        practiceAreas: practiceAreasCount,
        officialSources: sourcesCount,
      },
      needsSeeding: servicesCount === 0,
    });
  } catch (error) {
    return NextResponse.json(
      { success: false, error: "Failed to get database status" },
      { status: 500 }
    );
  }
}

// ─────────────────────────────────────────────────────────────────────────────
// SEED FUNCTIONS
// ─────────────────────────────────────────────────────────────────────────────

async function seedDatabase() {
  // 1. Upsert Practice Areas
  const practiceAreas = await upsertPracticeAreas();
  
  // 2. Upsert Official Sources
  const officialSources = await upsertOfficialSources();
  
  // 3. Create Legal Services with Procedures + Documents
  const services = await upsertLegalServices(practiceAreas, officialSources);

  return {
    practiceAreas: Object.keys(practiceAreas).length,
    officialSources: Object.keys(officialSources).length,
    services: services.length,
  };
}

async function upsertPracticeAreas() {
  const areas = [
    { slug: "real-estate-sale-abroad", ar: "بيع العقار من الخارج", en: "Property Sale from Abroad", descAr: "بيع العقار الأردني من قبل مالك موجود خارج الأردن.", descEn: "Sale of Jordanian property by an owner located abroad.", parent: "real-estate" },
    { slug: "document-authentication", ar: "تصديق المستندات", en: "Document Authentication", descAr: "تصديق الوثائق الأردنية لاستخدامها في الخارج، أو تصديق الوثائق الأجنبية لاستخدامها في الأردن.", descEn: "Authentication of Jordanian documents for use abroad, or foreign documents for use in Jordan." },
  ];

  const bySlug: Record<string, { id: string }> = {};
  
  for (const a of areas) {
    let parentId: string | null = null;
    if (a.parent) {
      const existing = await prisma.practiceArea.findUnique({ where: { slug: a.parent }, select: { id: true } });
      parentId = existing?.id ?? null;
    }
    
    const created = await prisma.practiceArea.upsert({
      where: { slug: a.slug },
      update: { nameAr: a.ar, nameEn: a.en, descriptionAr: a.descAr, descriptionEn: a.descEn, parentId },
      create: { slug: a.slug, nameAr: a.ar, nameEn: a.en, descriptionAr: a.descAr, descriptionEn: a.descEn, parentId, isActive: true, sortOrder: 0 },
    });
    bySlug[a.slug] = created;
  }
  
  return bySlug;
}

async function upsertOfficialSources() {
  const sources = [
    { slug: "land-dept-jordan", nameAr: "دائرة الأراضي والمساحة", nameEn: "Jordan Department of Lands and Survey", url: "https://www.dls.gov.jo", authorityType: "land_dept", notesAr: "المرجع الرسمي لتسجيل نقل ملكية العقارات في الأردن.", notesEn: "Official authority for registering property transfers in Jordan." },
    { slug: "notary-public-jordan", nameAr: "كاتب العدل — وزارة العدل", nameEn: "Notary Public — Ministry of Justice", url: "https://www.moj.gov.jo", authorityType: "notary", notesAr: "توثيق التوكيلات والإقرارات الرسمية.", notesEn: "Notarization of powers of attorney and official declarations." },
    { slug: "civil-status-dept", nameAr: "دائرة الأحوال المدنية والجوازات", nameEn: "Civil Status and Passports Department", url: "https://www.cspd.gov.jo", authorityType: "civil_status", notesAr: "إصدار الأحوال المدنية، إثبات القيد العائلي والولادة والوفاة.", notesEn: "Civil status records, family register, birth and death registration." },
    { slug: "companies-control", nameAr: "مراقب الشركات — وزارة الصناعة والتجارة", nameEn: "Companies Control Department", url: "https://www.ccd.gov.jo", authorityType: "companies_ctrl", notesAr: "تأسيس الشركات وتسجيلها والإشراف عليها في الأردن.", notesEn: "Incorporation, registration and supervision of companies in Jordan." },
    { slug: "sharia-court", nameAr: "محاكم الشريعة", nameEn: "Sharia Courts", url: "https://www.sda.gov.jo", authorityType: "court", notesAr: "القضايا الأسرية وقضايا المواريث.", notesEn: "Family and inheritance cases." },
    { slug: "magistrates-court", nameAr: "محاكم الصلح", nameEn: "Magistrates Courts", url: "https://www.moj.gov.jo", authorityType: "court", notesAr: "الدعاوى المدنية الصغيرة ومنازعات الإيجار.", notesEn: "Small civil claims and landlord-tenant disputes." },
    { slug: "mfa-jordan", nameAr: "وزارة الخارجية الأردنية — قسم التصديقات", nameEn: "Jordanian MFA — Authentications Dept", url: "https://www.mfa.gov.jo", authorityType: "ministry", notesAr: "تصديق الوثائق الأردنية لاستخدامها في الخارج.", notesEn: "Authentication of Jordanian documents for use abroad." },
  ];

  const bySlug: Record<string, { id: string }> = {};
  
  for (const s of sources) {
    const created = await prisma.officialSource.upsert({
      where: { slug: s.slug },
      update: { nameAr: s.nameAr, nameEn: s.nameEn, url: s.url, authorityType: s.authorityType, notesAr: s.notesAr, notesEn: s.notesEn },
      create: { slug: s.slug, nameAr: s.nameAr, nameEn: s.nameEn, url: s.url, authorityType: s.authorityType, notesAr: s.notesAr, notesEn: s.notesEn, isActive: true },
    });
    bySlug[s.slug] = created;
  }
  
  return bySlug;
}

type DocReq = {
  slug: string; nameAr: string; nameEn: string; descAr?: string; descEn?: string;
  isRequired?: boolean; provider?: string; stage?: string;
  acceptsDigital?: boolean; requiresOriginal?: boolean; requiresNotarization?: boolean; requiresApostille?: boolean;
};

type ServiceDef = {
  slug: string; code: string; nameAr: string; nameEn: string; shortAr: string; shortEn: string;
  descriptionAr: string; descriptionEn: string; practiceAreaSlug?: string | null;
  remoteEligibility: "fully_remote" | "partially_remote" | "in_person_required";
  platformFee: number; lawyerFeeMin: number; lawyerFeeMax: number;
  govtFee: number; govtFeeNoteAr?: string; govtFeeNoteEn?: string;
  durationDays: number; isFeatured?: boolean; sortOrder: number;
  procedure: {
    slug: string; nameAr: string; nameEn: string;
    remoteEligibility: "fully_remote" | "partially_remote" | "in_person_required";
    reasonAr: string; reasonEn: string;
    physicalSteps: { ar: string; en: string }[];
    remoteSteps: { ar: string; en: string }[];
    authorityAr?: string; authorityEn?: string;
    durationDays: number;
  };
  docs: DocReq[];
  officialSourceSlugs: string[];
};

async function upsertLegalServices(
  practiceAreas: Record<string, { id: string }>,
  officialSources: Record<string, { id: string }>
) {
  const SERVICES: ServiceDef[] = [
    // 1. PROPERTY SALE FROM ABROAD
    {
      slug: "property-sale-from-abroad", code: "JO-PROP-SALE-ABROAD",
      nameAr: "بيع العقار من الخارج", nameEn: "Property Sale from Abroad",
      shortAr: "بيع عقارك في الأردن وأنت خارج البلد.", shortEn: "Sell your Jordanian property while you are abroad.",
      descriptionAr: "خدمة متكاملة لبيع العقارات الأردنية من قبل ملاك يقيمون خارج الأردن. تشمل إعداد وكالة خاصة بعقد البيع، التحقق من سند الملكية، إعداد عقد البيع، إجراء الكشف العاجل، وتسجيل نقل الملكية في دائرة الأراضي.",
      descriptionEn: "End-to-end service for selling Jordanian property by owners residing abroad. Includes preparing a sale-specific power of attorney, verifying the title deed, drafting the sale contract, ordering the urgent clearance, and registering the transfer at the Department of Lands and Survey.",
      practiceAreaSlug: "real-estate-sale-abroad",
      remoteEligibility: "partially_remote",
      platformFee: 50, lawyerFeeMin: 400, lawyerFeeMax: 1200, govtFee: 0,
      govtFeeNoteAr: "رسوم دائرة الأراضي تُدفع مباشرة للدائرة وتشمل رسوم التسجيل والكشف والطوابع. لا تشملها منصتنا.",
      govtFeeNoteEn: "Department of Lands fees are paid directly to the department. They are NOT included in our platform quote.",
      durationDays: 45, isFeatured: true, sortOrder: 1,
      procedure: {
        slug: "property-sale-poa-route", nameAr: "إجراء بيع العقار عبر الوكالة", nameEn: "Property Sale via Power of Attorney",
        remoteEligibility: "partially_remote",
        reasonAr: "يمكن إنجاز معظم الخطوات عن بُعد عبر وكالة رسمية موثقة. لكن إصدار الوكالة يستلزم حضور الموكل شخصياً لدى كاتب العدل الأردني في السفارة أو القنصلية.",
        reasonEn: "Most steps can be done remotely via an authenticated power of attorney. However, issuing the POA requires the principal to appear in person before a Jordanian notary at an embassy/consulate.",
        physicalSteps: [
          { ar: "إصدار الوكالة الخاصة بعقد البيع لدى كاتب العدل أو السفارة الأردنية.", en: "Issuing the sale-specific POA before a notary or Jordanian embassy." },
          { ar: "تصديق الوكالة من وزارة الخارجية الأردنية إذا صدرت من الخارج.", en: "Authentication of the POA by the Jordanian MFA if issued abroad." },
        ],
        remoteSteps: [
          { ar: "التحقق من سند الملكية والكشف عن الإشارات والارتباطات.", en: "Title deed verification and checking of encumbrances." },
          { ar: "إعداد مسودة عقد البيع ومشاركتها مع البائع والمشتري.", en: "Drafting and sharing the sale contract with seller and buyer." },
          { ar: "تنسيق الكشف العاجل على العقار.", en: "Scheduling the urgent property inspection." },
          { ar: "تسجيل نقل الملكية في دائرة الأراضي بواسطة المحامي الوكيل.", en: "Registering the transfer at the Department of Lands by the attorney-in-fact." },
          { ar: "تحويل حصيلة البيع إلى حساب البائع.", en: "Transferring sale proceeds to the seller's account." },
        ],
        authorityAr: "دائرة الأراضي والمساحة + كاتب العدل", authorityEn: "Department of Lands and Survey + Notary Public",
        durationDays: 45,
      },
      docs: [
        { slug: "title-deed", nameAr: "سند الملكية الأصلي", nameEn: "Original title deed", isRequired: true, provider: "client", stage: "at_intake", acceptsDigital: true, requiresOriginal: true },
        { slug: "sale-poa", nameAr: "وكالة رسمية خاصة بعقد البيع", nameEn: "Notarized sale-specific power of attorney", isRequired: true, provider: "client", stage: "at_filing", acceptsDigital: false, requiresOriginal: true, requiresNotarization: true, requiresApostille: true },
        { slug: "seller-id", nameAr: "نسخة عن هوية البائع الأردنية أو جواز السفر", nameEn: "Copy of seller's Jordanian ID or passport", isRequired: true, provider: "client", stage: "at_intake", acceptsDigital: true },
        { slug: "buyer-id", nameAr: "نسخة عن هوية المشتري أو جواز السفر", nameEn: "Copy of buyer's ID or passport", isRequired: true, provider: "lawyer", stage: "at_intake", acceptsDigital: true },
        { slug: "tax-clearance", nameAr: "براءة ذمة ضريبية", nameEn: "Tax clearance certificate", isRequired: true, provider: "authority", stage: "at_filing", acceptsDigital: true },
        { slug: "municipality-clearance", nameAr: "براءة ذمة بلدية", nameEn: "Municipality clearance", isRequired: false, provider: "authority", stage: "at_filing", acceptsDigital: true },
        { slug: "sale-contract-draft", nameAr: "مسودة عقد البيع", nameEn: "Draft sale contract", isRequired: true, provider: "lawyer", stage: "at_signing", acceptsDigital: true },
      ],
      officialSourceSlugs: ["land-dept-jordan", "notary-public-jordan"],
    },

    // 2. POWER OF ATTORNEY
    {
      slug: "power-of-attorney", code: "JO-POA-GENERAL",
      nameAr: "توكيل رسمي", nameEn: "Official Power of Attorney",
      shortAr: "إصدار توكيل رسمي للتصرف في الأردن.", shortEn: "Issue an official POA to act in Jordan.",
      descriptionAr: "خدمة إصدار توكيلات رسمية لدى كاتب العدل الأردني — سواء كانت عامة أو خاصة — بحيث يُمكن للوكيل التصرف في الإجراءات القضائية والإدارية والعقارية نيابةً عن الموكل.",
      descriptionEn: "Service for issuing official powers of attorney before a Jordanian notary — general or specific — enabling the agent to act in judicial, administrative and property matters on behalf of the principal.",
      practiceAreaSlug: null,
      remoteEligibility: "partially_remote",
      platformFee: 25, lawyerFeeMin: 100, lawyerFeeMax: 350, govtFee: 0,
      govtFeeNoteAr: "رسوم كاتب العدل ورسوم التصديق تُدفع مباشرة.", govtFeeNoteEn: "Notary fees and authentication fees are paid directly.",
      durationDays: 14, sortOrder: 2,
      procedure: {
        slug: "poa-standard-route", nameAr: "إجراء التوكيل الرسمي القياسي", nameEn: "Standard POA Procedure",
        remoteEligibility: "partially_remote",
        reasonAr: "لا يمكن إصدار التوكيل الرسمي إلا بحضور الموكل شخصياً أمام كاتب العدل الأردني، أو أمام السفارة الأردنية في الخارج ثم تصديقه من الخارجية.",
        reasonEn: "An official POA can only be issued with the principal appearing in person before a Jordanian notary, or before a Jordanian embassy abroad and then authenticated by the MFA.",
        physicalSteps: [
          { ar: "حضور الموكل شخصياً أمام كاتب العدل أو السفارة الأردنية.", en: "Principal appears in person before the notary or Jordanian embassy." },
          { ar: "تصديق الوكالة من وزارة الخارجية الأردنية إذا صدرت من السفارة.", en: "Authentication by the Jordanian MFA if issued by an embassy." },
        ],
        remoteSteps: [
          { ar: "استشارة المحامي لاختيار نوع الوكالة المناسب.", en: "Lawyer consultation to choose the right POA type." },
          { ar: "صياغة نص الوكالة.", en: "Drafting the POA text." },
          { ar: "تقديم الوكالة للجهات المستفيدة بعد إصدارها.", en: "Submitting the authenticated POA to relevant authorities." },
        ],
        authorityAr: "كاتب العدل / السفارة الأردنية", authorityEn: "Notary Public / Jordanian Embassy",
        durationDays: 14,
      },
      docs: [
        { slug: "principal-id", nameAr: "هوية الموكل", nameEn: "Principal's ID", isRequired: true, provider: "client", stage: "at_notary", acceptsDigital: true, requiresOriginal: true, requiresNotarization: true },
        { slug: "agent-id", nameAr: "هوية الوكيل", nameEn: "Agent's ID", isRequired: true, provider: "client", stage: "at_intake", acceptsDigital: true },
        { slug: "poa-purpose-letter", nameAr: "خطاب يوضح الغرض من الوكالة", nameEn: "Letter explaining the POA purpose", isRequired: false, provider: "client", stage: "at_intake", acceptsDigital: true },
      ],
      officialSourceSlugs: ["notary-public-jordan"],
    },

    // 3. INHERITANCE INITIATION
    {
      slug: "inheritance-initiation", code: "JO-INH-INIT",
      nameAr: "افتتاح تركة وميراث", nameEn: "Inheritance Estate Initiation",
      shortAr: "بدء إجراءات حصر الإرث وتوزيع التركة.", shortEn: "Start inheritance estate proceedings and distribution.",
      descriptionAr: "خدمة لافتتاح تركة المتوفى أمام محكمة الشريعة، تشمل تقديم طلب حصر الإرث، استخراج صك حصر الإرث، ثم تقسيم التركة بين الورثة الشرعيين.",
      descriptionEn: "Service to open a deceased's estate before the Sharia Court, including filing the inheritance inventory application, obtaining the inheritance certificate, then distributing the estate among the legal heirs.",
      practiceAreaSlug: null,
      remoteEligibility: "partially_remote",
      platformFee: 35, lawyerFeeMin: 250, lawyerFeeMax: 900, govtFee: 0,
      govtFeeNoteAr: "رسوم محكمة الشريعة ودائرة الأراضي تُدفع مباشرة.", govtFeeNoteEn: "Sharia Court and Department of Lands fees are paid directly.",
      durationDays: 60, sortOrder: 3,
      procedure: {
        slug: "inheritance-standard-route", nameAr: "إجراء حصر الإرث القياسي", nameEn: "Standard Inheritance Procedure",
        remoteEligibility: "partially_remote",
        reasonAr: "الورثة البالغون خارج الأردن يمكنهم إصدار توكيلات لدى السفارة الأردنية. إصدار صك حصر الإرث يحصل غيابياً. لكن تقسيم التركة يتطلب موافقات موثقة.",
        reasonEn: "Adult heirs abroad can issue POAs at the Jordanian embassy. The inheritance certificate is issued in absentia. However, estate distribution requires notarized consents.",
        physicalSteps: [
          { ar: "إصدار الورثة خارج الأردن لتوكيلات لدى السفارة.", en: "Heirs abroad issue POAs at the Jordanian embassy." },
          { ar: "تقديم طلب حصر الإرث لمحكمة الشريعة.", en: "Filing the inheritance inventory application at the Sharia Court." },
        ],
        remoteSteps: [
          { ar: "تجميع وثائق الوفاة وشهادات الميلاد والزواج.", en: "Collecting death, birth and marriage certificates." },
          { ar: "صياغة عريضة الطلب.", en: "Drafting the petition." },
          { ar: "إعداد مشروع تقسيم التركة بعد صدور صك حصر الإرث.", en: "Drafting the distribution plan after the inheritance certificate is issued." },
        ],
        authorityAr: "محكمة الشريعة + دائرة الأراضي", authorityEn: "Sharia Court + Department of Lands",
        durationDays: 60,
      },
      docs: [
        { slug: "death-certificate", nameAr: "شهادة الوفاة", nameEn: "Death certificate", isRequired: true, provider: "client", stage: "at_intake", acceptsDigital: true, requiresOriginal: false },
        { slug: "heir-birth-certificates", nameAr: "شهادات ميلاد الورثة", nameEn: "Birth certificates of heirs", isRequired: true, provider: "client", stage: "at_intake", acceptsDigital: true },
        { slug: "marriage-contract", nameAr: "عقد الزواج (إن وجد)", nameEn: "Marriage contract (if applicable)", isRequired: false, provider: "client", stage: "at_intake", acceptsDigital: true },
        { slug: "heir-ids", nameAr: "هويات الورثة أو جوازات سفرهم", nameEn: "IDs or passports of heirs", isRequired: true, provider: "client", stage: "at_intake", acceptsDigital: true },
        { slug: "property-documents", nameAr: "وثائق عقارات التركة إن وجدت", nameEn: "Estate property documents (if any)", isRequired: false, provider: "client", stage: "at_filing", acceptsDigital: true },
      ],
      officialSourceSlugs: ["sharia-court", "land-dept-jordan"],
    },

    // 4. CIVIL STATUS UPDATE
    {
      slug: "civil-status-update", code: "JO-CIV-UPDATE",
      nameAr: "تحديث قيد الأحوال المدنية", nameEn: "Civil Status Record Update",
      shortAr: "تحديث قيد عائلي أو ولادة أو وفاة في دائرة الأحوال المدنية.", shortEn: "Update family register, birth or death record at Civil Status Department.",
      descriptionAr: "خدمة لتحديث سجلات الأحوال المدنية في الأردن — تسجيل ولادة، تسجيل وفاة، تصحيح قيد عائلي.",
      descriptionEn: "Service for updating civil status records in Jordan — birth registration, death registration, family register correction.",
      practiceAreaSlug: null,
      remoteEligibility: "partially_remote",
      platformFee: 20, lawyerFeeMin: 80, lawyerFeeMax: 250, govtFee: 0,
      govtFeeNoteAr: "رسوم دائرة الأحوال المدنية تُدفع مباشرة.", govtFeeNoteEn: "Civil Status Department fees are paid directly.",
      durationDays: 14, sortOrder: 4,
      procedure: {
        slug: "civil-status-via-embassy", nameAr: "تحديث الأحوال عبر السفارة", nameEn: "Civil Status Update via Embassy",
        remoteEligibility: "partially_remote",
        reasonAr: "المواطنون الأردنيون في الخارج يمكنهم تسجيل الولادات والوفيات لدى السفارة الأردنية، التي تحولها إلى دائرة الأحوال المدنية.",
        reasonEn: "Jordanian citizens abroad can register births and deaths at the Jordanian embassy, which forwards them to the Civil Status Department.",
        physicalSteps: [
          { ar: "حضور مقدم الطلب أمام السفارة الأردنية في بلد الإقامة.", en: "Applicant appears before the Jordanian embassy in their country of residence." },
        ],
        remoteSteps: [
          { ar: "تحضير الوثائق الداعمة ومراجعتها مع محامٍ.", en: "Preparing supporting documents and reviewing with a lawyer." },
          { ar: "تعبئة استمارات السفارة.", en: "Filling embassy forms." },
          { ar: "متابعة الطلب مع دائرة الأحوال المدنية بعد إرسال السفارة.", en: "Following up with the Civil Status Department after embassy submission." },
        ],
        authorityAr: "دائرة الأحوال المدنية + السفارة الأردنية", authorityEn: "Civil Status Department + Jordanian Embassy",
        durationDays: 14,
      },
      docs: [
        { slug: "applicant-id", nameAr: "هوية مقدم الطلب", nameEn: "Applicant's ID", isRequired: true, provider: "client", stage: "at_intake", acceptsDigital: true },
        { slug: "birth-certificate-baby", nameAr: "شهادة ولادة من المستشفى (لتسجيل ولادة)", nameEn: "Hospital birth certificate (for birth registration)", isRequired: false, provider: "client", stage: "at_intake", acceptsDigital: true },
        { slug: "death-certificate-hospital", nameAr: "شهادة وفاة طبية (لتسجيل وفاة)", nameEn: "Medical death certificate (for death registration)", isRequired: false, provider: "client", stage: "at_intake", acceptsDigital: true },
        { slug: "family-book-copy", nameAr: "صورة عن دفتر العائلة", nameEn: "Copy of family book", isRequired: true, provider: "client", stage: "at_intake", acceptsDigital: true },
      ],
      officialSourceSlugs: ["civil-status-dept"],
    },

    // 5. COMPANY FORMATION
    {
      slug: "company-formation", code: "JO-CORP-FORM",
      nameAr: "تأسيس شركة أردنية", nameEn: "Jordanian Company Formation",
      shortAr: "تأسيس شركة ذات مسؤولية محدودة أو مساهمة في الأردن.", shortEn: "Incorporate an LLC or public shareholding company in Jordan.",
      descriptionAr: "خدمة لتأسيس الشركات الأردنية — اختيار الشكل القانوني، صياغة عقد التأسيس، الحصول على الموافقات الأمنية والبلدية، التسجيل لدى مراقب الشركات، الحصول على الرقم الوطني.",
      descriptionEn: "Service for incorporating Jordanian companies — choosing the legal form, drafting the articles of association, obtaining security and municipal approvals, registration with the Companies Control Department, obtaining the national number.",
      practiceAreaSlug: null,
      remoteEligibility: "partially_remote",
      platformFee: 40, lawyerFeeMin: 600, lawyerFeeMax: 1800, govtFee: 0,
      govtFeeNoteAr: "رسوم مراقب الشركات وغرفة التجارة تُدفع مباشرة.", govtFeeNoteEn: "Companies Control Department and Chamber of Commerce fees are paid directly.",
      durationDays: 30, sortOrder: 5,
      procedure: {
        slug: "llc-formation-standard", nameAr: "تأسيس شركة ذات مسؤولية محدودة", nameEn: "LLC Formation",
        remoteEligibility: "partially_remote",
        reasonAr: "المساهمون خارج الأردن يمكنهم إصدار توكيلات لدى السفارة. لكن حضور الشركاء أو وكلائهم الموثقين ضروري للتوقيع أمام مراقب الشركات.",
        reasonEn: "Shareholders abroad can issue POAs at the embassy. However, presence of partners or their authenticated agents is required for signing before the Companies Control Department.",
        physicalSteps: [
          { ar: "إصدار توكيلات الشركاء خارج الأردن لدى السفارة.", en: "Shareholders abroad issue POAs at the embassy." },
          { ar: "توقيع عقد التأسيس أمام مراقب الشركات.", en: "Signing the articles of association before the Companies Control Department." },
        ],
        remoteSteps: [
          { ar: "اختيار الاسم القانوني وحجزه.", en: "Choosing and reserving the legal name." },
          { ar: "صياغة عقد التأسيس والنظام الأساسي.", en: "Drafting the articles of association." },
          { ar: "تحضير الوثائق المالية والقانونية.", en: "Preparing financial and legal documents." },
          { ar: "متابعة التسجيل والحصول على الرقم الوطني.", en: "Following up registration and obtaining the national number." },
        ],
        authorityAr: "مراقب الشركات", authorityEn: "Companies Control Department",
        durationDays: 30,
      },
      docs: [
        { slug: "partner-ids", nameAr: "هويات جميع الشركاء", nameEn: "IDs of all partners/shareholders", isRequired: true, provider: "client", stage: "at_intake", acceptsDigital: true },
        { slug: "company-name-reservation", nameAr: "حجز اسم الشركة", nameEn: "Company name reservation", isRequired: true, provider: "lawyer", stage: "at_filing", acceptsDigital: true },
        { slug: "articles-of-association", nameAr: "عقد التأسيس والنظام الأساسي", nameEn: "Articles of association", isRequired: true, provider: "lawyer", stage: "at_signing", acceptsDigital: true },
        { slug: "lease-contract", nameAr: "عقد إيجار مقر الشركة", nameEn: "Office lease agreement", isRequired: true, provider: "client", stage: "at_filing", acceptsDigital: true },
      ],
      officialSourceSlugs: ["companies-control"],
    },

    // 6. COURT REPRESENTATION
    {
      slug: "court-representation", code: "JO-LIT-REP",
      nameAr: "تمثيل أمام المحاكم الأردنية", nameEn: "Representation before Jordanian Courts",
      shortAr: "تمثيل الموكل أمام محاكم الصلح أو البداية أو الاستئناف.", shortEn: "Represent the client before Magistrates, First Instance or Appeal courts.",
      descriptionAr: "خدمة تمثيل قانوني متكامل أمام المحاكم الأردنية — صياغة اللوائح، الحضور عن الموكل، إدارة الجلسات، تنفيذ الأحكام.",
      descriptionEn: "End-to-end legal representation before Jordanian courts — drafting pleadings, appearing on behalf of the client, managing hearings, enforcing judgments.",
      practiceAreaSlug: null,
      remoteEligibility: "partially_remote",
      platformFee: 50, lawyerFeeMin: 500, lawyerFeeMax: 5000, govtFee: 0,
      govtFeeNoteAr: "رسوم المحكمة ورسوم الترجمة المحلفة تُدفع مباشرة.", govtFeeNoteEn: "Court fees and sworn translation fees are paid directly.",
      durationDays: 180, sortOrder: 6,
      procedure: {
        slug: "litigation-poa-route", nameAr: "إجراء التقاضي عبر الوكالة", nameEn: "Litigation via POA",
        remoteEligibility: "partially_remote",
        reasonAr: "يمكن للمحامي الحضور عن الموكل في كل الجلسات عبر وكالة قضائية موثقة. الجلسات الأولى في القضايا الجزائية قد تتطلب حضور المتهم شخصياً.",
        reasonEn: "The lawyer can appear on behalf of the client in all hearings via a notarized judicial POA. Initial hearings in criminal cases may require the defendant's personal presence.",
        physicalSteps: [
          { ar: "إصدار وكالة قضائية لدى كاتب العدل أو السفارة الأردنية.", en: "Issuing a judicial POA before a notary or Jordanian embassy." },
        ],
        remoteSteps: [
          { ar: "تقديم الاستشارة الأولية وتقييم موقف القضية.", en: "Initial consultation and case assessment." },
          { ar: "صياغة لوائح الدعوى والردود.", en: "Drafting statements of claim and defense." },
          { ar: "إدارة الجلسات وتقديم المذكرات.", en: "Managing hearings and filing memoranda." },
          { ar: "تنفيذ الأحكام بعد صدورها.", en: "Enforcing judgments after issuance." },
        ],
        authorityAr: "محاكم الصلح / البداية / الاستئناف", authorityEn: "Magistrates / First Instance / Appeal Courts",
        durationDays: 180,
      },
      docs: [
        { slug: "client-id", nameAr: "هوية الموكل", nameEn: "Client's ID", isRequired: true, provider: "client", stage: "at_intake", acceptsDigital: true },
        { slug: "judicial-poa", nameAr: "وكالة قضائية موثقة", nameEn: "Notarized judicial power of attorney", isRequired: true, provider: "client", stage: "at_filing", acceptsDigital: false, requiresOriginal: true, requiresNotarization: true },
        { slug: "case-documents", nameAr: "وثائق القضية المتاحة", nameEn: "Available case documents", isRequired: true, provider: "client", stage: "at_intake", acceptsDigital: true },
      ],
      officialSourceSlugs: ["magistrates-court"],
    },

    // 7. DOCUMENT AUTHENTICATION
    {
      slug: "document-authentication", code: "JO-DOC-AUTH",
      nameAr: "تصديق المستندات", nameEn: "Document Authentication",
      shortAr: "تصديق الوثائق الأردنية للاستخدام في الخارج أو الأجنبية للاستخدام في الأردن.", shortEn: "Authenticate Jordanian documents for use abroad, or foreign documents for use in Jordan.",
      descriptionAr: "خدمة تصديق الوثائق الرسمية الأردنية (العقود، الشهادات، الوكالات، الأحكام القضائية، شهادات الميلاد والوفاة، وغيرها) لاستخدامها في الخارج عبر سلسلة التصديقات: كاتب العدل → وزارة العدل → وزارة الخارجية الأردنية → السفارة المعنية.",
      descriptionEn: "Service for authenticating official Jordanian documents (contracts, certificates, powers of attorney, court judgments, birth/death certificates, etc.) for use abroad via the authentication chain: Notary Public → Ministry of Justice → Jordanian MFA → relevant embassy.",
      practiceAreaSlug: "document-authentication",
      remoteEligibility: "partially_remote",
      platformFee: 30, lawyerFeeMin: 120, lawyerFeeMax: 450, govtFee: 0,
      govtFeeNoteAr: "رسوم كاتب العدل، وزارة العدل، وزارة الخارجية، والسفارة الأجنبية تُدفع مباشرة لكل جهة. لا تشملها منصتنا.",
      govtFeeNoteEn: "Notary, MOJ, MFA, and foreign embassy fees are paid directly to each authority. They are NOT included in our platform quote.",
      durationDays: 21, sortOrder: 7,
      procedure: {
        slug: "doc-auth-standard-chain", nameAr: "إجراء تصديق المستندات القياسي", nameEn: "Standard Document Authentication Chain",
        remoteEligibility: "partially_remote",
        reasonAr: "يمكن للمحامي الوكيل إنجاز جميع خطوات التصديق داخل الأردن عن بُعد عبر وكالة خاصة بالتصديق. لكن الوثيقة الأصلية يجب أن تكون متاحة في الأردن.",
        reasonEn: "An authorized lawyer can perform all in-Jordan authentication steps remotely via an authentication-specific POA. However, the original document must be available in Jordan.",
        physicalSteps: [
          { ar: "إصدار وكالة خاصة بالتصديق لدى كاتب العدل أو السفارة الأردنية.", en: "Issuing an authentication-specific POA before a notary or Jordanian embassy." },
          { ar: "شحن الوثيقة الأصلية إلى الأردن إذا كان الموكل في الخارج.", en: "Shipping the original document to Jordan if the client is abroad." },
        ],
        remoteSteps: [
          { ar: "استشارة المحامي لتحديد سلسلة التصديقات المطلوبة.", en: "Lawyer consultation to determine the required authentication chain." },
          { ar: "صياغة نص الوكالة الخاصة بالتصديق.", en: "Drafting the authentication-specific POA text." },
          { ar: "الترجمة المحلفة للوثيقة إذا لزم.", en: "Sworn translation of the document if required." },
          { ar: "إجراء التصديق لدى كاتب العدل.", en: "Authentication before the Notary Public." },
          { ar: "التصديق من وزارة العدل الأردنية.", en: "Authentication by the Jordanian Ministry of Justice." },
          { ar: "التصديق من وزارة الخارجية الأردنية.", en: "Authentication by the Jordanian Ministry of Foreign Affairs." },
          { ar: "التصديق من سفارة دولة الاستخدام في عمّان.", en: "Authentication by the destination country's embassy in Amman." },
          { ar: "إعادة شحن الوثيقة المصادق عليها إلى الموكل.", en: "Shipping the authenticated document back to the client." },
        ],
        authorityAr: "كاتب العدل → وزارة العدل → وزارة الخارجية → سفارة دولة الاستخدام", authorityEn: "Notary → Ministry of Justice → MFA → destination embassy",
        durationDays: 21,
      },
      docs: [
        { slug: "original-document", nameAr: "الوثيقة الأصلية المراد تصديقها", nameEn: "Original document to be authenticated", isRequired: true, provider: "client", stage: "at_intake", acceptsDigital: false, requiresOriginal: true },
        { slug: "copy-of-document", nameAr: "نسخة واضحة عن الوثيقة", nameEn: "Clear copy of the document", isRequired: true, provider: "client", stage: "at_intake", acceptsDigital: true },
        { slug: "id-of-owner", nameAr: "هوية صاحب الوثيقة", nameEn: "ID of the document owner", isRequired: true, provider: "client", stage: "at_intake", acceptsDigital: true },
        { slug: "auth-poa", nameAr: "وكالة خاصة بالتصديق", nameEn: "Authentication-specific POA", isRequired: true, provider: "client", stage: "at_filing", acceptsDigital: false, requiresOriginal: true, requiresNotarization: true },
        { slug: "translation-if-needed", nameAr: "ترجمة إذا لزم الأمر", nameEn: "Translation if required", isRequired: false, provider: "lawyer", stage: "at_filing", acceptsDigital: true },
      ],
      officialSourceSlugs: ["notary-public-jordan", "mfa-jordan"],
    },
  ];

  const createdServices: string[] = [];

  for (const svc of SERVICES) {
    const practiceAreaId = svc.practiceAreaSlug ? (practiceAreas[svc.practiceAreaSlug]?.id ?? null) : null;

    // Upsert service
    const service = await prisma.legalService.upsert({
      where: { slug: svc.slug },
      update: {
        code: svc.code, nameAr: svc.nameAr, nameEn: svc.nameEn,
        shortAr: svc.shortAr, shortEn: svc.shortEn,
        descriptionAr: svc.descriptionAr, descriptionEn: svc.descriptionEn,
        practiceAreaId,
        defaultRemoteEligibility: svc.remoteEligibility,
        platformFeeDefault: svc.platformFee,
        lawyerFeeMin: svc.lawyerFeeMin, lawyerFeeMax: svc.lawyerFeeMax,
        governmentFeeEstimate: svc.govtFee,
        governmentFeeNoteAr: svc.govtFeeNoteAr, governmentFeeNoteEn: svc.govtFeeNoteEn,
        typicalDurationDays: svc.durationDays,
        isFeatured: svc.isFeatured ?? false,
        sortOrder: svc.sortOrder,
        isActive: true,
      },
      create: {
        slug: svc.slug, code: svc.code, nameAr: svc.nameAr, nameEn: svc.nameEn,
        shortAr: svc.shortAr, shortEn: svc.shortEn,
        descriptionAr: svc.descriptionAr, descriptionEn: svc.descriptionEn,
        practiceAreaId,
        defaultRemoteEligibility: svc.remoteEligibility,
        platformFeeDefault: svc.platformFee,
        lawyerFeeMin: svc.lawyerFeeMin, lawyerFeeMax: svc.lawyerFeeMax,
        governmentFeeEstimate: svc.govtFee,
        governmentFeeNoteAr: svc.govtFeeNoteAr, governmentFeeNoteEn: svc.govtFeeNoteEn,
        typicalDurationDays: svc.durationDays,
        isFeatured: svc.isFeatured ?? false,
        sortOrder: svc.sortOrder,
        isActive: true,
      },
    });

    // Upsert procedure
    const proc = svc.procedure;
    await prisma.legalProcedure.upsert({
      where: { slug: proc.slug },
      update: {
        nameAr: proc.nameAr, nameEn: proc.nameEn,
        remoteEligibility: proc.remoteEligibility,
        remoteEligibilityReasonAr: proc.reasonAr,
        remoteEligibilityReasonEn: proc.reasonEn,
        physicalPresenceSteps: JSON.stringify(proc.physicalSteps),
        remoteSteps: JSON.stringify(proc.remoteSteps),
        authorityAr: proc.authorityAr, authorityEn: proc.authorityEn,
        estimatedDurationDays: proc.durationDays,
        sortOrder: 0,
      },
      create: {
        legalServiceId: service.id,
        slug: proc.slug, nameAr: proc.nameAr, nameEn: proc.nameEn,
        remoteEligibility: proc.remoteEligibility,
        remoteEligibilityReasonAr: proc.reasonAr,
        remoteEligibilityReasonEn: proc.reasonEn,
        physicalPresenceSteps: JSON.stringify(proc.physicalSteps),
        remoteSteps: JSON.stringify(proc.remoteSteps),
        authorityAr: proc.authorityAr, authorityEn: proc.authorityEn,
        estimatedDurationDays: proc.durationDays,
        sortOrder: 0,
      },
    });

    // Upsert document requirements
    for (const doc of svc.docs) {
      await prisma.legalDocumentRequirement.upsert({
        where: { legalServiceId_slug: { legalServiceId: service.id, slug: doc.slug } },
        update: {
          nameAr: doc.nameAr, nameEn: doc.nameEn,
          descriptionAr: doc.descAr, descriptionEn: doc.descEn,
          isRequired: doc.isRequired ?? true,
          provider: doc.provider ?? "client",
          stage: doc.stage ?? "at_intake",
          acceptsDigital: doc.acceptsDigital ?? true,
          requiresOriginal: doc.requiresOriginal ?? false,
          requiresNotarization: doc.requiresNotarization ?? false,
          requiresApostille: doc.requiresApostille ?? false,
          sortOrder: 0,
        },
        create: {
          legalServiceId: service.id,
          slug: doc.slug, nameAr: doc.nameAr, nameEn: doc.nameEn,
          descriptionAr: doc.descAr, descriptionEn: doc.descEn,
          isRequired: doc.isRequired ?? true,
          provider: doc.provider ?? "client",
          stage: doc.stage ?? "at_intake",
          acceptsDigital: doc.acceptsDigital ?? true,
          requiresOriginal: doc.requiresOriginal ?? false,
          requiresNotarization: doc.requiresNotarization ?? false,
          requiresApostille: doc.requiresApostille ?? false,
          sortOrder: 0,
        },
      });
    }

    // Link official sources
    for (const sourceSlug of svc.officialSourceSlugs) {
      const sourceId = officialSources[sourceSlug]?.id;
      if (sourceId) {
        await prisma.legalServiceOfficialSource.upsert({
          where: { legalServiceId_officialSourceId: { legalServiceId: service.id, officialSourceId: sourceId } },
          update: {},
          create: { legalServiceId: service.id, officialSourceId: sourceId },
        });
      }
    }

    createdServices.push(svc.slug);
  }

  return createdServices;
}
