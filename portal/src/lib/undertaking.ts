export const undertakingTemplateDocumentUrl =
  "https://docs.google.com/document/d/1iWYa7-p7wG6SYTm-NIJOzLZIKw-vuvwBuLZqcbEXGOI/edit?usp=drive_link";

export const undertakingTemplateDocumentId = "1iWYa7-p7wG6SYTm-NIJOzLZIKw-vuvwBuLZqcbEXGOI";

export const undertakingTemplateTitle =
  "ITI Admission-cum-Scholarship Undertaking, Fee Liability Declaration, and Indemnity Bond";

export function buildUndertakingPrintUrl(studentId: string) {
  return `/undertakings/${studentId}`;
}
