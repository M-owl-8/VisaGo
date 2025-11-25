import { PrismaClient } from '@prisma/client';
import { errors } from '../utils/errors';
import { AIOpenAIService } from './ai-openai.service';
import { ApplicationsService } from './applications.service';
import { VisaTypesService } from './visa-types.service';
import { CountriesService } from './countries.service';

const prisma = new PrismaClient();

interface QuestionnaireData {
  purpose: string; // study, work, tourism, business, immigration, other
  country?: string; // country ID or "not_sure"
  duration?: string; // less_than_1, 1_3_months, 3_6_months, 6_12_months, more_than_1_year
  traveledBefore?: boolean;
  currentStatus?: string; // student, employee, entrepreneur, unemployed, other
  hasInvitation?: boolean;
  financialSituation?: string; // stable_income, sponsor, savings, preparing
  maritalStatus?: string; // single, married, divorced
  hasChildren?: string; // no, one, two_plus
  englishLevel?: string; // beginner, intermediate, advanced, native
}

interface AIApplicationResult {
  application: any;
  requiredDocuments: string[];
  aiRecommendations: string;
  suggestedCountry?: string;
}

export class AIApplicationService {
  /**
   * Generate application automatically using AI based on questionnaire data
   */
  static async generateApplicationFromQuestionnaire(
    userId: string,
    questionnaireData: QuestionnaireData
  ): Promise<AIApplicationResult> {
    try {
      // Validate required fields
      if (!questionnaireData.purpose) {
        throw new Error(
          "Questionnaire data must include 'purpose' field (study, tourism, work, etc.)"
        );
      }

      console.log('[AIApplication] Generating application from questionnaire', {
        userId,
        purpose: questionnaireData.purpose,
        countryId: questionnaireData.country,
        hasSummary: !!(questionnaireData as any).summary,
      });

      // Step 1: Determine country and visa type
      let countryId: string;
      let visaTypeId: string;
      let suggestedCountry: string | undefined;
      let requiredDocuments: string[] = [];
      let aiRecommendations = '';

      // If country is "not-sure" or not provided, use AI to suggest best country
      if (
        !questionnaireData.country ||
        questionnaireData.country === 'not_sure' ||
        questionnaireData.country.trim() === ''
      ) {
        const suggestion = await this.suggestCountryWithAI(
          questionnaireData.purpose,
          questionnaireData.currentStatus || 'employee',
          questionnaireData.duration || '1_3_months',
          questionnaireData.traveledBefore || false
        );

        // Try to find the suggested country in database
        const countries = await CountriesService.getAllCountries();
        const matchedCountry = countries.find(
          (c) =>
            c.name.toLowerCase() === suggestion.countryName.toLowerCase() ||
            c.name.toLowerCase().includes(suggestion.countryName.toLowerCase())
        );

        if (matchedCountry) {
          countryId = matchedCountry.id;
          suggestedCountry = matchedCountry.name;
        } else {
          // Fallback: use first country with matching visa type
          const fallbackCountry = await this.getFallbackCountry(questionnaireData.purpose);
          countryId = fallbackCountry.id;
          suggestedCountry = fallbackCountry.name;
        }
        aiRecommendations = suggestion.reasoning;
      } else {
        // Country is specified, try to find it by ID first
        let country = await prisma.country
          .findUnique({
            where: { id: questionnaireData.country },
          })
          .catch(() => null);

        // If not found by ID, try fallback to code/name from summary
        if (!country) {
          const summary = (questionnaireData as any).summary;
          const targetCountry = summary?.targetCountry;

          if (targetCountry) {
            console.warn('[AIApplication] Country ID not found, falling back to code or name', {
              countryId: questionnaireData.country,
              targetCountry: targetCountry,
            });

            country = await CountriesService.getCountryByCodeOrName(targetCountry).catch(
              () => null
            );

            if (country) {
              console.log('[AIApplication] Country found via fallback', {
                originalId: questionnaireData.country,
                foundId: country.id,
                foundName: country.name,
                foundCode: country.code,
              });
            }
          }
        }

        if (!country) {
          throw new Error(
            'Country not found for questionnaire. Please reselect the country and try again.'
          );
        }
        countryId = country.id;
      }

      // Step 2: Find visa type for the country based on purpose
      const visaTypes = await prisma.visaType.findMany({
        where: { countryId },
        include: { country: true },
      });

      if (visaTypes.length === 0) {
        const countryName =
          (await prisma.country.findUnique({ where: { id: countryId } }))?.name ||
          'selected country';
        throw new Error(
          `No visa types found for ${countryName}. The database may need to be seeded with visa types.`
        );
      }

      // Match visa type by purpose
      const purposeToVisaTypeMapping: Record<string, string[]> = {
        study: ['student', 'f-1', 'study', 'academic', 'tier 4'],
        work: ['work', 'h-1b', 'employment', 'worker', 'skilled'],
        tourism: ['tourist', 'visitor', 'b1/b2', 'travel', 'tourism'],
        business: ['business', 'b1', 'commercial'],
        immigration: ['immigrant', 'permanent', 'green card', 'residence'],
        other: ['general', 'other'],
      };

      const searchTerms = purposeToVisaTypeMapping[questionnaireData.purpose] || [
        questionnaireData.purpose,
      ];
      let visaType = visaTypes.find((vt) =>
        searchTerms.some((term) => vt.name.toLowerCase().includes(term))
      );

      // If no match, use first visa type for this country
      if (!visaType && visaTypes.length > 0) {
        visaType = visaTypes[0];
        aiRecommendations += ` Note: Using ${visaType.name} as closest match for ${questionnaireData.purpose} purpose.`;
      }

      if (!visaType) {
        const countryName =
          (await prisma.country.findUnique({ where: { id: countryId } }))?.name ||
          'selected country';
        throw new Error(
          `No matching visa type found for ${questionnaireData.purpose} purpose in ${countryName}.`
        );
      }

      visaTypeId = visaType.id;

      // Step 3: Get required documents from visa type
      try {
        const docTypes = JSON.parse(visaType.documentTypes || '[]');
        requiredDocuments = Array.isArray(docTypes) ? docTypes : [];
      } catch {
        // If parsing fails, use default documents based on purpose
        requiredDocuments = this.getDefaultDocuments(questionnaireData.purpose);
      }

      // Step 4: Add conditional documents based on questionnaire
      const conditionalDocs = this.getConditionalDocuments(questionnaireData);
      requiredDocuments = [...new Set([...requiredDocuments, ...conditionalDocs])]; // Remove duplicates

      // Step 5: Enhance document list with AI recommendations
      const enhancedDocs = await this.enhanceDocumentListWithAI(
        requiredDocuments,
        questionnaireData,
        visaType.name,
        visaType.country.name
      );
      requiredDocuments = enhancedDocs.documents;
      if (enhancedDocs.recommendations) {
        aiRecommendations += ' ' + enhancedDocs.recommendations;
      }

      // Step 5: Create the application
      const application = await ApplicationsService.createApplication(userId, {
        countryId,
        visaTypeId,
        notes: `AI-generated application based on questionnaire. ${aiRecommendations}`,
      });

      // CRITICAL FIX: Generate checklist immediately after application creation
      // This ensures checklist exists even if user navigates away
      // Wrap in try-catch so application creation doesn't fail if checklist generation fails
      try {
        const { DocumentChecklistService } = await import('./document-checklist.service');
        await DocumentChecklistService.generateChecklist(application.id, userId);
        console.log('[AIApplication] Checklist generated successfully', {
          applicationId: application.id,
          userId,
        });
      } catch (checklistError: any) {
        // Log but don't fail application creation
        // Checklist can be generated on-demand later via GET endpoint
        console.warn(
          '[AIApplication] Failed to generate initial checklist, will generate on-demand',
          {
            applicationId: application.id,
            userId,
            error: checklistError.message,
          }
        );
      }

      return {
        application,
        requiredDocuments,
        aiRecommendations: aiRecommendations.trim(),
        suggestedCountry,
      };
    } catch (error: any) {
      console.error('Error generating AI application:', error);
      throw error;
    }
  }

