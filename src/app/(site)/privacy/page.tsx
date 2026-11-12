import { LegalPage } from "@/components/site/legal-page";
import { getI18n } from "@/lib/i18n";

export const metadata = { title: "سياسة الخصوصية | Privacy" };

export default async function PrivacyPage() {
  const { t } = await getI18n();
  return <LegalPage title={t.legal.privacy.title} updated={t.legal.updated} sections={t.legal.privacy.sections} disclaimer={t.disclaimer} />;
}
