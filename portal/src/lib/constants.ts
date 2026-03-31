import type { AdmissionFormDefaults, SelectOption, StudentDirectoryRow } from "@/lib/types";
import { indiaStateOptions } from "@/lib/address-masters";

export const yearOptions: SelectOption[] = [
  { label: "1st Year", value: "1st" },
  { label: "2nd Year", value: "2nd" }
];

export const qualificationOptions: SelectOption[] = [
  { label: "10th", value: "TENTH" },
  { label: "12th", value: "TWELFTH" },
  { label: "ITI", value: "ITI" },
  { label: "Diploma", value: "DIPLOMA" },
  { label: "Graduation", value: "GRADUATION" },
  { label: "Other", value: "OTHER" }
];

export const sessionOptions: SelectOption[] = [
  { label: "2025-26", value: "2025-26" },
  { label: "2026-27", value: "2026-27" },
  { label: "2027-28", value: "2027-28" }
];

export const oneYearAdmissionSessionOptions: SelectOption[] = [
  { label: "2025-26", value: "2025-26" },
  { label: "2026-27", value: "2026-27" },
  { label: "2027-28", value: "2027-28" }
];

export const twoYearAdmissionSessionOptions: SelectOption[] = [
  { label: "2025-27", value: "2025-27" },
  { label: "2026-28", value: "2026-28" },
  { label: "2027-29", value: "2027-29" }
];

export const genderOptions: SelectOption[] = [
  { label: "Male", value: "MALE" },
  { label: "Female", value: "FEMALE" },
  { label: "Other", value: "OTHER" }
];

export const categoryOptions: SelectOption[] = [
  { label: "General", value: "GENERAL" },
  { label: "OBC", value: "OBC" },
  { label: "SC", value: "SC" },
  { label: "ST", value: "ST" },
  { label: "Other", value: "OTHER" }
];

export const countryOptions: SelectOption[] = [
  { label: "India", value: "India" }
];

export const stateOptions: SelectOption[] = indiaStateOptions;

export const parentRelationOptions: SelectOption[] = [
  { label: "Father", value: "FATHER" },
  { label: "Mother", value: "MOTHER" },
  { label: "Guardian", value: "GUARDIAN" }
];

export const admissionModeOptions: SelectOption[] = [
  { label: "Direct", value: "DIRECT" },
  { label: "Agent", value: "AGENT" }
];

export const instituteOptions: SelectOption[] = [
  { label: "Adarsh Rashtriya Private ITI (ITI01)", value: "ITI01" },
  { label: "Babu Harbansh Bahadur Singh Private ITI (ITI02)", value: "ITI02" }
];

export const tradeOptions: SelectOption[] = [
  { label: "Electrician", value: "ITI01::EL" },
  { label: "Fitter", value: "ITI01::FT" },
  { label: "Electronic Mechanic", value: "ITI01::EM" },
  { label: "Dress-Making", value: "ITI01::DM" },
  { label: "Electrician", value: "ITI02::EL" },
  { label: "Fitter", value: "ITI02::FT" }
];

export const tradeUnitCatalog: Record<
  string,
  {
    durationYears: number;
    unitCount: number;
    seatsPerUnit: number;
  }
> = {
  "ITI01::EM": { durationYears: 2, unitCount: 2, seatsPerUnit: 24 },
  "ITI01::EL": { durationYears: 2, unitCount: 3, seatsPerUnit: 20 },
  "ITI01::FT": { durationYears: 2, unitCount: 3, seatsPerUnit: 20 },
  "ITI01::DM": { durationYears: 1, unitCount: 1, seatsPerUnit: 20 },
  "ITI02::EL": { durationYears: 2, unitCount: 9, seatsPerUnit: 20 },
  "ITI02::FT": { durationYears: 2, unitCount: 9, seatsPerUnit: 20 }
};

export const agentOptions: SelectOption[] = [
  { label: "No Agent", value: "" },
  { label: "Agent A", value: "AG001" },
  { label: "Agent B", value: "AG002" }
];