  /**
   * Use AI to suggest best country based on purpose and user profile
   */
  private static async suggestCountryWithAI(
    purpose: string,
    currentStatus: string,
    duration: string,
    traveledBefore: boolean
  ): Promise<{ countryName: string; reasoning: string }> {
    try {
      // Check if AI service is available
      if (!process.env.OPENAI_API_KEY) {
        // Fallback to database lookup
        return this.suggestCountryFromDatabase(purpose);
      }
      const prompt = `Based on the following user profile, suggest the best country for their travel purpose:

User Profile:
- Purpose: ${purpose}
- Current Status: ${currentStatus}
- Duration: ${duration}
- Traveled Before: ${traveledBefore ? 'Yes' : 'No'}

Please suggest ONE country that would be most suitable for this user. Consider:
1. Popular destinations for ${purpose} purposes
2. Ease of obtaining the visa for Uzbek citizens
3. User's current status and experience
4. Duration of stay
5. Common destinations for people in this category

Respond in JSON format:
{
  "countryName": "Country Name",
  "reasoning": "Brief explanation why this country is recommended"
}`;

      const response = await AIOpenAIService.chat([
        {
          role: 'user',
          content: prompt,
        },
      ]);

      // Parse AI response
      try {
        const jsonMatch = response.message.match(/\{[\s\S]*\}/);
        if (jsonMatch) {
          const parsed = JSON.parse(jsonMatch[0]);
          return {
            countryName: parsed.countryName || 'United States',
            reasoning: parsed.reasoning || 'Recommended based on your profile',
          };
        }
      } catch {
        // Fallback if JSON parsing fails
      }

      // Default fallback
      return {
        countryName: 'United States',
        reasoning: 'United States is a popular destination for this visa type',
      };
    } catch (error) {
      console.error('AI suggestion error:', error);
      // Fallback to default
      return {
        countryName: 'United States',
        reasoning: 'Default recommendation',
      };
    }
  }

