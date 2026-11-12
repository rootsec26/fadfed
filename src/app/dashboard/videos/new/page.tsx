import { VideoForm } from "@/components/admin/video-form";
import { ToastProvider } from "@/components/admin/toast";
import { PageTitle } from "@/components/dashboard/shell";
import { requireDoctor } from "@/lib/auth";
import { getI18n } from "@/lib/i18n";
import { adminVideosT } from "@/lib/i18n/admin-videos";
import { isCloudinaryConfigured } from "@/lib/cloudinary";

export const metadata = { title: "فيديو جديد", robots: { index: false } };

export default async function NewVideoPage() {
  await requireDoctor();
  const { lang } = await getI18n();
  const t = adminVideosT(lang);
  return (
    <ToastProvider>
      <PageTitle title={t.addVideo} />
      <VideoForm t={t.form} storageEnabled={isCloudinaryConfigured} />
    </ToastProvider>
  );
}
