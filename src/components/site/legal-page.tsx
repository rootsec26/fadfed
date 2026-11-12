import { PageHero } from "@/components/site/page-hero";
import { Alert } from "@/components/ui";

export function LegalPage({
  title,
  updated,
  sections,
  disclaimer,
}: {
  title: string;
  updated: string;
  sections: { h: string; p: string }[];
  disclaimer: string;
}) {
  return (
    <>
      <PageHero title={title} subtitle={updated} />
      <section className="mx-auto max-w-3xl space-y-8 px-5 py-14">
        {sections.map((s, i) => (
          <div key={s.h}>
            <h2 className="text-xl font-bold text-brand-900">{i + 1}. {s.h}</h2>
            <p className="mt-2 leading-9 text-ink-soft">{s.p}</p>
          </div>
        ))}
        <Alert tone="warning">{disclaimer}</Alert>
      </section>
    </>
  );
}