  /**
   * Enhance document list with AI recommendations
   */
  private static async enhanceDocumentListWithAI(
    baseDocuments: string[],
    questionnaireData: QuestionnaireData,
    visaTypeName: string,
    countryName: string
  ): Promise<{ documents: string[]; recommendations?: string }> {
    try {
      // Check if AI service is available
      if (!process.env.OPENAI_API_KEY) {
        // Return base documents without AI enhancement
        return { documents: baseDocuments };
      }
      const prompt = `Based on the following information, provide a comprehensive list of required documents for a ${visaTypeName} visa to ${countryName}:

User Profile:
- Purpose: ${questionnaireData.purpose}
- Current Status: ${questionnaireData.currentStatus}
- Duration: ${questionnaireData.duration}
- Marital Status: ${questionnaireData.maritalStatus}
- Has Children: ${questionnaireData.hasChildren}
- Has Invitation: ${questionnaireData.hasInvitation ? 'Yes' : 'No'}
- Financial Situation: ${questionnaireData.financialSituation}
- Traveled Before: ${questionnaireData.traveledBefore ? 'Yes' : 'No'}
- English Level: ${questionnaireData.englishLevel}

Base Documents Required:
${baseDocuments.map((doc, i) => `${i + 1}. ${doc}`).join('\n')}

Please:
1. Review and enhance the document list if needed
2. Add any additional documents that might be required based on the user's profile
3. Provide brief personalized recommendations

Respond in JSON format:
{
  "documents": ["Document 1", "Document 2", ...],
  "recommendations": "Brief personalized recommendations"
}`;

      const response = await AIOpenAIService.chat([
        {
          role: 'user',
          content: prompt,
        },
      ]);

      // Parse AI response
      try {
        const jsonMatch = response.message.match(/\{[\s\S]*\}/);
        if (jsonMatch) {
          const parsed = JSON.parse(jsonMatch[0]);
          return {
            documents: parsed.documents || baseDocuments,
            recommendations: parsed.recommendations,
          };
        }
      } catch {
        // Fallback if parsing fails
      }

      return { documents: baseDocuments };
    } catch (error) {
      console.error('AI document enhancement error:', error);
      return { documents: baseDocuments };
    }
  }