export const paymentModeOptions: SelectOption[] = [
  { label: "Cash", value: "CASH" },
  { label: "UPI", value: "UPI" },
  { label: "Online", value: "ONLINE" },
  { label: "Bank Transfer", value: "BANK_TRANSFER" },
  { label: "Agent Collection", value: "AGENT_COLLECTION" }
];

export const accountEntryTypeOptions: SelectOption[] = [
  { label: "Opening Balance", value: "OPENING_BALANCE" },
  { label: "Expense", value: "EXPENSE" },
  { label: "Income", value: "INCOME" },
  { label: "Cash Deposit In Bank", value: "BANK_DEPOSIT" }
];

export const accountCategoryOptions: SelectOption[] = [
  { label: "Office Expense", value: "OFFICE_EXPENSE" },
  { label: "Electricity", value: "ELECTRICITY" },
  { label: "Rent", value: "RENT" },
  { label: "Salary", value: "SALARY" },
  { label: "Maintenance", value: "MAINTENANCE" },
  { label: "Travel", value: "TRAVEL" },
  { label: "Admission Fee", value: "ADMISSION_FEE" },
  { label: "Other", value: "OTHER" }
];

export const accountHeadOptions: Record<string, SelectOption[]> = {
  OPENING_BALANCE: [
    { label: "Opening Cash", value: "OPENING_CASH" }
  ],
  EXPENSE: [
    { label: "Administrative Expense", value: "ADMINISTRATIVE_EXPENSE" },
    { label: "Utilities", value: "UTILITIES" },
    { label: "Salary & Wages", value: "SALARY_WAGES" },
    { label: "Building & Maintenance", value: "BUILDING_MAINTENANCE" },
    { label: "Travel & Conveyance", value: "TRAVEL_CONVEYANCE" },
    { label: "Student Welfare", value: "STUDENT_WELFARE" },
    { label: "Other Expense", value: "OTHER_EXPENSE" }
  ],
  INCOME: [
    { label: "Admission Income", value: "ADMISSION_INCOME" },
    { label: "Fee Collection", value: "FEE_COLLECTION" },
    { label: "Other Income", value: "OTHER_INCOME" }
  ],
  BANK_DEPOSIT: [
    { label: "Cash Deposit To Bank", value: "CASH_DEPOSIT_TO_BANK" }
  ]
};

export const accountSubHeadOptions: Record<string, SelectOption[]> = {
  OPENING_CASH: [
    { label: "Daily Opening Balance", value: "DAILY_OPENING_BALANCE" }
  ],
  ADMINISTRATIVE_EXPENSE: [
    { label: "Stationery", value: "STATIONERY" },
    { label: "Printing", value: "PRINTING" },
    { label: "Office Supplies", value: "OFFICE_SUPPLIES" }
  ],
  UTILITIES: [
    { label: "Electricity Bill", value: "ELECTRICITY_BILL" },
    { label: "Internet", value: "INTERNET" },
    { label: "Water Bill", value: "WATER_BILL" }
  ],
  SALARY_WAGES: [
    { label: "Teaching Staff", value: "TEACHING_STAFF" },
    { label: "Office Staff", value: "OFFICE_STAFF" },
    { label: "Support Staff", value: "SUPPORT_STAFF" }
  ],
  BUILDING_MAINTENANCE: [
    { label: "Rent", value: "RENT" },
    { label: "Repair", value: "REPAIR" },
    { label: "Cleaning", value: "CLEANING" }
  ],
  TRAVEL_CONVEYANCE: [
    { label: "Fuel", value: "FUEL" },
    { label: "Local Travel", value: "LOCAL_TRAVEL" }
  ],
  STUDENT_WELFARE: [
    { label: "Uniform", value: "UNIFORM" },
    { label: "Workshop Material", value: "WORKSHOP_MATERIAL" }
  ],
  OTHER_EXPENSE: [
    { label: "Miscellaneous", value: "MISCELLANEOUS" }
  ],
  ADMISSION_INCOME: [
    { label: "New Admission", value: "NEW_ADMISSION" }
  ],
  FEE_COLLECTION: [
    { label: "Student Fee", value: "STUDENT_FEE" },
    { label: "Agent Collection", value: "AGENT_COLLECTION" }
  ],
  OTHER_INCOME: [
    { label: "Miscellaneous Income", value: "MISCELLANEOUS_INCOME" }
  ],
  CASH_DEPOSIT_TO_BANK: [
    { label: "Main Bank Account", value: "MAIN_BANK_ACCOUNT" },
    { label: "Other Bank Account", value: "OTHER_BANK_ACCOUNT" }
  ]
};

