import { Upload } from "lucide-react";

import { PageHeader } from "@/components/layout/PageHeader";
import { Button } from "@/components/ui/Button";
import { BuilderForm } from "@/components/cv/BuilderForm";
import { requireUser } from "@/lib/auth/session";
import { listResumes } from "@/lib/db/resumes.repo";

export const dynamic = "force-dynamic";
export const metadata = {
  title: "CV builder",
  description: "Build and score your CV against the checks an ATS runs.",
};

export default async function CvBuilderPage({ searchParams }) {
  const { user } = await requireUser("/cv");
  const params = await searchParams;
  const resumes = listResumes(user.id);

  return (
    <>
      <PageHeader
        title="CV builder"
        description="Edit on the left, watch the score on the right. The score uses the same checks the server stores."
        actions={
          <Button href="/cv/upload" variant="outline" size="sm">
            <Upload className="size-3.5" aria-hidden="true" />
            Import a file
          </Button>
        }
      />

      <BuilderForm resumes={resumes} activeId={params?.id || null} />
    </>
  );
}
