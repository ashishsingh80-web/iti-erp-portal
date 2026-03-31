import { DocumentTypeCode, StudentStatus, VerificationStatus } from "@prisma/client";

type WorkflowDocumentInput = {
  documentType: DocumentTypeCode;
  verificationStatus: VerificationStatus;
};

type WorkflowStudentInput = {
  category: string | null;
  scholarshipApplied?: boolean;
  eligibilityStatus: VerificationStatus;
  currentStatus: StudentStatus;
  documents: WorkflowDocumentInput[];
};

export const requiredDocumentCatalog = [
  {
    code: DocumentTypeCode.STUDENT_AADHAAR,
    label: "Student Aadhaar",
    required: true
  },
  {
    code: DocumentTypeCode.TENTH_MARKSHEET,
    label: "10th Marksheet",
    required: true
  },
  {
    code: DocumentTypeCode.STUDENT_PHOTO,
    label: "Student Photo",
    required: true
  },
  {
    code: DocumentTypeCode.PARENT_AADHAAR,
    label: "Parent Aadhaar",
    required: false
  },
  {
    code: DocumentTypeCode.CASTE_CERTIFICATE,
    label: "Caste Certificate",
    required: false
  },
  {
    code: DocumentTypeCode.INCOME_CERTIFICATE,
    label: "Income Certificate",
    required: false
  }
] as const;

export function getRequiredDocumentRules(category: string | null, scholarshipApplied = false) {
  return requiredDocumentCatalog.map((item) => {
    if (item.code === DocumentTypeCode.CASTE_CERTIFICATE) {
      return {
        ...item,
        required: category === "SC" || category === "ST" || category === "OBC"
      };
    }

    if (item.code === DocumentTypeCode.INCOME_CERTIFICATE) {
      return {
        ...item,
        required: scholarshipApplied
      };
    }

    return item;
  });
}

export function evaluateWorkflow(student: WorkflowStudentInput) {
  const rules = getRequiredDocumentRules(student.category, Boolean(student.scholarshipApplied));

  const documentSummary = rules.map((rule) => {
    const matches = student.documents.filter((item) => item.documentType === rule.code);
    const latest = matches[0];
    const uploaded = Boolean(latest);
    const verificationStatus = latest?.verificationStatus || VerificationStatus.PENDING;

    return {
      code: rule.code,
      label: rule.label,
      required: rule.required,
      uploaded,
      verificationStatus
    };
  });

  const requiredDocs = documentSummary.filter((item) => item.required);
  const missingRequired = requiredDocs.filter((item) => !item.uploaded);
  const rejectedRequired = requiredDocs.filter((item) => item.verificationStatus === VerificationStatus.REJECTED);
  const incompleteRequired = requiredDocs.filter((item) => item.verificationStatus === VerificationStatus.INCOMPLETE);
  const pendingRequired = requiredDocs.filter((item) => item.uploaded && item.verificationStatus === VerificationStatus.PENDING);
  const verifiedRequired = requiredDocs.filter((item) => item.uploaded && item.verificationStatus === VerificationStatus.VERIFIED);

  let documentsStatus: VerificationStatus = VerificationStatus.PENDING;

  if (rejectedRequired.length) {
    documentsStatus = VerificationStatus.REJECTED;
  } else if (incompleteRequired.length) {
    documentsStatus = VerificationStatus.INCOMPLETE;
  } else if (!missingRequired.length && verifiedRequired.length === requiredDocs.length) {
    documentsStatus = VerificationStatus.VERIFIED;
  } else if (missingRequired.length && !pendingRequired.length && !verifiedRequired.length) {
    documentsStatus = VerificationStatus.PENDING;
  } else {
    documentsStatus = VerificationStatus.PENDING;
  }

  let nextStudentStatus = student.currentStatus;

  if (student.eligibilityStatus === VerificationStatus.REJECTED) {
    nextStudentStatus = StudentStatus.REJECTED;
  } else if (
    student.eligibilityStatus === VerificationStatus.VERIFIED &&
    documentsStatus === VerificationStatus.VERIFIED
  ) {
    nextStudentStatus = StudentStatus.COMPLETED;
  } else if (student.currentStatus === StudentStatus.DRAFT) {
    nextStudentStatus = StudentStatus.IN_PROGRESS;
  } else {
    nextStudentStatus = StudentStatus.UNDER_REVIEW;
  }

  const blockers: string[] = [];

  if (student.eligibilityStatus !== VerificationStatus.VERIFIED) {
    blockers.push("10th eligibility verification pending");
  }

  missingRequired.forEach((item) => {
    blockers.push(`${item.label} not uploaded`);
  });

  pendingRequired.forEach((item) => {
    blockers.push(`${item.label} verification pending`);
  });

  incompleteRequired.forEach((item) => {
    blockers.push(`${item.label} marked incomplete`);
  });

  rejectedRequired.forEach((item) => {
    blockers.push(`${item.label} rejected`);
  });

  return {
    rules: documentSummary,
    documentsStatus,
    nextStudentStatus,
    blockers
  };
}
