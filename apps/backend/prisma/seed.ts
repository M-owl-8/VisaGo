import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

const COUNTRIES = [
  {
    name: "United States",
    code: "US",
    flagEmoji: "🇺🇸",
    description: "Travel to the United States",
    visaTypes: [
      {
        name: "Tourist Visa",
        description: "For tourism and leisure",
        processingDays: 10,
        validity: "10 years",
        fee: 160,
        requirements: '["Passport", "Photo", "DS-160 Form", "Interview"]',
        documentTypes: ["Passport", "Photo", "DS-160 Form"],
      },
      {
        name: "Work Visa",
        description: "For employment purposes",
        processingDays: 20,
        validity: "3 years",
        fee: 190,
        requirements: '["Passport", "Job Offer", "I-129 Form", "Interview"]',
        documentTypes: ["Passport", "Job Offer", "I-129 Form"],
      },
    ],
  },
  {
    name: "United Kingdom",
    code: "GB",
    flagEmoji: "🇬🇧",
    description: "Travel to the United Kingdom",
    visaTypes: [
      {
        name: "Standard Visitor Visa",
        description: "For tourism and visits",
        processingDays: 15,
        validity: "6 months",
        fee: 115,
        requirements: '["Passport", "Financial Evidence", "Accommodation Details"]',
        documentTypes: ["Passport", "Financial Evidence"],
      },
      {
        name: "Student Visa",
        description: "For full-time education",
        processingDays: 20,
        validity: "Duration of studies",
        fee: 719,
        requirements: '["Passport", "Acceptance Letter", "Financial Proof", "CAS"]',
        documentTypes: ["Passport", "Acceptance Letter", "Financial Proof"],
      },
    ],
  },
  {
    name: "Canada",
    code: "CA",
    flagEmoji: "🇨🇦",
    description: "Travel to Canada",
    visaTypes: [
      {
        name: "Visitor Visa",
        description: "For temporary stays",
        processingDays: 28,
        validity: "Up to 6 months",
        fee: 100,
        requirements: '["Passport", "Application Form", "Biometrics", "Interview"]',
        documentTypes: ["Passport", "Application Form"],
      },
      {
        name: "Work Permit",
        description: "For temporary employment",
        processingDays: 30,
        validity: "Duration of employment",
        fee: 0,
        requirements: '["Job Offer", "Labor Market Impact Assessment", "Passport"]',
        documentTypes: ["Job Offer", "Passport"],
      },
    ],
  },
  {
    name: "Germany",
    code: "DE",
    flagEmoji: "🇩🇪",
    description: "Travel to Germany",
    visaTypes: [
      {
        name: "Schengen Tourist Visa",
        description: "For tourism in Schengen area",
        processingDays: 15,
        validity: "90 days",
        fee: 80,
        requirements: '["Passport", "Application Form", "Photo", "Bank Statement"]',
        documentTypes: ["Passport", "Application Form", "Photo"],
      },
    ],
  },
  {
    name: "Japan",
    code: "JP",
    flagEmoji: "🇯🇵",
    description: "Travel to Japan",
    visaTypes: [
      {
        name: "Temporary Visitor",
        description: "For short-term visits",
        processingDays: 5,
        validity: "90 days",
        fee: 0,
        requirements: '["Passport valid 6+ months", "Return ticket", "Accommodation"]',
        documentTypes: ["Passport"],
      },
      {
        name: "Work Visa",
        description: "For employment in Japan",
        processingDays: 30,
        validity: "1-5 years",
        fee: 0,
        requirements: '["Passport", "Job Offer", "Certificate of Eligibility", "Application"]',
        documentTypes: ["Passport", "Job Offer"],
      },
    ],
  },
  {
    name: "Australia",
    code: "AU",
    flagEmoji: "🇦🇺",
    description: "Travel to Australia",
    visaTypes: [
      {
        name: "Visitor Visa",
        description: "For tourism and visiting",
        processingDays: 20,
        validity: "12 months",
        fee: 190,
        requirements: '["Passport", "Application Form", "Passport Photo", "Financial Evidence"]',
        documentTypes: ["Passport", "Application Form", "Financial Evidence"],
      },
    ],
  },
];

async function main() {
  console.log("🌍 Starting database seed...");

  for (const countryData of COUNTRIES) {
    try {
      const country = await prisma.country.upsert({
        where: { code: countryData.code },
        update: {},
        create: {
          name: countryData.name,
          code: countryData.code,
          flagEmoji: countryData.flagEmoji,
          description: countryData.description,
        },
      });

      console.log(`✓ Country created/updated: ${country.name}`);

      // Create visa types
      for (const visaType of countryData.visaTypes) {
        await prisma.visaType.upsert({
          where: {
            countryId_name: {
              countryId: country.id,
              name: visaType.name,
            },
          },
          update: {},
          create: {
            countryId: country.id,
            name: visaType.name,
            description: visaType.description,
            processingDays: visaType.processingDays,
            validity: visaType.validity,
            fee: visaType.fee,
            requirements: visaType.requirements,
            documentTypes: visaType.documentTypes,
          },
        });

        console.log(`  ✓ Visa type created: ${visaType.name}`);
      }
    } catch (error) {
      console.error(`✗ Error creating country ${countryData.name}:`, error);
    }
  }

  console.log("\n✅ Database seed completed!");
}

main()
  .then(async () => {
    await prisma.$disconnect();
  })
  .catch(async (e) => {
    console.error("❌ Seed error:", e);
    await prisma.$disconnect();
    process.exit(1);
  });