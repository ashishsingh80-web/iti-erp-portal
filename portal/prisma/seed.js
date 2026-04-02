const { PrismaClient } = require("@prisma/client");
const { randomBytes, scryptSync } = require("crypto");

const prisma = new PrismaClient();

function hashPassword(password) {
  const salt = randomBytes(16).toString("hex");
  const hash = scryptSync(password, salt, 64).toString("hex");
  return `${salt}:${hash}`;
}

async function main() {
  // BHB / school ERP demo logins (dev only — change passwords in production).
  // Includes legacy @itierp.local aliases so older DBs work after re-seed; BHB emails are preferred for new setups.
  const users = [
    { email: "admin@bhb.local", name: "BHB School — Admin", role: "ADMIN", password: "Admin@123" },
    { email: "admin@itierp.local", name: "Legacy ITI — Admin", role: "ADMIN", password: "Admin@123" },
    { email: "admission@bhb.local", name: "BHB School — Admission", role: "ADMISSION_STAFF", password: "Admission@123" },
    { email: "admission@itierp.local", name: "Legacy ITI — Admission", role: "ADMISSION_STAFF", password: "Admission@123" },
    { email: "documents@bhb.local", name: "BHB School — Documents", role: "DOCUMENT_VERIFIER", password: "Documents@123" },
    { email: "documents@itierp.local", name: "Legacy ITI — Documents", role: "DOCUMENT_VERIFIER", password: "Documents@123" },
    { email: "finance@bhb.local", name: "BHB School — Finance", role: "FINANCE_DESK", password: "Finance@123" },
    { email: "finance@itierp.local", name: "Legacy ITI — Finance", role: "FINANCE_DESK", password: "Finance@123" },
    { email: "scholarship@bhb.local", name: "BHB School — Scholarship", role: "SCHOLARSHIP_DESK", password: "Scholarship@123" },
    { email: "scholarship@itierp.local", name: "Legacy ITI — Scholarship", role: "SCHOLARSHIP_DESK", password: "Scholarship@123" },
    { email: "prn@bhb.local", name: "BHB School — PRN / SCVT", role: "PRN_SCVT_DESK", password: "PrnScvt@123" },
    { email: "prn@itierp.local", name: "Legacy ITI — PRN / SCVT", role: "PRN_SCVT_DESK", password: "PrnScvt@123" }
  ];

  for (const user of users) {
    await prisma.user.upsert({
      where: { email: user.email },
      update: {
        name: user.name,
        role: user.role,
        isActive: true,
        passwordHash: hashPassword(user.password)
      },
      create: {
        email: user.email,
        name: user.name,
        role: user.role,
        isActive: true,
        passwordHash: hashPassword(user.password)
      }
    });
  }
  console.log("Seeded auth users.");

  const institutes = [
    {
      instituteCode: "ITI01",
      name: "Adarsh Rashtriya Private ITI",
      scvtCode: "1633",
      sidhCode: null,
      address: "Cholapur, Varanasi"
    },
    {
      instituteCode: "ITI02",
      name: "Babu Harbansh Bahadur Singh Private ITI",
      scvtCode: "1703",
      sidhCode: null,
      address: "Jagdishpur, Cholapur, Varanasi"
    }
  ];

  try {
    for (const institute of institutes) {
      await prisma.institute.upsert({
        where: { instituteCode: institute.instituteCode },
        update: institute,
        create: institute
      });
    }
  } catch (error) {
    console.warn("Skipping institute seed due to validation mismatch:", error?.message || error);
  }

  const instituteMap = Object.fromEntries(
    (await prisma.institute.findMany()).map((item) => [item.instituteCode, item.id])
  );

  const trades = [
    { instituteCode: "ITI01", tradeCode: "EL", name: "Electrician", duration: "2 Years", ncvtScvt: "NCVT", standardFees: 25000 },
    { instituteCode: "ITI01", tradeCode: "FT", name: "Fitter", duration: "2 Years", ncvtScvt: "NCVT", standardFees: 30000 },
    { instituteCode: "ITI01", tradeCode: "EM", name: "Electronic Mechanic", duration: "2 Years", ncvtScvt: "NCVT", standardFees: 32000 },
    { instituteCode: "ITI01", tradeCode: "DM", name: "Dress-Making", duration: "1 Year", ncvtScvt: "NCVT", standardFees: 18000 },
    { instituteCode: "ITI02", tradeCode: "EL", name: "Electrician", duration: "2 Years", ncvtScvt: "NCVT", standardFees: 35000 },
    { instituteCode: "ITI02", tradeCode: "FT", name: "Fitter", duration: "2 Years", ncvtScvt: "NCVT", standardFees: 30000 }
  ];

  try {
    for (const trade of trades) {
      if (!instituteMap[trade.instituteCode]) continue;
      await prisma.trade.upsert({
        where: {
          instituteId_tradeCode: {
            instituteId: instituteMap[trade.instituteCode],
            tradeCode: trade.tradeCode
          }
        },
        update: {
          name: trade.name,
          duration: trade.duration,
          ncvtScvt: trade.ncvtScvt,
          standardFees: trade.standardFees
        },
        create: {
          instituteId: instituteMap[trade.instituteCode],
          tradeCode: trade.tradeCode,
          name: trade.name,
          duration: trade.duration,
          ncvtScvt: trade.ncvtScvt,
          standardFees: trade.standardFees
        }
      });
    }
  } catch (error) {
    console.warn("Skipping trade seed due to validation mismatch:", error?.message || error);
  }

  const agents = [
    { agentCode: "AG001", name: "Agent A", mobile: "9000000001" },
    { agentCode: "AG002", name: "Agent B", mobile: "9000000002" }
  ];

  try {
    for (const agent of agents) {
      await prisma.agent.upsert({
        where: { agentCode: agent.agentCode },
        update: agent,
        create: agent
      });
    }
  } catch (error) {
    console.warn("Skipping agent seed due to validation mismatch:", error?.message || error);
  }
}

main()
  .then(async () => {
    await prisma.$disconnect();
  })
  .catch(async (error) => {
    console.error(error);
    await prisma.$disconnect();
    process.exit(1);
  });
