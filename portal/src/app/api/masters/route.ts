import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import {
  accountCategoryOptions,
  accountEntryTypeOptions,
  accountHeadOptions,
  accountSubHeadOptions,
  admissionModeOptions,
  genderOptions,
  parentRelationOptions,
  paymentModeOptions,
  sessionOptions,
  yearOptions
} from "@/lib/constants";
import { readClassificationMasters } from "@/lib/classification-masters";
import { readFinanceComplianceMasters } from "@/lib/finance-compliance-masters";
import { readSessionConfig } from "@/lib/session-config";

export async function GET() {
  const sessionConfig = await readSessionConfig();
  const classificationMasters = await readClassificationMasters();
  const financeComplianceMasters = await readFinanceComplianceMasters();
  const [institutes, trades, agents] = await Promise.all([
    prisma.institute.findMany({
      where: { status: true },
      orderBy: { instituteCode: "asc" }
    }),
    prisma.trade.findMany({
      where: { isActive: true },
      include: { institute: true },
      orderBy: [{ institute: { instituteCode: "asc" } }, { tradeCode: "asc" }]
    }),
    prisma.agent.findMany({
      where: { isActive: true },
      orderBy: { agentCode: "asc" }
    })
  ]);

  return NextResponse.json({
    institutes: institutes.map((item) => ({
      label: `${item.name} (${item.instituteCode})`,
      value: item.instituteCode,
      instituteCode: item.instituteCode,
      name: item.name,
      scvtCode: item.scvtCode,
      sidhCode: item.sidhCode,
      address: item.address
    })),
    trades: trades.map((item) => ({
      label: item.name,
      value: `${item.institute.instituteCode}::${item.tradeCode}`
    })),
    sessions: sessionOptions,
    activeAdmissionSessions: sessionConfig,
    years: yearOptions,
    genders: genderOptions,
    categories: classificationMasters.categories,
    religions: classificationMasters.religions,
    castes: classificationMasters.castes,
    qualifications: classificationMasters.qualifications,
    feeHeads: financeComplianceMasters.feeHeads,
    scholarshipSchemes: financeComplianceMasters.scholarshipSchemes,
    documentTypes: financeComplianceMasters.documentTypes,
    parentRelations: parentRelationOptions,
    admissionModes: admissionModeOptions,
    agents: [{ label: "No Agent", value: "" }, ...agents.map((item) => ({ label: `${item.name} (${item.agentCode})`, value: item.agentCode }))],
    paymentModes: paymentModeOptions,
    accountEntryTypes: accountEntryTypeOptions,
    accountCategories: accountCategoryOptions,
    accountHeads: accountHeadOptions,
    accountSubHeads: accountSubHeadOptions
  });
}
