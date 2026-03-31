import { mkdir, readFile, writeFile } from "fs/promises";
import path from "path";
import type { VerificationStatus } from "@prisma/client";

export const undertakingTemplateStoragePath = path.join(process.cwd(), "data", "undertaking-template.json");

export const defaultUndertakingTemplate = `ITI ADMISSION-CUM-SCHOLARSHIP UNDERTAKING, FEE LIABILITY DECLARATION, AND INDEMNITY BOND
आईटीआई प्रवेश-सह-छात्रवृत्ति उपक्रम, शुल्क देयता घोषणा एवं क्षतिपूर्ति बांड

Date / दिनांक: {{current_date}}
Place / स्थान: {{place}}
Undertaking Verification Code / सत्यापन कोड: {{undertaking_code}}

1. INSTITUTE DETAILS / संस्थान का विवरण
Institute Name / संस्थान का नाम: {{institute_name}}
Institute Govt Code / संस्थान सरकारी कोड: {{institute_code}}
Institute Address / संस्थान का पता: {{institute_address}}
Authorized Signatory / अधिकृत हस्ताक्षरी: {{authorized_signatory}}

2. STUDENT DETAILS / छात्र का विवरण
Student Name / छात्र का नाम: {{student_name}}
Student ID / छात्र आईडी: {{student_code}}
Trade / व्यवसाय: {{trade_name}}
Session / सत्र: {{session}}
Year / वर्ष: {{year_label}}
Mobile / मोबाइल: {{student_mobile}}
Email ID / ई-मेल आईडी: {{student_email}}
Aadhaar No. / आधार संख्या: {{student_aadhaar}}
Student Address / छात्र का पता: {{student_address}}
Father's Name / पिता का नाम: {{father_name}}
Mother's Name / माता का नाम: {{mother_name}}

3. PARENT / GUARDIAN DETAILS / माता-पिता / अभिभावक का विवरण
Parent / Guardian Name / माता-पिता / अभिभावक का नाम: {{parent_name}}
Relation / संबंध: {{parent_relation}}
Mobile / मोबाइल: {{parent_mobile}}
Aadhaar No. / आधार संख्या: {{parent_aadhaar}}

4. ACADEMIC / PORTAL DETAILS / शैक्षणिक / पोर्टल विवरण
PRN Number / पीआरएन संख्या: {{prn_number}}
SCVT Registration Number / एससीवीटी पंजीकरण संख्या: {{scvt_number}}
Scholarship Status / छात्रवृत्ति स्थिति: {{scholarship_status}}
Scholarship ID / छात्रवृत्ति आईडी: {{scholarship_id}}

5. FEE STRUCTURE AGREED / सहमत शुल्क संरचना
Fee payable if scholarship is approved / छात्रवृत्ति स्वीकृत होने पर देय शुल्क: ₹ {{fees_if_scholarship}}
Fee payable if scholarship is not approved / rejected / cancelled / not credited / छात्रवृत्ति स्वीकृत न होने / अस्वीकृत / निरस्त / जमा न होने पर देय शुल्क: ₹ {{fees_if_no_scholarship}}
Final Fee as on date / वर्तमान अंतिम शुल्क: ₹ {{final_fee}}
Payment Status / भुगतान स्थिति: {{payment_status}}
Due Amount / बकाया राशि: ₹ {{due_amount}}

6. DECLARATION / घोषणा
I / We declare that the admission details, fee terms, scholarship details, documents, Aadhaar details, and declarations submitted by us are true and correct to the best of our knowledge.
यदि उपरोक्त विवरणों में कोई त्रुटि, मिथ्या घोषणा, बकाया देयता, या छात्रवृत्ति से संबंधित विवाद उत्पन्न होता है, तो संस्थान के नियम लागू होंगे।

7. SIGNATURES / हस्ताक्षर
Student Signature / छात्र हस्ताक्षर: ______________________________
Parent / Guardian Signature / अभिभावक हस्ताक्षर: ______________________________
Institute Authorized Signature / संस्थान अधिकृत हस्ताक्षर: ______________________________
Date / दिनांक: ______________________________`;

