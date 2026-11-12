import { randomBytes } from "node:crypto";
import { count, eq } from "drizzle-orm";
import { db } from "@/db";
import {
  appointments,
  articles,
  assessments,
  availabilityRules,
  clinicSettings,
  messages,
  patients,
  services,
  sessionNotes,
  testimonials,
  users,
} from "@/db/schema";
import { hashPassword } from "@/lib/auth";
import { doctorProfile } from "@/lib/profile";
import { addDays, todayInTz, toMin, fromMin, weekdayOf } from "@/lib/time";

/**
 * Demo data. Runs automatically ONCE when the database is empty
 * (set AUTO_SEED=false to disable). Edit freely – it is only placeholder content.
 *
 * Demo accounts (passwords come from SEED_DOCTOR_PASSWORD / SEED_PATIENT_PASSWORD;
 * random passwords are generated and printed to the server log when unset):
 *   doctor@example.com
 *   patient@example.com
 */

let seeding: Promise<void> | null = null;
// The admin-account check is memoized per instance: getSettings() runs on
// every public page (footer), and re-running SELECT+UPDATE on every request
// would serialize all queries through the single serverless connection and
// contend on the same row lock across instances.
let adminCheck: Promise<void> | null = null;

function ensureAdminOnce() {
  adminCheck ??= ensureAdminAccount().catch((e) => {
    console.error("[seed] admin account failed", e);
  });
  return adminCheck;
}

export function ensureSeed() {
  // Never touch the database during `next build` — prerendering may call
  // getSettings() while CI env vars are present, and seeding must not run
  // at build time.
  if (process.env.NEXT_PHASE === "phase-production-build") return Promise.resolve();
  // The admin account is seeded whenever ADMIN_EMAIL/ADMIN_PASSWORD are set,
  // even when demo data seeding is disabled.
  const admin = ensureAdminOnce();
  // Demo data never auto-runs in production: it requires AUTO_SEED=true
  // explicitly there. Outside production it stays on by default.
  const autoSeed =
    process.env.AUTO_SEED ?? (process.env.NODE_ENV === "production" ? "false" : "true");
  if (autoSeed === "false") return admin;
  seeding ??= Promise.all([admin, seed()])
    .then(() => undefined)
    .catch((e) => {
      seeding = null;
      console.error("[seed] failed", e);
    });
  return seeding;
}

