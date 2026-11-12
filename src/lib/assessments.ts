/**
 * Self-assessment questionnaires (Arabic). Public-domain instruments:
 * PHQ-9 (depression symptoms) and GAD-7 (anxiety symptoms).
 * These are screening aids only – NOT a diagnosis.
 */
export type AssessmentType = "phq9" | "gad7";

export const OPTIONS = [
  { value: 0, label: "ولا مرة" },
  { value: 1, label: "شوية أيام" },
  { value: 2, label: "أكتر من نص الوقت" },
  { value: 3, label: "تقريباً كل يوم" },
];

export const ASSESSMENTS: Record<
  AssessmentType,
  { title: string; short: string; intro: string; questions: string[]; bands: { max: number; label: string }[] }
> = {
  phq9: {
    title: "استبيان صحة المريض (PHQ-9)",
    short: "أعراض الاكتئاب",
    intro: "في آخر أسبوعين، الأسئلة دي إزعجتك قد إيه؟",
    questions: [
      "قلة الاهتمام أو الاستمتاع بالقيام بالأشياء",
      "الشعور بالحزن أو الاكتئاب أو اليأس",
      "صعوبة في النوم أو النوم لفترات طويلة جداً",
      "الشعور بالتعب أو قلة الطاقة",
      "ضعف الشهية أو الإفراط في الأكل",
      "الشعور بسوء تجاه نفسك، أو أنك فاشل أو خذلت نفسك أو أسرتك",
      "صعوبة في التركيز على الأشياء، مثل قراءة الصحف أو مشاهدة التلفاز",
      "الحركة أو الكلام ببطء شديد، أو العكس: التوتر والحركة أكثر من المعتاد",
      "أفكار بأنك ستكون أفضل حالاً لو كنت ميتاً أو بإيذاء نفسك بطريقة ما",
    ],
    bands: [
      { max: 4, label: "أعراض قليلة أو معدومة" },
      { max: 9, label: "أعراض خفيفة" },
      { max: 14, label: "أعراض متوسطة" },
      { max: 19, label: "أعراض متوسطة لقوية" },
      { max: 27, label: "أعراض قوية" },
    ],
  },
  gad7: {
    title: "مقياس القلق العام (GAD-7)",
    short: "أعراض القلق",
    intro: "في آخر أسبوعين، الأسئلة دي إزعجتك قد إيه؟",
    questions: [
      "الشعور بالعصبية أو القلق أو التوتر",
      "عدم القدرة على التوقف عن القلق أو السيطرة عليه",
      "القلق الزائد حيال أمور مختلفة",
      "صعوبة في الاسترخاء",
      "التململ لدرجة يصعب معها الجلوس بهدوء",
      "الانزعاج أو العصبية بسهولة",
      "الشعور بالخوف كأن شيئاً فظيعاً قد يحدث",
    ],
    bands: [
      { max: 4, label: "أعراض قليلة أو معدومة" },
      { max: 9, label: "أعراض خفيفة" },
      { max: 14, label: "أعراض متوسطة" },
      { max: 21, label: "أعراض قوية" },
    ],
  },
};

export const DISCLAIMER =
  "الاختبار ده أداة فحص أولية للتثقيف بس، ومش تشخيص طبي ولا بديل عن تقييم دكتور مختص. النتيجة مش بتحدد إذا كان فيه اضطراب ولا لأ. اتكلم في نتيجتك مع الدكتور في جلستك الجاية.";

export const isAssessmentType = (v: string): v is AssessmentType => v === "phq9" || v === "gad7";

export function scoreAssessment(type: AssessmentType, answers: number[]) {
  const score = answers.reduce((a, b) => a + b, 0);
  const severity = ASSESSMENTS[type].bands.find((b) => score <= b.max)?.label ?? "";
  return { score, severity };
}

export const maxScore = (type: AssessmentType) => ASSESSMENTS[type].questions.length * 3;
