import { PrismaClient } from "@prisma/client";
import { ISO_COUNTRIES } from "../src/data/countries-iso2";

// NOTE: In production, seeding is NON-DESTRUCTIVE.
// We only upsert reference data (countries, visa types) and we never delete user data.

const prisma = new PrismaClient();

// Detect production environment
const isProd =
  process.env.NODE_ENV === 'production' ||
  process.env.RAILWAY_ENVIRONMENT_NAME === 'production';

// Check if destructive operations are allowed
const allowWipe = process.env.ALLOW_DB_WIPE === 'true';

const canonicalVisaTypes = [
  {
    name: "Tourist Visa",
    description: "Generic tourist/visitor visa",
    processingDays: 30,
    validity: "Up to 90 days (typical short stay)",
    fee: 0,
    documentTypes: [
      "passport",
      "passport_photo",
      "visa_application_form",
      "financial_proof",
      "travel_itinerary",
      "accommodation_proof",
    ],
  },
  {
    name: "Business Visa",
    description: "Business visits, meetings, conferences",
    processingDays: 30,
    validity: "Up to 90 days (typical short stay)",
    fee: 0,
    documentTypes: [
      "passport",
      "passport_photo",
      "visa_application_form",
      "invitation_letter",
      "company_letter",
      "financial_proof",
    ],
  },
  {
    name: "Work Visa",
    description: "Employment / skilled worker",
    processingDays: 45,
    validity: "One year (extendable, generic placeholder)",
    fee: 0,
    documentTypes: [
      "passport",
      "passport_photo",
      "employment_contract",
      "work_permit",
      "financial_proof",
      "visa_application_form",
    ],
  },
  {
    name: "Student Visa",
    description: "Academic / language study",
    processingDays: 45,
    validity: "Course duration (generic placeholder)",
    fee: 0,
    documentTypes: [
      "passport",
      "passport_photo",
      "university_admission",
      "financial_proof",
      "visa_application_form",
      "accommodation_proof",
    ],
  },
  {
    name: "Family/Visitor Visa",
    description: "Family or private visit",
    processingDays: 30,
    validity: "Up to 90 days (typical short stay)",
    fee: 0,
    documentTypes: [
      "passport",
      "passport_photo",
      "invitation_letter",
      "relationship_proof",
      "financial_proof",
      "accommodation_proof",
    ],
  },
  {
    name: "Transit Visa",
    description: "Airport or short transit",
    processingDays: 10,
    validity: "Single entry transit",
    fee: 0,
    documentTypes: [
      "passport",
      "ongoing_ticket",
      "visa_for_final_destination",
      "accommodation_proof",
    ],
  },
];

function codeToFlag(code: string): string {
  if (!code || code.length !== 2) return "🏳️";
  const base = 0x1f1e6;
  const upper = code.toUpperCase();
  const chars = upper.split("").map((c) => base + (c.charCodeAt(0) - 65));
  return String.fromCodePoint(...chars);
}

/**
 * Development seed: Clears all data and recreates reference data + demo data
 * WARNING: This deletes ALL user data (applications, documents, payments, etc.)
 * ONLY runs if ALLOW_DB_WIPE=true is explicitly set
 */
async function seedDev() {
  console.log("[Seed] NODE_ENV=", process.env.NODE_ENV, "ALLOW_DB_WIPE=", process.env.ALLOW_DB_WIPE);
  
  if (!allowWipe) {
    console.log("🌱 Dev seed: Skipping destructive data wipe (ALLOW_DB_WIPE not set to 'true')");
    console.log("🌱 Dev seed: Only upserting reference data (non-destructive)");
    await seedReferenceData();
    return;
  }

  console.log("🌱 Dev seed: clearing ALL data... (ALLOW_DB_WIPE=true)");

  // Clear existing data in correct order (child records first, then parent records)
  // This prevents foreign key constraint violations
  console.log("🗑️  Clearing existing data...");
  
  // Delete child records that reference VisaApplication
  await prisma.checkpoint.deleteMany({});
  await prisma.userDocument.deleteMany({});
  await prisma.payment.deleteMany({});
  
  // Delete applications that reference VisaType and Country
  await prisma.visaApplication.deleteMany({});
  await prisma.application.deleteMany({});
  
  // Now safe to delete VisaType and Country
  await prisma.visaType.deleteMany({});
  await prisma.country.deleteMany({});
  
  console.log("✅ Existing data cleared");

  // Create countries and visa types (shared data)
  await seedReferenceData();
}

/**
 * Production seed: Only upserts reference data (countries, visa types)
 * NEVER deletes user data (User, VisaApplication, UserDocument, ChatMessage, ChatSession, Payment, etc.)
 */
async function seedProd() {
  console.log("[Seed] NODE_ENV=", process.env.NODE_ENV, "ALLOW_DB_WIPE=", process.env.ALLOW_DB_WIPE);
  console.log("🌱 Prod seed: seeding ONLY reference data (non-destructive)");
  console.log("🌱 Prod seed: Skipping destructive data wipe (production mode)");
  
  // Only ensure countries and visaTypes exist using upsert
  await seedReferenceData();
}

/**
 * Shared function to seed reference data (countries and visa types)
 * Uses upsert to ensure data exists without deleting anything
 */
async function seedReferenceData() {
  // Build full ISO country list with generated flags
  const countries = ISO_COUNTRIES.map((c) => ({
    name: c.name,
    code: c.code.toUpperCase(),
    flagEmoji: codeToFlag(c.code),
    description: `Auto-generated country record for ${c.name}`,
    requirements: JSON.stringify({
      notes: "Auto-generated reference data. Update in DB as needed.",
    }),
  }));

  // Upsert countries (create if not exists, update if exists)
  const createdCountries = await Promise.all(
    countries.map((country) =>
      prisma.country.upsert({
        where: { code: country.code },
        update: {
          name: country.name,
          flagEmoji: country.flagEmoji,
          description: country.description,
          requirements: country.requirements,
        },
        create: country,
      })
    )
  );

  console.log(`✅ Upserted ${createdCountries.length} countries`);

  let visaTypeCount = 0;

  // Create canonical visa types for every country (non-destructive upsert)
  for (const country of createdCountries) {
    await Promise.all(
      canonicalVisaTypes.map((template) =>
        prisma.visaType.upsert({
          where: {
            countryId_name: {
              countryId: country.id,
              name: template.name,
            },
          },
          update: {
            description: template.description,
            processingDays: template.processingDays,
            validity: template.validity,
            fee: template.fee,
            requirements: JSON.stringify({
              notes: "Auto-generated; customize in Railway/Prisma as needed.",
              canonicalType: template.name,
            }),
            documentTypes: JSON.stringify(template.documentTypes),
          },
          create: {
            countryId: country.id,
            name: template.name,
            description: template.description,
            processingDays: template.processingDays,
            validity: template.validity,
            fee: template.fee,
            requirements: JSON.stringify({
              notes: "Auto-generated; customize in Railway/Prisma as needed.",
              canonicalType: template.name,
            }),
            documentTypes: JSON.stringify(template.documentTypes),
          },
        })
      )
    );
    visaTypeCount += canonicalVisaTypes.length;
  }

  console.log(`✅ Upserted ${visaTypeCount} visa types (${canonicalVisaTypes.length} per country)`);
}

async function main() {
  if (isProd) {
    await seedProd();
  } else {
    await seedDev();
  }
}

main()
  .then(async () => {
    await prisma.$disconnect();
  })
  .catch(async (e) => {
    console.error(e);
    await prisma.$disconnect();
    process.exit(1);
  });




