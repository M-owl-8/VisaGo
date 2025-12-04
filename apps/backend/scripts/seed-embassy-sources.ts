// apps/backend/src/scripts/seed-embassy-sources.ts
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

const SOURCES = [
  // United States
  {
    countryCode: 'US',
    visaType: 'tourist',
    url: 'https://travel.state.gov/content/travel/en/us-visas/tourism-visit/visitor.html',
    name: 'USA B-1/B-2 Visitor Visa – Official',
    description: 'Official U.S. Department of State information for visitor (tourist/business) visas.',
    priority: 10,
  },
  {
    countryCode: 'US',
    visaType: 'student',
    url: 'https://travel.state.gov/content/travel/en/us-visas/study/student-visa.html',
    name: 'USA F-1 Student Visa – Official',
    description: 'Official U.S. Department of State information for F-1/M-1 student visas.',
    priority: 10,
  },

  // Canada
  {
    countryCode: 'CA',
    visaType: 'tourist',
    url: 'https://www.canada.ca/en/immigration-refugees-citizenship/services/visit-canada.html',
    name: 'Canada Visitor Visa – IRCC',
    description: 'Government of Canada page for visitor visas and eTAs.',
    priority: 9,
  },
  {
    countryCode: 'CA',
    visaType: 'student',
    url: 'https://www.canada.ca/en/immigration-refugees-citizenship/services/study-canada.html',
    name: 'Canada Study Permit – IRCC',
    description: 'Government of Canada page for international students and study permits.',
    priority: 9,
  },

  // United Kingdom
  {
    countryCode: 'GB',
    visaType: 'tourist',
    url: 'https://www.gov.uk/standard-visitor',
    name: 'UK Standard Visitor Visa – GOV.UK',
    description: 'Official UK guidance for Standard Visitor visas.',
    priority: 9,
  },
  {
    countryCode: 'GB',
    visaType: 'student',
    url: 'https://www.gov.uk/student-visa',
    name: 'UK Student Visa – GOV.UK',
    description: 'Official UK guidance for Student visas.',
    priority: 9,
  },

  // Australia
  {
    countryCode: 'AU',
    visaType: 'tourist',
    url: 'https://immi.homeaffairs.gov.au/visas/getting-a-visa/visa-listing/visitor-600',
    name: 'Australia Visitor Visa (600) – Home Affairs',
    description: 'Australian visitor visa information from the Department of Home Affairs.',
    priority: 8,
  },
  {
    countryCode: 'AU',
    visaType: 'student',
    url: 'https://immi.homeaffairs.gov.au/visas/getting-a-visa/visa-listing/student-500',
    name: 'Australia Student Visa (500) – Home Affairs',
    description: 'Student visa information from the Australian Department of Home Affairs.',
    priority: 8,
  },

  // Germany
  {
    countryCode: 'DE',
    visaType: 'tourist',
    url: 'https://www.germany-visa.org/tourist-visa/',
    name: 'Germany Schengen Tourist Visa',
    description: 'Information about German Schengen tourist visas. NOTE: This is a third-party site - should be replaced with official embassy/consulate URL later.',
    priority: 7,
  },
  {
    countryCode: 'DE',
    visaType: 'student',
    url: 'https://www.germany-visa.org/student-visa/',
    name: 'Germany Student Visa',
    description: 'Overview of German national visas for students.',
    priority: 7,
  },

  // Spain
  {
    countryCode: 'ES',
    visaType: 'tourist',
    url: 'https://www.exteriores.gob.es/en/Paginas/index.aspx', // general MFA portal
    name: 'Spain Schengen Tourist Visa – MFA',
    description: 'Spanish Ministry of Foreign Affairs – information on Schengen tourist visas.',
    priority: 6,
  },
  {
    countryCode: 'ES',
    visaType: 'student',
    url: 'https://www.exteriores.gob.es/en/ServiciosAlCiudadano/InformacionParaExtranjeros/Paginas/EstudiarEnEspana.aspx',
    name: 'Spain Student Visa – MFA',
    description: 'Spanish MFA information for foreign students in Spain.',
    priority: 6,
  },

  // France
  {
    countryCode: 'FR',
    visaType: 'tourist',
    url: 'https://france-visas.gouv.fr/en/web/france-visas/short-stay-tourism-or-private-visit',
    name: 'France Short-Stay Tourist Visa – France-Visas',
    description: 'Official France-Visas portal for short-stay tourism visas.',
    priority: 6,
  },
  {
    countryCode: 'FR',
    visaType: 'student',
    url: 'https://france-visas.gouv.fr/en/web/france-visas/student',
    name: 'France Student Visa – France-Visas',
    description: 'Official France-Visas portal for student visas.',
    priority: 6,
  },

  // Italy
  {
    countryCode: 'IT',
    visaType: 'tourist',
    url: 'https://vistoperitalia.esteri.it/home/en',
    name: 'Italy Schengen Tourist Visa – Farnesina',
    description: 'Italian Ministry of Foreign Affairs portal for Schengen tourist visas.',
    priority: 6,
  },
  {
    countryCode: 'IT',
    visaType: 'student',
    url: 'https://vistoperitalia.esteri.it/home/en#BMStudenti',
    name: 'Italy Student Visa – Farnesina',
    description: 'Information on Italian national visas for students.',
    priority: 6,
  },

  // Japan
  {
    countryCode: 'JP',
    visaType: 'tourist',
    url: 'https://www.mofa.go.jp/j_info/visit/visa/index.html',
    name: 'Japan Short-Term Stay (Tourism) – MOFA',
    description: 'Japanese Ministry of Foreign Affairs visa information for short stays.',
    priority: 5,
  },
  {
    countryCode: 'JP',
    visaType: 'student',
    url: 'https://www.mofa.go.jp/j_info/visit/visa/long/index.html',
    name: 'Japan Student Visa – MOFA',
    description: 'Long-term stay (including student) visa information from MOFA Japan.',
    priority: 5,
  },

  // United Arab Emirates
  {
    countryCode: 'AE',
    visaType: 'tourist',
    url: 'https://u.ae/en/information-and-services/visa-and-emirates-id/tourist-visa',
    name: 'UAE Tourist Visa – u.ae',
    description: 'Official UAE Government portal for tourist visas.',
    priority: 5,
  },
  {
    countryCode: 'AE',
    visaType: 'student',
    url: 'https://u.ae/en/information-and-services/visa-and-emirates-id/student-visa',
    name: 'UAE Student Visa – u.ae',
    description: 'Official UAE Government portal for student visas.',
    priority: 5,
  },
];

async function main() {
  console.log('Seeding EmbassySource entries...');

  for (const src of SOURCES) {
    const result = await prisma.embassySource.upsert({
      where: {
        // matches your @@unique([countryCode, visaType, url])
        countryCode_visaType_url: {
          countryCode: src.countryCode,
          visaType: src.visaType,
          url: src.url,
        },
      },
      update: {
        name: src.name,
        description: src.description,
        priority: src.priority,
        isActive: true,
      },
      create: {
        countryCode: src.countryCode,
        visaType: src.visaType,
        url: src.url,
        name: src.name,
        description: src.description,
        priority: src.priority ?? 0,
        fetchInterval: 86400, // 24h default
        isActive: true,
      },
    });

    console.log(`✓ ${result.countryCode} ${result.visaType} -> ${result.url}`);
  }

  console.log('✅ EmbassySource seeding complete.');
}

main()
  .catch((e) => {
    console.error('Seed error:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
