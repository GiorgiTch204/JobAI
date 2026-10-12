import { PageHeader } from "@/components/layout/PageHeader";
import { UploadPanel } from "@/components/cv/UploadPanel";
import { requireUser } from "@/lib/auth/session";
import { countResumes } from "@/lib/db/resumes.repo";

export const dynamic = "force-dynamic";
export const metadata = {
  title: "Import a CV",
  description: "Upload a PDF, DOCX or text CV and see exactly what a parser reads from it.",
};

export default async function CvUploadPage() {
  const { user } = await requireUser("/cv/upload");
  const existing = countResumes(user.id);

  return (
    <>
      <PageHeader
        title="Import a CV"
        description="The file is read the way an applicant tracking system reads it. You see what was found before anything is saved."
      />
      <UploadPanel hasResumes={existing > 0} />
    </>
  );
}