async function seed() {
  const [{ n }] = await db.select({ n: count() }).from(clinicSettings);
  if (n > 0) return;
  console.log("[seed] empty database – inserting demo data");

  const doctorPassword =
    process.env.SEED_DOCTOR_PASSWORD || randomBytes(12).toString("base64url");
  const patientPassword =
    process.env.SEED_PATIENT_PASSWORD || randomBytes(12).toString("base64url");
  if (!process.env.SEED_DOCTOR_PASSWORD || !process.env.SEED_PATIENT_PASSWORD) {
    console.log(
      `[seed] demo passwords — doctor: ${doctorPassword} | patient: ${patientPassword}`,
    );
  }
  const doctorHash = await hashPassword(doctorPassword);
  const patientHash = await hashPassword(patientPassword);
  const tz = "Asia/Riyadh";
  const today = todayInTz(tz);
  const nextWorkday = (from: number) => {
    let i = from;
    while (weekdayOf(addDays(today, i)) === 5) i++;
    return addDays(today, i);
  };

  await db.transaction(async (tx) => {
    await tx.insert(users).values({
      email: "doctor@example.com",
      name: doctorProfile.nameAr,
      role: "doctor",
      passwordHash: doctorHash,
    });
    const [demoUser] = await tx
      .insert(users)
      .values({ email: "patient@example.com", name: "نورة الأحمد", phone: "0500000001", passwordHash: patientHash })
      .returning();

    const [demoPatient] = await tx
      .insert(patients)
      .values({ userId: demoUser.id, fullName: demoUser.name, email: demoUser.email, phone: demoUser.phone })
      .returning();
    const [guest] = await tx
      .insert(patients)
      .values({ fullName: "خالد السبيعي", email: "khaled@example.com", phone: "0500000002" })
      .returning();

    const svc = await tx
      .insert(services)
      .values([
        {
          slug: "individual-therapy",
          titleAr: "جلسة علاج فردي",
          titleEn: "Individual Therapy",
          descriptionAr: "جلسات فردية سرّية للتعامل مع القلق والاكتئاب والضغوط والصدمات وتحسين جودة الحياة.",
          descriptionEn: "Confidential one-to-one sessions for anxiety, depression, stress and trauma.",
          price: 0, durationMin: 50, mode: "both", icon: "user", sortOrder: 1,
        },
        {
          slug: "couples-therapy",
          titleAr: "علاج الأزواج",
          titleEn: "Couples Therapy",
          descriptionAr: "مساحة آمنة لتحسين التواصل وحل الخلافات وبناء علاقة أكثر تفاهماً واستقراراً.",
          descriptionEn: "A safe space to improve communication, resolve conflict and build a more understanding relationship.",
          price: 0, durationMin: 80, mode: "both", icon: "heart", sortOrder: 2,
        },
        {
          slug: "teen-child-therapy",
          titleAr: "علاج المراهقين والأطفال",
          titleEn: "Teen & Child Therapy",
          descriptionAr: "دعم نفسي مناسب للعمر للأطفال والمراهقين، مع إشراك الأسرة في خطة العلاج.",
          descriptionEn: "Age-appropriate psychological support for children and teens, with parents involved in the plan.",
          price: 0, durationMin: 50, mode: "clinic", icon: "smile", sortOrder: 3,
        },
        {
          slug: "online-session",
          titleAr: "جلسة أونلاين (فيديو)",
          titleEn: "Online Video Session",
          descriptionAr: "جلسة عبر مكالمة فيديو مشفّرة من راحة منزلك، بنفس جودة الجلسة الحضورية.",
          descriptionEn: "A secure video session from the comfort of your home, with the same quality as in-clinic care.",
          price: 0, durationMin: 50, mode: "online", icon: "video", sortOrder: 4,
        },
      ])
      .returning();

    // Sun–Thu 10:00–18:00 (break 14:00–15:00), Sat 10:00–14:00, Friday off
    await tx.insert(availabilityRules).values([
      ...[0, 1, 2, 3, 4].map((weekday) => ({
        weekday, startTime: "10:00", endTime: "18:00", breakStart: "14:00", breakEnd: "15:00",
      })),
      { weekday: 6, startTime: "10:00", endTime: "14:00" },
    ]);

    const pastDate = addDays(today, -7);
    const upDate = nextWorkday(2);
    const pendDate = nextWorkday(3);
    const mk = (start: string, dur: number) => fromMin(toMin(start) + dur);
    const token = () => randomBytes(16).toString("hex");

    const [past] = await tx
      .insert(appointments)
      .values({
        manageToken: token(), patientId: demoPatient.id, serviceId: svc[0].id, date: pastDate,
        startTime: "11:00", endTime: mk("11:00", 50), durationMin: 50, sessionType: "clinic",
        status: "completed", price: 0,
      })
      .returning();
    await tx.insert(appointments).values([
      {
        manageToken: token(), patientId: demoPatient.id, serviceId: svc[3].id, date: upDate,
        startTime: "11:00", endTime: mk("11:00", 50), durationMin: 50, sessionType: "online",
        status: "confirmed", price: 0, meetingUrl: "https://meet.jit.si/clinic-demo-room",
      },
      {
        manageToken: token(), patientId: guest.id, serviceId: svc[1].id, date: pendDate,
        startTime: "16:00", endTime: mk("16:00", 80), durationMin: 80, sessionType: "clinic",
        status: "pending", price: 0, patientNote: "عايزين نحسن التواصل بيننا.",
      },
    ]);

    await tx.insert(sessionNotes).values({
      patientId: demoPatient.id, appointmentId: past.id,
      content: "أول جلسة: تقييم مبدئي. المراجع بيعاني من توتر في الشغل وصعوبة في النوم. اتفقنا على أهداف العلاج وتمرين تنفس يومي.",
    });
    await tx.insert(assessments).values({
      patientId: demoPatient.id, type: "gad7", answers: [1, 2, 1, 2, 1, 1, 1], score: 9, severity: "قلق خفيف إلى متوسط",
    });
    await tx.insert(messages).values([
      { patientId: demoPatient.id, sender: "patient", body: "مرحباً دكتور، أقدر أجيب تقرير قديم معايا في الجلسة الجاية؟" },
      { patientId: demoPatient.id, sender: "doctor", body: "أهلاً نورة، أيوه طبعاً. جيبيه معاك وهنراجعه سوا.", },
    ]);

    await tx.insert(testimonials).values([
      {
        nameAr: "سارة م.", nameEn: "Sara M.", rating: 5, published: false,
        textAr: "شعرت بالأمان من أول جلسة. تعلمت أدوات عملية للتعامل مع القلق وأصبحت أنام أفضل بكثير.",
        textEn: "I felt safe from the very first session. I learned practical tools for anxiety and now sleep far better.",
      },
      {
        nameAr: "أحمد ع.", nameEn: "Ahmed A.", rating: 5, published: false,
        textAr: "الجلسات أونلاين كانت مريحة جداً وبنفس الجودة. أسلوب الدكتور هادي ومحترم ومتفهّم.",
        textEn: "Online sessions were very convenient and just as effective. The doctor is calm, respectful and understanding.",
      },
      {
        nameAr: "ريم و محمد", nameEn: "Reem & Mohammed", rating: 5, published: false,
        textAr: "ساعدتنا جلسات الأزواج على فهم بعضنا من جديد. نشكرها على صبرها واحترافيتها.",
        textEn: "Couples therapy helped us understand each other again. Thank you for the patience and professionalism.",
      },
      {
        nameAr: "والدة ياسر", nameEn: "Yasser's mother", rating: 5, published: false,
        textAr: "تحسّن ابني بشكل ملحوظ في المدرسة والثقة بالنفس. شكراً على الدعم لنا كأسرة.",
        textEn: "My son improved noticeably at school and in confidence. Thank you for supporting us as a family.",
      },
    ]);

    await tx.insert(articles).values([
      {
        slug: "understanding-anxiety", category: "القلق", published: false,
        titleAr: "كيف أفهم القلق وأتعامل معه؟", titleEn: "Understanding anxiety and how to cope",
        excerptAr: "القلق شعور طبيعي، لكنه يصبح مشكلة حين يعيق حياتنا. تعرّف على أعراضه وخطوات بسيطة للتعامل معه.",
        excerptEn: "Anxiety is natural, but it becomes a problem when it limits our life. Learn the signs and simple first steps.",
        contentAr: "القلق استجابة طبيعية للتوتر، لكنه قد يتحول إلى عائق عندما يصبح مستمراً وشديداً.\n\n## ما هي أعراض القلق؟\n\nتشمل الأعراض توتر العضلات، وخفقان القلب، وصعوبة التركيز، واضطراب النوم، والتفكير المفرط في أسوأ الاحتمالات.\n\n## خطوات أولى للتعامل معه\n\nجرّب تمارين التنفس العميق، وتنظيم النوم، وتقليل الكافيين، وكتابة الأفكار القلقة ومراجعتها بهدوء. وإذا استمر القلق وأثّر على يومك فالتحدث مع مختص هو خطوة شجاعة وفعّالة.\n\n*هذا المقال تثقيفي ولا يغني عن استشارة مختص.*",
        contentEn: "Anxiety is a natural stress response, but it can become a barrier when it is persistent and intense.\n\n## Common signs\n\nMuscle tension, racing heart, trouble concentrating, poor sleep and overthinking worst-case scenarios.\n\n## First steps\n\nTry deep breathing, a regular sleep routine, less caffeine, and writing down worries to review them calmly. If anxiety persists, speaking with a professional is a brave and effective step.\n\n*This article is educational and does not replace professional consultation.*",
      },
      {
        slug: "what-is-cbt", category: "العلاج", published: false,
        titleAr: "ما هو العلاج المعرفي السلوكي (CBT)؟", titleEn: "What is Cognitive Behavioural Therapy (CBT)?",
        excerptAr: "العلاج المعرفي السلوكي من أكثر الأساليب العلاجية دعماً بالأدلة العلمية. إليك كيف يعمل وماذا تتوقع.",
        excerptEn: "CBT is one of the most evidence-based approaches. Here is how it works and what to expect.",
        contentAr: "يقوم العلاج المعرفي السلوكي على فكرة أن أفكارنا ومشاعرنا وسلوكياتنا مترابطة، وأن تغيير أحدها يؤثر في الباقي.\n\n## كيف تسير الجلسات؟\n\nتكون الجلسات منظّمة وذات أهداف واضحة، وتتضمن تمارين عملية بين الجلسات.\n\n## لمن يناسب؟\n\nيفيد في القلق والاكتئاب والوسواس ونوبات الهلع والضغوط وغيرها.",
        contentEn: "CBT is built on the idea that thoughts, feelings and behaviours are connected, and changing one influences the others.\n\n## What are sessions like?\n\nStructured, goal-oriented, with practical exercises between sessions.\n\n## Who is it for?\n\nIt helps with anxiety, depression, OCD, panic attacks, stress and more.",
      },
      {
        slug: "better-sleep", category: "نمط الحياة", published: false,
        titleAr: "5 عادات بسيطة لنوم أفضل", titleEn: "5 simple habits for better sleep",
        excerptAr: "النوم الجيد أساس الصحة النفسية. جرّب هذه العادات البسيطة لتحسين نومك.",
        excerptEn: "Good sleep is the foundation of mental health. Try these simple habits.",
        contentAr: "النوم الجيد ليس رفاهية، بل ركيزة أساسية للصحة النفسية.\n\n## العادات الخمس\n\n١. ثبّت موعد النوم والاستيقاظ.\n\n٢. ابتعد عن الشاشات قبل النوم بساعة.\n\n٣. قلّل الكافيين بعد الظهر.\n\n٤. اجعل غرفتك هادئة ومظلمة.\n\n٥. مارس تمرين استرخاء قبل النوم.",
        contentEn: "Good sleep is not a luxury; it is a pillar of mental health.\n\n## The five habits\n\n1. Keep a fixed sleep schedule.\n\n2. Avoid screens an hour before bed.\n\n3. Cut caffeine after noon.\n\n4. Keep your room quiet and dark.\n\n5. Practise a relaxation exercise.",
      },
      {
        slug: "supporting-your-teen", category: "الأسرة", published: false,
        titleAr: "كيف أدعم ابني المراهق نفسياً؟", titleEn: "How to support your teenager emotionally",
        excerptAr: "المراهقة مرحلة حساسة. تعرّف على طرق للتواصل مع ابنك ومتى تطلب المساعدة المتخصصة.",
        excerptEn: "Adolescence is a sensitive stage. Learn ways to connect with your teen and when to seek help.",
        contentAr: "المراهقة مرحلة تغيّرات كبيرة، وقد يصعب على المراهق التعبير عمّا يشعر به.\n\n## ابدأ بالاستماع\n\nاستمع دون حكم أو مقاطعة، وأظهر اهتماماً حقيقياً بمشاعره.\n\n## متى أطلب المساعدة؟\n\nإذا لاحظت انعزالاً طويلاً أو تغيراً حاداً في النوم أو الدراسة أو الشهية فاستشر مختصاً.",
        contentEn: "Adolescence brings big changes, and teens often struggle to express what they feel.\n\n## Start by listening\n\nListen without judging or interrupting, and show genuine interest in their feelings.\n\n## When to seek help\n\nIf you notice long withdrawal or sharp changes in sleep, school performance or appetite, consult a specialist.",
      },
    ]);

    await tx.insert(clinicSettings).values({
      id: 1,
      doctorNameAr: doctorProfile.nameAr, doctorNameEn: doctorProfile.nameEn,
      titleAr: doctorProfile.titleAr, titleEn: doctorProfile.titleEn,
      clinicNameAr: doctorProfile.clinicNameAr, clinicNameEn: doctorProfile.clinicNameEn,
      addressAr: doctorProfile.addressAr, addressEn: doctorProfile.addressEn,
      phone: doctorProfile.phone, whatsapp: doctorProfile.whatsapp, email: doctorProfile.email,
      instagram: doctorProfile.instagram || null, twitter: doctorProfile.twitter || null, facebook: doctorProfile.facebook || null,
      tiktok: doctorProfile.tiktok || null,
      hotline: doctorProfile.hotline,
    });
  });
}

/**
 * Ensure the single admin (doctor) account exists when ADMIN_EMAIL and
 * ADMIN_PASSWORD are set. Idempotent: creates the user on first run and
 * updates the password hash on later runs so rotating the env var works.
 * Never hard-codes credentials.
 */
async function ensureAdminAccount() {
  const email = process.env.ADMIN_EMAIL?.trim().toLowerCase();
  const password = process.env.ADMIN_PASSWORD;
  if (!email || !password) return;
  if (password.length < 8) {
    console.warn("[seed] ADMIN_PASSWORD is too short (min 8) — admin account not created");
    return;
  }
  const passwordHash = await hashPassword(password);
  const [existing] = await db.select({ id: users.id }).from(users).where(eq(users.email, email)).limit(1);
  if (existing) {
    await db.update(users).set({ role: "doctor", passwordHash }).where(eq(users.id, existing.id));
  } else {
    await db.insert(users).values({
      email,
      name: doctorProfile.nameAr,
      role: "doctor",
      passwordHash,
    });
    console.log(`[seed] admin account ready: ${email}`);
  }
}
