// Standalone script to seed embassy sources to Railway PostgreSQL
// Usage: ts-node --project scripts/tsconfig.json scripts/seed-embassy-sources-railway.ts

import { PrismaClient } from '@prisma/client';

// Use public Railway URL - override any environment variables
const DATABASE_URL = process.env.RAILWAY_PUBLIC_DATABASE_URL || 
  'postgresql://postgres:ozolgfntMPMGTFZgWTIiqmoaqIKQetVx@gondola.proxy.rlwy.net:31433/railway?sslmode=require';

const prisma = new PrismaClient({
  datasources: {
    db: {
      url: DATABASE_URL,
    },
  },
});

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
    name: 'Australia Visitor Visa (Subclass 600) – Official',
    description: 'Official Australian Government information for Visitor visas.',
    priority: 9,
  },
  {
    countryCode: 'AU',
    visaType: 'student',
    url: 'https://immi.homeaffairs.gov.au/visas/getting-a-visa/visa-listing/student-500',
    name: 'Australia Student Visa (Subclass 500) – Official',
    description: 'Official Australian Government information for Student visas.',
    priority: 9,
  },

  // Germany
  {
    countryCode: 'DE',
    visaType: 'tourist',
    url: 'https://www.germany-visa.org/tourist-visa/',
    name: 'Germany Tourist Visa – Official',
    description: 'Official information for Germany tourist/visitor visas.',
    priority: 8,
  },
  {
    countryCode: 'DE',
    visaType: 'student',
    url: 'https://www.germany-visa.org/student-visa/',
    name: 'Germany Student Visa – Official',
    description: 'Official information for Germany student visas.',
    priority: 8,
  },

  // Spain
  {
    countryCode: 'ES',
    visaType: 'tourist',
    url: 'https://www.exteriores.gob.es/en/Paginas/index.aspx',
    name: 'Spain Tourist Visa – Official',
    description: 'Official Spanish Ministry of Foreign Affairs information.',
    priority: 8,
  },
  {
    countryCode: 'ES',
    visaType: 'student',
    url: 'https://www.exteriores.gob.es/en/ServiciosAlCiudadano/InformacionParaExtranjeros/Paginas/EstudiarEnEspana.aspx',
    name: 'Spain Student Visa – Official',
    description: 'Official Spanish information for student visas.',
    priority: 8,
  },

  // France
  {
    countryCode: 'FR',
    visaType: 'tourist',
    url: 'https://france-visas.gouv.fr/en/web/france-visas/short-stay-tourism-or-private-visit',
    name: 'France Tourist Visa – Official',
    description: 'Official French visa portal for short-stay tourism visas.',
    priority: 8,
  },
  {
    countryCode: 'FR',
    visaType: 'student',
    url: 'https://france-visas.gouv.fr/en/web/france-visas/student',
    name: 'France Student Visa – Official',
    description: 'Official French visa portal for student visas.',
    priority: 8,
  },

  // Italy
  {
    countryCode: 'IT',
    visaType: 'tourist',
    url: 'https://vistoperitalia.esteri.it/home/en',
    name: 'Italy Tourist Visa – Official',
    description: 'Official Italian visa portal for tourist visas.',
    priority: 8,
  },
  {
    countryCode: 'IT',
    visaType: 'student',
    url: 'https://vistoperitalia.esteri.it/home/en#BMStudenti',
    name: 'Italy Student Visa – Official',
    description: 'Official Italian visa portal for student visas.',
    priority: 8,
  },

  // Japan
  {
    countryCode: 'JP',
    visaType: 'tourist',
    url: 'https://www.mofa.go.jp/j_info/visit/visa/index.html',
    name: 'Japan Tourist Visa – Official',
    description: 'Official Japanese Ministry of Foreign Affairs visa information.',
    priority: 8,
  },
  {
    countryCode: 'JP',
    visaType: 'student',
    url: 'https://www.mofa.go.jp/j_info/visit/visa/long/index.html',
    name: 'Japan Student Visa – Official',
    description: 'Official Japanese Ministry of Foreign Affairs long-term visa information.',
    priority: 8,
  },

  // UAE
  {
    countryCode: 'AE',
    visaType: 'tourist',
    url: 'https://u.ae/en/information-and-services/visa-and-emirates-id/tourist-visa',
    name: 'UAE Tourist Visa – Official',
    description: 'Official UAE government information for tourist visas.',
    priority: 7,
  },
  {
    countryCode: 'AE',
    visaType: 'student',
    url: 'https://u.ae/en/information-and-services/visa-and-emirates-id/student-visa',
    name: 'UAE Student Visa – Official',
    description: 'Official UAE government information for student visas.',
    priority: 7,
  },
];