  /**
   * Get conditional documents based on questionnaire answers
   */
  private static getConditionalDocuments(questionnaireData: QuestionnaireData): string[] {
    const conditionalDocs: string[] = [];

    // Marital status
    if (questionnaireData.maritalStatus === 'married') {
      conditionalDocs.push('Marriage Certificate');
    }

    // Children
    if (questionnaireData.hasChildren === 'one' || questionnaireData.hasChildren === 'two_plus') {
      conditionalDocs.push('Birth Certificates of Children');
      conditionalDocs.push("Children's Passports");
    }

    // Financial situation
    if (questionnaireData.financialSituation === 'sponsor') {
      conditionalDocs.push('Sponsor Letter');
      conditionalDocs.push("Sponsor's Financial Documents");
      conditionalDocs.push("Sponsor's ID/Passport");
    }

    // Invitation/Acceptance
    if (questionnaireData.hasInvitation) {
      if (questionnaireData.purpose === 'study') {
        conditionalDocs.push('I-20 Form');
        conditionalDocs.push('Acceptance Letter');
        conditionalDocs.push('Proof of Tuition Payment');
      } else if (questionnaireData.purpose === 'work') {
        conditionalDocs.push('Job Offer Letter');
        conditionalDocs.push('Employment Contract');
      } else if (questionnaireData.purpose === 'business') {
        conditionalDocs.push('Business Invitation Letter');
      }
    }

    // Current status
    if (questionnaireData.currentStatus === 'student') {
      conditionalDocs.push('Student ID');
      conditionalDocs.push('Academic Transcripts');
    } else if (questionnaireData.currentStatus === 'employee') {
      conditionalDocs.push('Employment Letter');
      conditionalDocs.push('Salary Slips (6 months)');
    } else if (questionnaireData.currentStatus === 'entrepreneur') {
      conditionalDocs.push('Business Registration Certificate');
      conditionalDocs.push('Tax Returns');
    }

    // Duration (for long stays)
    if (
      questionnaireData.duration === '6_12_months' ||
      questionnaireData.duration === 'more_than_1_year'
    ) {
      conditionalDocs.push('Medical Certificate');
      conditionalDocs.push('Police Clearance Certificate');
    }

    // Travel history (for first-time travelers)
    if (!questionnaireData.traveledBefore) {
      conditionalDocs.push('Travel Itinerary');
      conditionalDocs.push('Hotel Reservations');
    }

    return conditionalDocs;
  }

  /**
   * Get default documents based on purpose
   */
  private static getDefaultDocuments(purpose: string): string[] {
    const defaults: Record<string, string[]> = {
      study: [
        'Passport',
        'Academic Records',
        'Bank Statement',
        'Letter of Acceptance',
        'Visa Application Form',
        'Passport Photo',
      ],
      tourism: [
        'Passport',
        'Passport Photo',
        'Travel Itinerary',
        'Bank Statement',
        'Hotel Reservations',
        'Visa Application Form',
      ],
      business: [
        'Passport',
        'Business Invitation Letter',
        'Company Registration',
        'Bank Statement',
        'Visa Application Form',
        'Passport Photo',
      ],
      work: [
        'Passport',
        'Job Offer Letter',
        'Degree Certificate',
        'Employment Verification',
        'Bank Statement',
        'Visa Application Form',
        'Passport Photo',
      ],
      immigration: [
        'Passport',
        'Birth Certificate',
        'Marriage Certificate',
        'Police Clearance Certificate',
        'Medical Certificate',
        'Bank Statement',
        'Proof of Residence',
        'Visa Application Form',
        'Passport Photo',
      ],
      other: ['Passport', 'Supporting Documents', 'Visa Application Form', 'Passport Photo'],
    };

    return defaults[purpose.toLowerCase()] || defaults.other;
  }

  /**
   * Get fallback country based on purpose
   */
  private static async getFallbackCountry(purpose: string): Promise<any> {
    const countries = await prisma.country.findMany({
      include: { visaTypes: true },
    });

    // Purpose-based country preferences
    const purposeCountryMap: Record<string, string[]> = {
      study: ['United States', 'United Kingdom', 'Canada', 'Germany', 'Australia'],
      work: ['Germany', 'Canada', 'Australia', 'Netherlands', 'United States'],
      tourism: ['Turkey', 'United Arab Emirates', 'Thailand', 'Georgia', 'Malaysia'],
      business: ['United States', 'United Kingdom', 'Singapore', 'Germany'],
      immigration: ['Canada', 'Australia', 'United States', 'Germany'],
      other: ['United States', 'United Kingdom', 'Canada'],
    };

    const preferredCountries = purposeCountryMap[purpose] || purposeCountryMap.other;

    for (const countryName of preferredCountries) {
      const country = countries.find((c) => c.name === countryName);
      if (country && country.visaTypes.length > 0) {
        return country;
      }
    }

    // Ultimate fallback: first country with visa types
    const fallback = countries.find((c) => c.visaTypes.length > 0);
    if (fallback) return fallback;

    throw errors.notFound('No countries with visa types found');
  }

  /**
   * Fallback: Suggest country from database when AI is not available
   */
  private static async suggestCountryFromDatabase(
    purpose: string
  ): Promise<{ countryName: string; reasoning: string }> {
    try {
      const country = await this.getFallbackCountry(purpose);
      return {
        countryName: country.name,
        reasoning: `Recommended based on ${purpose} purpose`,
      };
    } catch (error) {
      console.error('Error suggesting country from database:', error);
    }

    // Ultimate fallback
    return {
      countryName: 'United States',
      reasoning: 'Default recommendation',
    };
  }
}
