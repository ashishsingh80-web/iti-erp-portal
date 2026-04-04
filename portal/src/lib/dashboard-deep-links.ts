/**
 * English metric labels from `getDashboardMetrics` → deep links for home dashboard cards.
 */
export function dashboardMetricHref(label: string, session: string | null): string | undefined {
  const sessQ = session && session !== "ALL_ACTIVE" ? `session=${encodeURIComponent(session)}` : "";

  function withSession(pathWithQuery: string) {
    if (!sessQ) return pathWithQuery;
    return pathWithQuery.includes("?") ? `${pathWithQuery}&${sessQ}` : `${pathWithQuery}?${sessQ}`;
  }

  switch (label) {
    case "Total Students":
      return sessQ ? `/modules/students?tab=directory&${sessQ}` : "/modules/students?tab=directory";
    case "Pending Admissions":
      return withSession("/modules/students?tab=verification&queue=pending_any");
    case "Docs Pending":
      return withSession("/modules/students?tab=verification&queue=docs");
    case "Photo Upload Queue":
      return withSession("/modules/students?tab=verification&queue=upload");
    case "10th Check Pending":
      return withSession("/modules/students?tab=verification&queue=eligibility");
    case "Fee Due Cases":
      return withSession("/modules/fees?tab=collect");
    case "Follow-Ups Due":
    case "New Enquiries":
      return "/modules/enquiry";
    case "Scholarship Queries":
      return "/modules/scholarship";
    case "PRN Pending":
      return withSession("/modules/prn");
    case "SCVT Pending":
      return withSession("/modules/scvt");
    default:
      return undefined;
  }
}

/** Case-mix / risk strip labels on the home page → module links. */
export function dashboardRiskSegmentHref(label: string, session: string | null): string | undefined {
  const map: Record<string, string> = {
    Docs: "docs",
    Fees: "fees",
    Enquiry: "enquiry",
    PRN: "prn",
    SCVT: "scvt",
    Scholarship: "scholarship"
  };
  const key = map[label];
  if (!key) return undefined;
  if (key === "fees") return dashboardMetricHref("Fee Due Cases", session);
  if (key === "enquiry") return "/modules/enquiry";
  if (key === "scholarship") return "/modules/scholarship";
  return dashboardMetricHref(
    key === "docs" ? "Docs Pending" : key === "prn" ? "PRN Pending" : "SCVT Pending",
    session
  );
}
