export const undertakingTemplateDocumentId = "1iWYa7-p7wG6SYTm-NIJOzLZIKw-vuvwBuLZqcbEXGOI";

export const undertakingTemplateTitle =
  "ITI Admission-cum-Scholarship Undertaking, Fee Liability Declaration, and Indemnity Bond";

export function buildUndertakingPrintUrl(studentId: string) {
  return `/undertakings/${studentId}`;
}