export type UndertakingTemplateData = {
  template: string;
  updatedAt: string | null;
};

export type UndertakingRenderInput = {
  undertaking_code: string;
  instituteName: string;
  instituteCode: string;
  instituteAddress: string;
  authorizedSignatory: string;
  place: string;
  studentName: string;
  studentCode: string;
  tradeName: string;
  session: string;
  yearLabel: string;
  studentMobile: string;
  studentEmail: string;
  studentAadhaar: string;
  studentAddress: string;
  fatherName: string;
  motherName: string;
  parentName: string;
  parentRelation: string;
  parentMobile: string;
  parentAadhaar: string;
  prnNumber: string;
  scvtNumber: string;
  scholarshipStatus: string;
  scholarshipId: string;
  feesIfScholarship: string;
  feesIfNoScholarship: string;
  finalFee: string;
  paymentStatus: string;
  dueAmount: string;
  currentDate: string;
};

function normalizeTemplatePayload(raw: string) {
  try {
    const parsed = JSON.parse(raw) as Partial<UndertakingTemplateData>;
    return {
      template: typeof parsed.template === "string" && parsed.template.trim() ? parsed.template : defaultUndertakingTemplate,
      updatedAt: typeof parsed.updatedAt === "string" ? parsed.updatedAt : null
    };
  } catch {
    return {
      template: defaultUndertakingTemplate,
      updatedAt: null
    };
  }
}

export async function readUndertakingTemplate(): Promise<UndertakingTemplateData> {
  try {
    const raw = await readFile(undertakingTemplateStoragePath, "utf8");
    return normalizeTemplatePayload(raw);
  } catch {
    return {
      template: defaultUndertakingTemplate,
      updatedAt: null
    };
  }
}

export async function saveUndertakingTemplate(template: string) {
  const payload: UndertakingTemplateData = {
    template: template.trim() || defaultUndertakingTemplate,
    updatedAt: new Date().toISOString()
  };

  await mkdir(path.dirname(undertakingTemplateStoragePath), { recursive: true });
  await writeFile(undertakingTemplateStoragePath, JSON.stringify(payload, null, 2), "utf8");

  return payload;
}

export function renderUndertakingTemplate(template: string, data: UndertakingRenderInput) {
  const replacements: Record<string, string> = {
    undertaking_code: data.undertaking_code,
    current_date: data.currentDate,
    place: data.place,
    institute_name: data.instituteName,
    institute_code: data.instituteCode,
    institute_address: data.instituteAddress,
    authorized_signatory: data.authorizedSignatory,
    student_name: data.studentName,
    student_code: data.studentCode,
    trade_name: data.tradeName,
    session: data.session,
    year_label: data.yearLabel,
    student_mobile: data.studentMobile,
    student_email: data.studentEmail,
    student_aadhaar: data.studentAadhaar,
    student_address: data.studentAddress,
    father_name: data.fatherName,
    mother_name: data.motherName,
    parent_name: data.parentName,
    parent_relation: data.parentRelation,
    parent_mobile: data.parentMobile,
    parent_aadhaar: data.parentAadhaar,
    prn_number: data.prnNumber,
    scvt_number: data.scvtNumber,
    scholarship_status: data.scholarshipStatus,
    scholarship_id: data.scholarshipId,
    fees_if_scholarship: data.feesIfScholarship,
    fees_if_no_scholarship: data.feesIfNoScholarship,
    final_fee: data.finalFee,
    payment_status: data.paymentStatus,
    due_amount: data.dueAmount
  };

  return Object.entries(replacements).reduce(
    (output, [key, value]) => output.replaceAll(`{{${key}}}`, value || "Not provided"),
    template
  );
}

export function formatUndertakingStatusLabel(status: string | VerificationStatus | null | undefined) {
  if (!status) return "Pending";
  return String(status)
    .toLowerCase()
    .split("_")
    .map((chunk) => chunk.charAt(0).toUpperCase() + chunk.slice(1))
    .join(" ");
}
