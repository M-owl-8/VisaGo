import { PrismaClient } from "@prisma/client";

// NOTE: In production, seeding is NON-DESTRUCTIVE.
// We only upsert reference data (countries, visa types) and we never delete user data.

const prisma = new PrismaClient();

// Detect production environment
const isProd =
  process.env.NODE_ENV === 'production' ||
  process.env.RAILWAY_ENVIRONMENT_NAME === 'production';

/**
 * Development seed: Clears all data and recreates reference data + demo data
 * WARNING: This deletes ALL user data (applications, documents, payments, etc.)
 */
async function seedDev() {
  console.log("🌱 Dev seed: clearing ALL data...");

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
 * NEVER deletes user data (User, VisaApplication, UserDocument, ChatMessage, Payment, etc.)
 */
async function seedProd() {
  console.log("🌱 Prod seed: seeding ONLY reference data (non-destructive)");
  
  // Only ensure countries and visaTypes exist using upsert
  await seedReferenceData();
}

/**
 * Shared function to seed reference data (countries and visa types)
 * Uses upsert to ensure data exists without deleting anything
 */
async function seedReferenceData() {
  // Define countries
  const countries = [
    {
      name: "United States",
      code: "US",
      flagEmoji: "🇺🇸",
      description: "Land of opportunity with various visa categories",
      requirements: JSON.stringify({
        minAge: 18,
        language: "English proficiency required for many visa types",
      }),
    },
    {
      name: "United Kingdom",
      code: "GB",
      flagEmoji: "🇬🇧",
      description: "Home to world-class universities and opportunities",
      requirements: JSON.stringify({
        minAge: 18,
        language: "English language requirement varies by visa type",
      }),
    },
    {
      name: "Spain",
      code: "ES",
      flagEmoji: "🇪🇸",
      description: "European charm with vibrant culture",
      requirements: JSON.stringify({
        minAge: 18,
        language: "A1 Spanish proficiency for most visas",
      }),
    },
    {
      name: "Germany",
      code: "DE",
      flagEmoji: "🇩🇪",
      description: "Economic powerhouse with strong job market",
      requirements: JSON.stringify({
        minAge: 18,
        language: "B1 German language proficiency required",
      }),
    },
    {
      name: "Japan",
      code: "JP",
      flagEmoji: "🇯🇵",
      description: "Land of innovation and tradition",
      requirements: JSON.stringify({
        minAge: 18,
        language: "Japanese language helpful but not always required",
      }),
    },
    {
      name: "United Arab Emirates",
      code: "AE",
      flagEmoji: "🇦🇪",
      description: "Modern Arab hub with thriving economy",
      requirements: JSON.stringify({
        minAge: 18,
        language: "English widely spoken",
      }),
    },
    {
      name: "Canada",
      code: "CA",
      flagEmoji: "🇨🇦",
      description: "North American destination known for quality of life",
      requirements: JSON.stringify({
        minAge: 18,
        language: "English or French proficiency required",
      }),
    },
    {
      name: "Australia",
      code: "AU",
      flagEmoji: "🇦🇺",
      description: "Southern hemisphere adventure with opportunity",
      requirements: JSON.stringify({
        minAge: 18,
        language: "English language requirement",
      }),
    },
  ];

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

  // Create visa types for each country
  const visaTypes = [
    // USA Visas
    {
      countryId: createdCountries[0].id,
      name: "B1/B2 Visitor Visa",
      description: "For tourism and business purposes",
      processingDays: 30,
      validity: "10 years",
      fee: 160,
      requirements: JSON.stringify({
        documents: ["passport", "photo", "visa_application", "financial_proof"],
      }),
      documentTypes: JSON.stringify([
        "passport",
        "passport_photo",
        "visa_application_form",
        "financial_proof",
        "employment_letter",
      ]),
    },
    {
      countryId: createdCountries[0].id,
      name: "F-1 Student Visa",
      description: "For students pursuing academic programs",
      processingDays: 45,
      validity: "Duration of study + 1 year",
      fee: 350,
      requirements: JSON.stringify({
        documents: [
          "i20_form",
          "passport",
          "bank_statement",
          "academic_records",
        ],
      }),
      documentTypes: JSON.stringify([
        "passport",
        "i20_form",
        "bank_statement",
        "academic_records",
        "visa_application_form",
      ]),
    },
    {
      countryId: createdCountries[0].id,
      name: "H-1B Work Visa",
      description: "For specialty occupation workers",
      processingDays: 60,
      validity: "3 years (renewable)",
      fee: 460,
      requirements: JSON.stringify({
        documents: ["passport", "job_offer", "degree_certificate", "passport_photo"],
      }),
      documentTypes: JSON.stringify([
        "passport",
        "job_offer_letter",
        "degree_certificate",
        "employment_verification",
        "passport_photo",
      ]),
    },

    // UK Visas
    {
      countryId: createdCountries[1].id,
      name: "Standard Visitor Visa",
      description: "For tourism, business, and family visits",
      processingDays: 20,
      validity: "6 months to 10 years",
      fee: 100,
      requirements: JSON.stringify({
        documents: [
          "passport",
          "financial_proof",
          "accommodation_proof",
          "travel_plans",
        ],
      }),
      documentTypes: JSON.stringify([
        "passport",
        "bank_statement",
        "accommodation_booking",
        "travel_itinerary",
        "passport_photo",
      ]),
    },
    {
      countryId: createdCountries[1].id,
      name: "Student Visa",
      description: "For students enrolled in UK educational institutions",
      processingDays: 30,
      validity: "Duration of course + 4 months",
      fee: 719,
      requirements: JSON.stringify({
        documents: ["cas_number", "passport", "bank_statement", "academic_records"],
      }),
      documentTypes: JSON.stringify([
        "passport",
        "cas_letter",
        "bank_statement",
        "degree_certificate",
        "ielts_certificate",
      ]),
    },
    {
      countryId: createdCountries[1].id,
      name: "Skilled Worker Visa",
      description: "For skilled professionals in shortage occupations",
      processingDays: 45,
      validity: "Up to 5 years",
      fee: 719,
      requirements: JSON.stringify({
        documents: ["job_offer", "passport", "diploma", "skills_assessment"],
      }),
      documentTypes: JSON.stringify([
        "passport",
        "job_offer_letter",
        "degree_certificate",
        "skills_assessment",
        "financial_proof",
      ]),
    },

    // Spain Visas
    {
      countryId: createdCountries[2].id,
      name: "Schengen Tourist Visa",
      description: "For short-term tourism in Spain and EU",
      processingDays: 15,
      validity: "90 days",
      fee: 80,
      requirements: JSON.stringify({
        documents: ["passport", "travel_itinerary", "financial_proof", "travel_insurance"],
      }),
      documentTypes: JSON.stringify([
        "passport",
        "travel_itinerary",
        "bank_statement",
        "travel_insurance",
        "accommodation_proof",
      ]),
    },
    {
      countryId: createdCountries[2].id,
      name: "Student Visa",
      description: "For students attending Spanish universities",
      processingDays: 30,
      validity: "1 year (renewable)",
      fee: 150,
      requirements: JSON.stringify({
        documents: ["admission_letter", "passport", "bank_statement", "accommodation"],
      }),
      documentTypes: JSON.stringify([
        "passport",
        "university_admission_letter",
        "bank_statement",
        "accommodation_proof",
        "spanish_level_certificate",
      ]),
    },
    {
      countryId: createdCountries[2].id,
      name: "Work Visa",
      description: "For employment opportunities in Spain",
      processingDays: 45,
      validity: "1 year (renewable)",
      fee: 200,
      requirements: JSON.stringify({
        documents: ["job_offer", "passport", "work_permit", "degree"],
      }),
      documentTypes: JSON.stringify([
        "passport",
        "job_offer_letter",
        "work_permit_application",
        "degree_certificate",
        "employment_contract",
      ]),
    },

    // Germany Visas
    {
      countryId: createdCountries[3].id,
      name: "Schengen Tourist Visa",
      description: "For tourism in Germany and Schengen area",
      processingDays: 14,
      validity: "90 days",
      fee: 80,
      requirements: JSON.stringify({
        documents: ["passport", "travel_itinerary", "financial_proof", "health_insurance"],
      }),
      documentTypes: JSON.stringify([
        "passport",
        "travel_itinerary",
        "bank_statement",
        "health_insurance",
        "accommodation_proof",
      ]),
    },
    {
      countryId: createdCountries[3].id,
      name: "Study Permit",
      description: "For students attending German universities",
      processingDays: 35,
      validity: "2 years (renewable)",
      fee: 75,
      requirements: JSON.stringify({
        documents: ["admission_letter", "passport", "financial_proof", "language_certificate"],
      }),
      documentTypes: JSON.stringify([
        "passport",
        "university_admission",
        "financial_statement",
        "german_language_test",
        "health_insurance",
      ]),
    },
    {
      countryId: createdCountries[3].id,
      name: "Work Visa",
      description: "For employment in Germany",
      processingDays: 50,
      validity: "2 years",
      fee: 220,
      requirements: JSON.stringify({
        documents: ["job_offer", "passport", "degree", "german_language_cert"],
      }),
      documentTypes: JSON.stringify([
        "passport",
        "job_offer_letter",
        "degree_certificate",
        "german_language_certificate",
        "employment_contract",
      ]),
    },

    // Japan Visas
    {
      countryId: createdCountries[4].id,
      name: "Temporary Visitor",
      description: "For tourism and short stays in Japan",
      processingDays: 10,
      validity: "90 days",
      fee: 0,
      requirements: JSON.stringify({
        documents: ["passport", "passport_photo", "travel_itinerary", "return_ticket"],
      }),
      documentTypes: JSON.stringify([
        "passport",
        "passport_photo",
        "travel_itinerary",
        "return_flight_ticket",
        "accommodation_proof",
      ]),
    },
    {
      countryId: createdCountries[4].id,
      name: "Student Visa",
      description: "For students in Japanese educational institutions",
      processingDays: 40,
      validity: "1-4 years",
      fee: 0,
      requirements: JSON.stringify({
        documents: ["admission_letter", "passport", "financial_proof", "sponsor_form"],
      }),
      documentTypes: JSON.stringify([
        "passport",
        "admission_letter",
        "financial_documents",
        "coe_certificate",
        "passport_photo",
      ]),
    },
    {
      countryId: createdCountries[4].id,
      name: "Work Visa",
      description: "For employment in Japan",
      processingDays: 45,
      validity: "1-3 years (renewable)",
      fee: 0,
      requirements: JSON.stringify({
        documents: ["job_offer", "passport", "degree", "certificate_of_eligibility"],
      }),
      documentTypes: JSON.stringify([
        "passport",
        "job_offer_letter",
        "degree_certificate",
        "coe_certificate",
        "employment_contract",
      ]),
    },

    // UAE Visas
    {
      countryId: createdCountries[5].id,
      name: "Tourist Visa",
      description: "For short-term tourism in UAE",
      processingDays: 5,
      validity: "30 days",
      fee: 50,
      requirements: JSON.stringify({
        documents: ["passport", "passport_photo", "financial_proof", "return_ticket"],
      }),
      documentTypes: JSON.stringify([
        "passport",
        "passport_photo",
        "bank_statement",
        "return_flight_ticket",
        "accommodation_proof",
      ]),
    },
    {
      countryId: createdCountries[5].id,
      name: "Work Visa",
      description: "For employment opportunities in UAE",
      processingDays: 30,
      validity: "2 years (renewable)",
      fee: 250,
      requirements: JSON.stringify({
        documents: ["job_offer", "passport", "medical_test", "background_check"],
      }),
      documentTypes: JSON.stringify([
        "passport",
        "job_offer_letter",
        "employment_contract",
        "medical_examination",
        "police_clearance",
      ]),
    },
    {
      countryId: createdCountries[5].id,
      name: "Student Visa",
      description: "For students in UAE institutions",
      processingDays: 20,
      validity: "Duration of study",
      fee: 100,
      requirements: JSON.stringify({
        documents: ["admission_letter", "passport", "sponsor_approval", "financial_proof"],
      }),
      documentTypes: JSON.stringify([
        "passport",
        "admission_letter",
        "sponsor_letter",
        "bank_statement",
        "passport_photo",
      ]),
    },

    // Canada Visas
    {
      countryId: createdCountries[6].id,
      name: "Visitor Visa",
      description: "For tourism, business, and family visits",
      processingDays: 25,
      validity: "Up to 10 years",
      fee: 100,
      requirements: JSON.stringify({
        documents: ["passport", "financial_proof", "travel_itinerary", "ties_to_home"],
      }),
      documentTypes: JSON.stringify([
        "passport",
        "bank_statement",
        "travel_itinerary",
        "employment_letter",
        "property_documents",
      ]),
    },
    {
      countryId: createdCountries[6].id,
      name: "Study Permit",
      description: "For students in Canadian institutions",
      processingDays: 35,
      validity: "Duration of study + 3 months",
      fee: 150,
      requirements: JSON.stringify({
        documents: ["loa_letter", "passport", "financial_proof", "medical_exam"],
      }),
      documentTypes: JSON.stringify([
        "passport",
        "loa_letter",
        "financial_proof",
        "medical_examination",
        "police_clearance",
      ]),
    },
    {
      countryId: createdCountries[6].id,
      name: "Express Entry Work Visa",
      description: "For skilled workers through Express Entry program",
      processingDays: 90,
      validity: "Up to 3 years",
      fee: 550,
      requirements: JSON.stringify({
        documents: ["job_offer", "language_test", "education_credentials", "medical_exam"],
      }),
      documentTypes: JSON.stringify([
        "passport",
        "language_test_results",
        "education_certificate",
        "job_offer_letter",
        "police_clearance",
      ]),
    },

    // Australia Visas
    {
      countryId: createdCountries[7].id,
      name: "Visitor Visa",
      description: "For tourism and family visits to Australia",
      processingDays: 20,
      validity: "Usually 1 year",
      fee: 145,
      requirements: JSON.stringify({
        documents: ["passport", "financial_proof", "travel_itinerary", "accommodation"],
      }),
      documentTypes: JSON.stringify([
        "passport",
        "bank_statement",
        "travel_itinerary",
        "accommodation_booking",
        "employment_letter",
      ]),
    },
    {
      countryId: createdCountries[7].id,
      name: "Student Visa",
      description: "For students in Australian educational institutions",
      processingDays: 45,
      validity: "Duration of course + 6 months",
      fee: 620,
      requirements: JSON.stringify({
        documents: ["coe_number", "passport", "financial_proof", "medical_exam"],
      }),
      documentTypes: JSON.stringify([
        "passport",
        "coe_confirmation",
        "financial_proof",
        "medical_examination",
        "police_clearance",
      ]),
    },
    {
      countryId: createdCountries[7].id,
      name: "Skilled Migration Visa",
      description: "For skilled professionals planning to work in Australia",
      processingDays: 60,
      validity: "Permanent resident status",
      fee: 3600,
      requirements: JSON.stringify({
        documents: ["skills_assessment", "language_test", "occupation_list", "points_test"],
      }),
      documentTypes: JSON.stringify([
        "passport",
        "skills_assessment",
        "ielts_certificate",
        "occupation_certificate",
        "police_clearance",
      ]),
    },
  ];

  // Upsert visa types (create if not exists, update if exists)
  await Promise.all(
    visaTypes.map((visaType) =>
      prisma.visaType.upsert({
        where: {
          countryId_name: {
            countryId: visaType.countryId,
            name: visaType.name,
          },
        },
        update: {
          description: visaType.description,
          processingDays: visaType.processingDays,
          validity: visaType.validity,
          fee: visaType.fee,
          requirements: visaType.requirements,
          documentTypes: visaType.documentTypes,
        },
        create: visaType,
      })
    )
  );

  console.log(`✅ Upserted ${visaTypes.length} visa types`);
}

async function main() {
  console.log("🌱 Starting database seed...");

  if (isProd) {
    await seedProd();
  } else {
    await seedDev();
  }

  console.log("✨ Database seed completed successfully!");
}

main()
  .catch((e) => {
    console.error("❌ Seed failed:", e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });