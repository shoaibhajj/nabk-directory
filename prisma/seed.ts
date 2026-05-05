import { PrismaClient } from "@prisma/client";
import bcrypt from "bcryptjs";

const prisma = new PrismaClient();

const CITY = { nameAr: "النبك", nameEn: "Al-Nabk", slug: "al-nabk" };

const CATEGORIES = [
  { slug: "pharmacies", nameAr: "صيدليات", nameEn: "Pharmacies", icon: "Pill", description: "صيدليات ومستلزمات طبية" },
  { slug: "clinics", nameAr: "عيادات وأطباء", nameEn: "Clinics & Doctors", icon: "Stethoscope", description: "عيادات الأطباء وخدمات صحية" },
  { slug: "restaurants", nameAr: "مطاعم وكافيهات", nameEn: "Restaurants", icon: "Coffee", description: "مطاعم، كافيهات، وحلويات" },
  { slug: "grocery", nameAr: "سوبر ماركت", nameEn: "Grocery", icon: "ShoppingCart", description: "سوبرماركت وبقاليات" },
  { slug: "auto", nameAr: "ميكانيك وسيارات", nameEn: "Auto", icon: "Wrench", description: "ميكانيك، صيانة، وقطع غيار" },
  { slug: "salons", nameAr: "صالونات وحلاقة", nameEn: "Salons", icon: "Scissors", description: "صالونات حلاقة وتجميل" },
  { slug: "education", nameAr: "تعليم ودورات", nameEn: "Education", icon: "GraduationCap", description: "مدارس، جامعات، ودورات" },
  { slug: "mosques", nameAr: "مساجد وكنائس", nameEn: "Religious", icon: "Home", description: "أماكن العبادة" },
  { slug: "clothing", nameAr: "ملابس", nameEn: "Clothing", icon: "Shirt", description: "محلات الملابس والأقمشة" },
  { slug: "construction", nameAr: "بناء ومواد", nameEn: "Construction", icon: "Hammer", description: "مواد بناء ومقاولات" },
];

async function main() {
  console.log("→ Seeding city...");
  const city = await prisma.city.upsert({
    where: { slug: CITY.slug },
    update: {},
    create: CITY,
  });

  console.log("→ Seeding categories...");
  const cats: Record<string, string> = {};
  for (let i = 0; i < CATEGORIES.length; i++) {
    const c = CATEGORIES[i];
    const created = await prisma.category.upsert({
      where: { slug: c.slug },
      update: { ...c, displayOrder: i },
      create: { ...c, displayOrder: i },
    });
    cats[c.slug] = created.id;
  }

  console.log("→ Seeding admin user (admin@nabk.local / Admin123!)");
  const adminHash = await bcrypt.hash("Admin123!", 12);
  const admin = await prisma.user.upsert({
    where: { email: "admin@nabk.local" },
    update: {},
    create: {
      name: "مدير الدليل",
      email: "admin@nabk.local",
      passwordHash: adminHash,
      role: "SUPER_ADMIN",
      emailVerified: new Date(),
    },
  });

  console.log("→ Seeding demo owner user (owner@nabk.local / Owner123!)");
  const ownerHash = await bcrypt.hash("Owner123!", 12);
  const owner = await prisma.user.upsert({
    where: { email: "owner@nabk.local" },
    update: {},
    create: {
      name: "أحمد التاجر",
      email: "owner@nabk.local",
      passwordHash: ownerHash,
      role: "BUSINESS_OWNER",
      emailVerified: new Date(),
    },
  });

  console.log("→ Seeding demo businesses...");
  const demos = [
    {
      slug: "pharmacy-al-shifa",
      nameAr: "صيدلية الشفاء",
      categorySlug: "pharmacies",
      descriptionAr:
        "صيدلية متكاملة تقدم جميع أنواع الأدوية والمستلزمات الطبية مع توصيل مجاني داخل النبك.",
      addressAr: "شارع الكورنيش، مقابل البلدية، النبك",
      phones: [{ label: "MOBILE" as const, number: "+963944123456" }, { label: "WHATSAPP" as const, number: "+963944123456" }],
    },
    {
      slug: "clinic-dr-amer",
      nameAr: "عيادة د. عامر — أطفال وحديثي الولادة",
      categorySlug: "clinics",
      descriptionAr:
        "د. عامر اختصاصي طب أطفال وحديثي الولادة. خبرة 15 سنة في علاج الحالات الصعبة.",
      addressAr: "بناء المركز الطبي، الطابق الثاني، النبك",
      phones: [{ label: "LANDLINE" as const, number: "+963112345678" }, { label: "MOBILE" as const, number: "+963999111222" }],
    },
    {
      slug: "restaurant-al-mazaq",
      nameAr: "مطعم المذاق الأصيل",
      categorySlug: "restaurants",
      descriptionAr:
        "أشهى المأكولات الشامية الأصيلة في قلب النبك. مشاوي، كبة، حمص، فول، وأطباق سورية شعبية.",
      addressAr: "ساحة الجامع الكبير، النبك",
      phones: [{ label: "MOBILE" as const, number: "+963933445566" }],
    },
    {
      slug: "supermarket-al-nour",
      nameAr: "سوبر ماركت النور",
      categorySlug: "grocery",
      descriptionAr:
        "سوبر ماركت كبير يضم جميع المواد الغذائية والاستهلاكية بأسعار منافسة وتوصيل سريع.",
      addressAr: "الطريق العام، النبك",
      phones: [{ label: "MOBILE" as const, number: "+963955667788" }],
    },
    {
      slug: "auto-al-fares",
      nameAr: "ميكانيك الفارس",
      categorySlug: "auto",
      descriptionAr: "صيانة شاملة لجميع أنواع السيارات. خبرة طويلة وضمان على كل إصلاح.",
      addressAr: "المنطقة الصناعية، النبك",
      phones: [{ label: "MOBILE" as const, number: "+963966778899" }],
    },
    {
      slug: "salon-elite",
      nameAr: "صالون إيليت للحلاقة",
      categorySlug: "salons",
      descriptionAr: "أحدث قصات الشعر للرجال بجودة عالية وأسعار مناسبة.",
      addressAr: "شارع المدارس، النبك",
      phones: [{ label: "MOBILE" as const, number: "+963977889900" }],
    },
  ];

  for (const d of demos) {
    await prisma.businessProfile.upsert({
      where: { slug: d.slug },
      update: {},
      create: {
        slug: d.slug,
        nameAr: d.nameAr,
        descriptionAr: d.descriptionAr,
        addressAr: d.addressAr,
        ownerId: owner.id,
        cityId: city.id,
        categoryId: cats[d.categorySlug],
        status: "ACTIVE",
        publishedAt: new Date(),
        searchableText: `${d.nameAr} ${d.descriptionAr}`,
        phones: {
          create: d.phones.map((p, i) => ({
            label: p.label,
            number: p.number,
            displayOrder: i,
          })),
        },
        workingHours: {
          create: Array.from({ length: 7 }, (_, i) => ({
            dayOfWeek: i,
            isOpen: i !== 5,
            openTime: i !== 5 ? "09:00" : null,
            closeTime: i !== 5 ? "22:00" : null,
          })),
        },
      },
    });
  }

  console.log("✓ Seed complete");
  console.log(`  Admin: ${admin.email} / Admin123!`);
  console.log(`  Owner: ${owner.email} / Owner123!`);
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
