import { LegalPage } from "@/components/site/legal-page";
import { getI18n } from "@/lib/i18n";

export const metadata = { title: "الشروط والأحكام | Terms" };

export default async function TermsPage() {
  const { t } = await getI18n();
  return <LegalPage title={t.legal.terms.title} updated={t.legal.updated} sections={t.legal.terms.sections} disclaimer={t.disclaimer} />;
}