async function main() {
  console.log('Seeding EmbassySource entries...');

  for (const src of SOURCES) {
    const result = await prisma.embassySource.upsert({
      where: {
        countryCode_visaType: {
          countryCode: src.countryCode,
          visaType: src.visaType,
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





import { PrismaClient } from '@prisma/client';

// Use public Railway URL - override any environment variables
const DATABASE_URL = process.env.RAILWAY_PUBLIC_DATABASE_URL || 
  'postgresql://postgres:ozolgfntMPMGTFZgWTIiqmoaqIKQetVx@gondola.proxy.rlwy.net:31433/railway?sslmode=require';

const prisma = new PrismaClient({
  datasources: {
    db: {
      url: DATABASE_URL,
    },
  },
});

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
    name: 'Australia Visitor Visa (Subclass 600) – Official',
    description: 'Official Australian Government information for Visitor visas.',
    priority: 9,
  },
  {
    countryCode: 'AU',
    visaType: 'student',
    url: 'https://immi.homeaffairs.gov.au/visas/getting-a-visa/visa-listing/student-500',
    name: 'Australia Student Visa (Subclass 500) – Official',
    description: 'Official Australian Government information for Student visas.',
    priority: 9,
  },

  // Germany
  {
    countryCode: 'DE',
    visaType: 'tourist',
    url: 'https://www.germany-visa.org/tourist-visa/',
    name: 'Germany Tourist Visa – Official',
    description: 'Official information for Germany tourist/visitor visas.',
    priority: 8,
  },
  {
    countryCode: 'DE',
    visaType: 'student',
    url: 'https://www.germany-visa.org/student-visa/',
    name: 'Germany Student Visa – Official',
    description: 'Official information for Germany student visas.',
    priority: 8,
  },

  // Spain
  {
    countryCode: 'ES',
    visaType: 'tourist',
    url: 'https://www.exteriores.gob.es/en/Paginas/index.aspx',
    name: 'Spain Tourist Visa – Official',
    description: 'Official Spanish Ministry of Foreign Affairs information.',
    priority: 8,
  },
  {
    countryCode: 'ES',
    visaType: 'student',
    url: 'https://www.exteriores.gob.es/en/ServiciosAlCiudadano/InformacionParaExtranjeros/Paginas/EstudiarEnEspana.aspx',
    name: 'Spain Student Visa – Official',
    description: 'Official Spanish information for student visas.',
    priority: 8,
  },

  // France
  {
    countryCode: 'FR',
    visaType: 'tourist',
    url: 'https://france-visas.gouv.fr/en/web/france-visas/short-stay-tourism-or-private-visit',
    name: 'France Tourist Visa – Official',
    description: 'Official French visa portal for short-stay tourism visas.',
    priority: 8,
  },
  {
    countryCode: 'FR',
    visaType: 'student',
    url: 'https://france-visas.gouv.fr/en/web/france-visas/student',
    name: 'France Student Visa – Official',
    description: 'Official French visa portal for student visas.',
    priority: 8,
  },

  // Italy
  {
    countryCode: 'IT',
    visaType: 'tourist',
    url: 'https://vistoperitalia.esteri.it/home/en',
    name: 'Italy Tourist Visa – Official',
    description: 'Official Italian visa portal for tourist visas.',
    priority: 8,
  },
  {
    countryCode: 'IT',
    visaType: 'student',
    url: 'https://vistoperitalia.esteri.it/home/en#BMStudenti',
    name: 'Italy Student Visa – Official',
    description: 'Official Italian visa portal for student visas.',
    priority: 8,
  },

  // Japan
  {
    countryCode: 'JP',
    visaType: 'tourist',
    url: 'https://www.mofa.go.jp/j_info/visit/visa/index.html',
    name: 'Japan Tourist Visa – Official',
    description: 'Official Japanese Ministry of Foreign Affairs visa information.',
    priority: 8,
  },
  {
    countryCode: 'JP',
    visaType: 'student',
    url: 'https://www.mofa.go.jp/j_info/visit/visa/long/index.html',
    name: 'Japan Student Visa – Official',
    description: 'Official Japanese Ministry of Foreign Affairs long-term visa information.',
    priority: 8,
  },

  // UAE
  {
    countryCode: 'AE',
    visaType: 'tourist',
    url: 'https://u.ae/en/information-and-services/visa-and-emirates-id/tourist-visa',
    name: 'UAE Tourist Visa – Official',
    description: 'Official UAE government information for tourist visas.',
    priority: 7,
  },
  {
    countryCode: 'AE',
    visaType: 'student',
    url: 'https://u.ae/en/information-and-services/visa-and-emirates-id/student-visa',
    name: 'UAE Student Visa – Official',
    description: 'Official UAE government information for student visas.',
    priority: 7,
  },
];

async function main() {
  console.log('Seeding EmbassySource entries...');

  for (const src of SOURCES) {
    const result = await prisma.embassySource.upsert({
      where: {
        countryCode_visaType: {
          countryCode: src.countryCode,
          visaType: src.visaType,
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





import { PrismaClient } from '@prisma/client';

// Use public Railway URL - override any environment variables
const DATABASE_URL = process.env.RAILWAY_PUBLIC_DATABASE_URL || 
  'postgresql://postgres:ozolgfntMPMGTFZgWTIiqmoaqIKQetVx@gondola.proxy.rlwy.net:31433/railway?sslmode=require';

const prisma = new PrismaClient({
  datasources: {
    db: {
      url: DATABASE_URL,
    },
  },
});

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
    name: 'Australia Visitor Visa (Subclass 600) – Official',
    description: 'Official Australian Government information for Visitor visas.',
    priority: 9,
  },
  {
    countryCode: 'AU',
    visaType: 'student',
    url: 'https://immi.homeaffairs.gov.au/visas/getting-a-visa/visa-listing/student-500',
    name: 'Australia Student Visa (Subclass 500) – Official',
    description: 'Official Australian Government information for Student visas.',
    priority: 9,
  },

  // Germany
  {
    countryCode: 'DE',
    visaType: 'tourist',
    url: 'https://www.germany-visa.org/tourist-visa/',
    name: 'Germany Tourist Visa – Official',
    description: 'Official information for Germany tourist/visitor visas.',
    priority: 8,
  },
  {
    countryCode: 'DE',
    visaType: 'student',
    url: 'https://www.germany-visa.org/student-visa/',
    name: 'Germany Student Visa – Official',
    description: 'Official information for Germany student visas.',
    priority: 8,
  },

  // Spain
  {
    countryCode: 'ES',
    visaType: 'tourist',
    url: 'https://www.exteriores.gob.es/en/Paginas/index.aspx',
    name: 'Spain Tourist Visa – Official',
    description: 'Official Spanish Ministry of Foreign Affairs information.',
    priority: 8,
  },
  {
    countryCode: 'ES',
    visaType: 'student',
    url: 'https://www.exteriores.gob.es/en/ServiciosAlCiudadano/InformacionParaExtranjeros/Paginas/EstudiarEnEspana.aspx',
    name: 'Spain Student Visa – Official',
    description: 'Official Spanish information for student visas.',
    priority: 8,
  },

  // France
  {
    countryCode: 'FR',
    visaType: 'tourist',
    url: 'https://france-visas.gouv.fr/en/web/france-visas/short-stay-tourism-or-private-visit',
    name: 'France Tourist Visa – Official',
    description: 'Official French visa portal for short-stay tourism visas.',
    priority: 8,
  },
  {
    countryCode: 'FR',
    visaType: 'student',
    url: 'https://france-visas.gouv.fr/en/web/france-visas/student',
    name: 'France Student Visa – Official',
    description: 'Official French visa portal for student visas.',
    priority: 8,
  },

  // Italy
  {
    countryCode: 'IT',
    visaType: 'tourist',
    url: 'https://vistoperitalia.esteri.it/home/en',
    name: 'Italy Tourist Visa – Official',
    description: 'Official Italian visa portal for tourist visas.',
    priority: 8,
  },
  {
    countryCode: 'IT',
    visaType: 'student',
    url: 'https://vistoperitalia.esteri.it/home/en#BMStudenti',
    name: 'Italy Student Visa – Official',
    description: 'Official Italian visa portal for student visas.',
    priority: 8,
  },

  // Japan
  {
    countryCode: 'JP',
    visaType: 'tourist',
    url: 'https://www.mofa.go.jp/j_info/visit/visa/index.html',
    name: 'Japan Tourist Visa – Official',
    description: 'Official Japanese Ministry of Foreign Affairs visa information.',
    priority: 8,
  },
  {
    countryCode: 'JP',
    visaType: 'student',
    url: 'https://www.mofa.go.jp/j_info/visit/visa/long/index.html',
    name: 'Japan Student Visa – Official',
    description: 'Official Japanese Ministry of Foreign Affairs long-term visa information.',
    priority: 8,
  },

  // UAE
  {
    countryCode: 'AE',
    visaType: 'tourist',
    url: 'https://u.ae/en/information-and-services/visa-and-emirates-id/tourist-visa',
    name: 'UAE Tourist Visa – Official',
    description: 'Official UAE government information for tourist visas.',
    priority: 7,
  },
  {
    countryCode: 'AE',
    visaType: 'student',
    url: 'https://u.ae/en/information-and-services/visa-and-emirates-id/student-visa',
    name: 'UAE Student Visa – Official',
    description: 'Official UAE government information for student visas.',
    priority: 7,
  },
];

async function main() {
  console.log('Seeding EmbassySource entries...');

  for (const src of SOURCES) {
    const result = await prisma.embassySource.upsert({
      where: {
        countryCode_visaType: {
          countryCode: src.countryCode,
          visaType: src.visaType,
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





import { PrismaClient } from '@prisma/client';

// Use public Railway URL - override any environment variables
const DATABASE_URL = process.env.RAILWAY_PUBLIC_DATABASE_URL || 
  'postgresql://postgres:ozolgfntMPMGTFZgWTIiqmoaqIKQetVx@gondola.proxy.rlwy.net:31433/railway?sslmode=require';

const prisma = new PrismaClient({
  datasources: {
    db: {
      url: DATABASE_URL,
    },
  },
});

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
    name: 'Australia Visitor Visa (Subclass 600) – Official',
    description: 'Official Australian Government information for Visitor visas.',
    priority: 9,
  },
  {
    countryCode: 'AU',
    visaType: 'student',
    url: 'https://immi.homeaffairs.gov.au/visas/getting-a-visa/visa-listing/student-500',
    name: 'Australia Student Visa (Subclass 500) – Official',
    description: 'Official Australian Government information for Student visas.',
    priority: 9,
  },

  // Germany
  {
    countryCode: 'DE',
    visaType: 'tourist',
    url: 'https://www.germany-visa.org/tourist-visa/',
    name: 'Germany Tourist Visa – Official',
    description: 'Official information for Germany tourist/visitor visas.',
    priority: 8,
  },
  {
    countryCode: 'DE',
    visaType: 'student',
    url: 'https://www.germany-visa.org/student-visa/',
    name: 'Germany Student Visa – Official',
    description: 'Official information for Germany student visas.',
    priority: 8,
  },

  // Spain
  {
    countryCode: 'ES',
    visaType: 'tourist',
    url: 'https://www.exteriores.gob.es/en/Paginas/index.aspx',
    name: 'Spain Tourist Visa – Official',
    description: 'Official Spanish Ministry of Foreign Affairs information.',
    priority: 8,
  },
  {
    countryCode: 'ES',
    visaType: 'student',
    url: 'https://www.exteriores.gob.es/en/ServiciosAlCiudadano/InformacionParaExtranjeros/Paginas/EstudiarEnEspana.aspx',
    name: 'Spain Student Visa – Official',
    description: 'Official Spanish information for student visas.',
    priority: 8,
  },

  // France
  {
    countryCode: 'FR',
    visaType: 'tourist',
    url: 'https://france-visas.gouv.fr/en/web/france-visas/short-stay-tourism-or-private-visit',
    name: 'France Tourist Visa – Official',
    description: 'Official French visa portal for short-stay tourism visas.',
    priority: 8,
  },
  {
    countryCode: 'FR',
    visaType: 'student',
    url: 'https://france-visas.gouv.fr/en/web/france-visas/student',
    name: 'France Student Visa – Official',
    description: 'Official French visa portal for student visas.',
    priority: 8,
  },

  // Italy
  {
    countryCode: 'IT',
    visaType: 'tourist',
    url: 'https://vistoperitalia.esteri.it/home/en',
    name: 'Italy Tourist Visa – Official',
    description: 'Official Italian visa portal for tourist visas.',
    priority: 8,
  },
  {
    countryCode: 'IT',
    visaType: 'student',
    url: 'https://vistoperitalia.esteri.it/home/en#BMStudenti',
    name: 'Italy Student Visa – Official',
    description: 'Official Italian visa portal for student visas.',
    priority: 8,
  },

  // Japan
  {
    countryCode: 'JP',
    visaType: 'tourist',
    url: 'https://www.mofa.go.jp/j_info/visit/visa/index.html',
    name: 'Japan Tourist Visa – Official',
    description: 'Official Japanese Ministry of Foreign Affairs visa information.',
    priority: 8,
  },
  {
    countryCode: 'JP',
    visaType: 'student',
    url: 'https://www.mofa.go.jp/j_info/visit/visa/long/index.html',
    name: 'Japan Student Visa – Official',
    description: 'Official Japanese Ministry of Foreign Affairs long-term visa information.',
    priority: 8,
  },

  // UAE
  {
    countryCode: 'AE',
    visaType: 'tourist',
    url: 'https://u.ae/en/information-and-services/visa-and-emirates-id/tourist-visa',
    name: 'UAE Tourist Visa – Official',
    description: 'Official UAE government information for tourist visas.',
    priority: 7,
  },
  {
    countryCode: 'AE',
    visaType: 'student',
    url: 'https://u.ae/en/information-and-services/visa-and-emirates-id/student-visa',
    name: 'UAE Student Visa – Official',
    description: 'Official UAE government information for student visas.',
    priority: 7,
  },
];

async function main() {
  console.log('Seeding EmbassySource entries...');

  for (const src of SOURCES) {
    const result = await prisma.embassySource.upsert({
      where: {
        countryCode_visaType: {
          countryCode: src.countryCode,
          visaType: src.visaType,
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



