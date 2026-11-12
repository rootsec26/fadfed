import { notFound } from "next/navigation";
import { eq } from "drizzle-orm";
import { db } from "@/db";
import { videos } from "@/db/schema";
import { VideoForm } from "@/components/admin/video-form";
import { ToastProvider } from "@/components/admin/toast";
import { PageTitle } from "@/components/dashboard/shell";
import { requireDoctor } from "@/lib/auth";
import { getI18n, pick } from "@/lib/i18n";
import { adminVideosT } from "@/lib/i18n/admin-videos";
import { isCloudinaryConfigured } from "@/lib/cloudinary";

export const metadata = { title: "تعديل فيديو", robots: { index: false } };

export default async function EditVideoPage({ params }: { params: Promise<{ id: string }> }) {
  await requireDoctor();
  const { id } = await params;
  const numId = Number(id);
  if (!Number.isInteger(numId)) notFound();
  const [v] = await db.select().from(videos).where(eq(videos.id, numId)).limit(1);
  if (!v) notFound();

  const { lang } = await getI18n();
  const t = adminVideosT(lang);
  return (
    <ToastProvider>
      <PageTitle title={`${t.editVideo}: ${pick(lang, v.titleAr, v.titleEn)}`} />
      <VideoForm
        t={t.form}
        storageEnabled={isCloudinaryConfigured}
        video={{
          id: v.id,
          titleAr: v.titleAr,
          titleEn: v.titleEn,
          descriptionAr: v.descriptionAr,
          descriptionEn: v.descriptionEn,
          category: v.category,
          durationSeconds: v.durationSeconds,
          sourceType: v.sourceType,
          videoUrl: v.videoUrl,
          storageKey: v.storageKey,
          thumbnailUrl: v.thumbnailUrl,
          isPublished: v.isPublished,
          isFeatured: v.isFeatured,
          thumbKey: v.thumbKey,
        }}
      />
    </ToastProvider>
  );
}