export const admissionFormDefaults: AdmissionFormDefaults = {
  sourceEnquiryId: "",
  instituteId: "",
  tradeId: "",
  enrollmentNumber: "",
  unitNumber: "",
  session: "2026-27",
  yearLabel: "1st",
  admissionDate: "",
  admissionType: "DIRECT",
  admissionStatusLabel: "REGISTERED",
  seatType: "REGULAR",
  rollNumber: "",
  batchLabel: "",
  shiftLabel: "",
  fullName: "",
  dateOfBirth: "",
  mobile: "",
  alternateMobile: "",
  email: "",
  gender: "",
  category: "",
  caste: "",
  religion: "",
  incomeDetails: "",
  domicileDetails: "",
  minorityStatus: false,
  disabilityStatus: false,
  maritalStatus: "",
  country: "India",
  stateName: "Uttar Pradesh",
  district: "",
  tehsil: "",
  block: "",
  ward: "",
  areaVillage: "",
  address: "",
  fatherName: "",
  motherName: "",
  studentAadhaar: "",
  parentRelation: "FATHER",
  parentName: "",
  parentMobile: "",
  parentAadhaar: "",
  qualifications: [
    {
      qualificationLevel: "TENTH",
      schoolName: "",
      boardUniversity: "",
      certificateNumber: "",
      passingYear: "",
      percentage: "",
      rollNumber: ""
    }
  ],
  isPassed: false,
  scholarshipApplied: false,
  incomeCertificateNumber: "",
  admissionMode: "DIRECT",
  agentId: "",
  notes: ""
};

export const studentDirectoryRows: StudentDirectoryRow[] = [
  {
    id: "stu_1",
    photoUrl: null,
    studentCode: "ITI01-EL-2026-001",
    fullName: "Ashish Singh",
    instituteCode: "ITI01",
    instituteName: "Adarsh Rashtriya Private ITI",
    tradeName: "Electrician",
    unitNumber: "1",
    session: "2026-27",
    yearLabel: "1st",
    mobile: "9919101755",
    status: "IN_PROGRESS",
    documentsStatus: "PENDING",
    eligibilityStatus: "VERIFIED",
    dueAmount: "15000"
  },
  {
    id: "stu_2",
    photoUrl: null,
    studentCode: "ITI01-FT-2026-001",
    fullName: "Shubham Singh",
    instituteCode: "ITI01",
    instituteName: "Adarsh Rashtriya Private ITI",
    tradeName: "Fitter",
    unitNumber: "1",
    session: "2026-27",
    yearLabel: "1st",
    mobile: "9336910172",
    status: "UNDER_REVIEW",
    documentsStatus: "PENDING",
    eligibilityStatus: "PENDING",
    dueAmount: "18000"
  },
  {
    id: "stu_3",
    photoUrl: null,
    studentCode: "ITI02-EL-2026-001",
    fullName: "Shyam",
    instituteCode: "ITI02",
    instituteName: "Babu Harbansh Bahadur Singh Private ITI",
    tradeName: "Electrician",
    unitNumber: "1",
    session: "2026-27",
    yearLabel: "1st",
    mobile: "9318448468",
    status: "UNDER_REVIEW",
    documentsStatus: "INCOMPLETE",
    eligibilityStatus: "PENDING",
    dueAmount: "15000"
  }
];
