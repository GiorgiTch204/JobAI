import { badRequest, fail, ok, withUser } from "@/lib/http";
import {
  MAX_UPLOAD_BYTES,
  SUPPORTED_UPLOAD_TYPES,
  extensionOf,
  parseResumeFile,
} from "@/lib/resume-parse";
import { scoreResume } from "@/lib/ats";

// Reading a file needs the Node runtime, and must never be cached.
export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const maxDuration = 30;

export const POST = withUser(async (request) => {
  let form;
  try {
    form = await request.formData();
  } catch {
    return badRequest("Send the file as multipart form data.");
  }

  const file = form.get("file");
  if (!file || typeof file === "string" || typeof file.arrayBuffer !== "function") {
    return badRequest("Attach a file in the `file` field.");
  }

  const name = file.name || "cv";
  const extension = extensionOf(name);

  if (!SUPPORTED_UPLOAD_TYPES.includes(extension)) {
    return badRequest(
      `We can read ${SUPPORTED_UPLOAD_TYPES.join(", ")} files. That one is "${extension || "unknown"}".`,
    );
  }
  if (file.size > MAX_UPLOAD_BYTES) {
    return fail(
      `That file is ${(file.size / 1024 / 1024).toFixed(1)} MB. The limit is ${
        MAX_UPLOAD_BYTES / 1024 / 1024
      } MB.`,
      413,
    );
  }
  if (file.size === 0) return badRequest("That file is empty.");

  const buffer = Buffer.from(await file.arrayBuffer());

  try {
    const { resume, diagnostics } = await parseResumeFile(buffer, name);
    const report = scoreResume(resume);

    return ok({
      resume: { ...resume, source: "upload", sourceFile: name, title: `${name.replace(extension, "")} (imported)` },
      diagnostics,
      report,
      message: `Read ${diagnostics.words} words from ${name}.`,
    });
  } catch (error) {
    if (error.code === "EMPTY_DOCUMENT") return badRequest(error.message);
    console.error("[cv/parse] failed:", error);
    return fail(
      "We could not read that file. Try exporting it again as a PDF or DOCX.",
      422,
    );
  }
});
