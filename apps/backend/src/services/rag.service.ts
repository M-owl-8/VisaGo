import { PrismaClient } from '@prisma/client';

/**
 * RAG (Retrieval-Augmented Generation) Service
 * Retrieves relevant visa knowledge base documents to augment LLM context
 */

interface KnowledgeEntry {
  id: string;
  topic: string;
  country: string;
  visaType: string;
  content: string;
  keywords: string[];
}

interface RAGContext {
  relevantDocuments: KnowledgeEntry[];
  systemPrompt: string;
  totalTokens: number;
}

export class RAGService {
  private prisma: PrismaClient;
  private knowledgeBase: KnowledgeEntry[];
  private tokenBudget: number = 2000; // Tokens reserved for RAG context

  constructor(prisma: PrismaClient) {
    this.prisma = prisma;
    this.knowledgeBase = this.initializeKnowledgeBase();
  }

  /**
   * Initialize the knowledge base with visa information
   * In production, this would be loaded from database or external service
   */
  private initializeKnowledgeBase(): KnowledgeEntry[] {
    return [
      // US Visas
      {
        id: 'us-visit-001',
        topic: 'B1/B2 Visitor Visa',
        country: 'United States',
        visaType: 'visitor',
        content: `
          The B1/B2 visa is for temporary visitors to the United States for business or tourism.
          
          Requirements:
          - Valid passport (at least 6 months validity)
          - Completed DS-160 form
          - Passport photo (2x2 inches)
          - Evidence of ties to home country
          - Proof of financial support
          - Visa interview at US embassy/consulate
          
          Processing Time: 5-10 business days
          Validity: Up to 10 years
          Stay Duration: Up to 6 months
          
          Common reasons for denial:
          - Insufficient funds
          - No clear ties to home country
          - Previous visa violations
          - Criminal history
        `,
        keywords: ['B1', 'B2', 'visitor', 'tourism', 'business', 'USA', 'United States'],
      },
      {
        id: 'us-work-001',
        topic: 'H1-B Work Visa',
        country: 'United States',
        visaType: 'work',
        content: `
          The H1-B is for specialty occupation workers.
          
          Requirements:
          - Job offer from US employer
          - Bachelor's degree or higher
          - Employer must file I-129 petition
          - Labor certification completed
          - Medical examination
          
          Processing Time: 1-3 months
          Validity: Up to 6 years (with extensions)
          
          Eligibility:
          - Specialty occupation role
          - Employer sponsorship required
          - Annual cap applies
          - Lottery system for visa allocation
        `,
        keywords: ['H1-B', 'work', 'employment', 'specialty', 'USA', 'job'],
      },
      // UK Visas
      {
        id: 'uk-visit-001',
        topic: 'UK Visitor Visa',
        country: 'United Kingdom',
        visaType: 'visitor',
        content: `
          UK Visitor Visa for tourism and business visits.
          
          Requirements:
          - Valid passport
          - Proof of funds (£1,000+ depending on stay length)
          - Accommodation booking or invitation letter
          - Return ticket
          - Proof of ties to home country
          - Travel insurance (recommended)
          
          Processing Time: 15 calendar days standard, 8 days expedited
          Validity: Up to 2 years
          Stay Duration: Up to 6 months
          
          Application Process:
          1. Apply online at gov.uk
          2. Pay visa fee (£76 for 6 months, £141 for 2 years)
          3. Provide biometrics (fingerprints and photo)
          4. Submit documents
          5. Get status decision
        `,
        keywords: ['UK', 'United Kingdom', 'visitor', 'tourist', 'travel'],
      },
      // Schengen Visas
      {
        id: 'schengen-short-001',
        topic: 'Schengen Short-Stay Visa',
        country: 'European Union',
        visaType: 'visitor',
        content: `
          Schengen Visa for short stays (up to 90 days in 180 days).
          
          Requirements:
          - Valid passport (3+ months validity)
          - Completed visa application form
          - Passport photos (2)
          - Proof of funds
          - Travel insurance
          - Return ticket
          - Accommodation booking
          - Proof of ties to home country
          
          Processing Time: 15 calendar days standard
          Validity: Single or multiple entry
          Stay Duration: Up to 90 days in 180 days
          
          Schengen Area Countries:
          Austria, Belgium, Croatia, Cyprus, Czech Republic, Denmark, Estonia, Finland,
          France, Germany, Greece, Hungary, Iceland, Italy, Latvia, Lithuania, Luxembourg,
          Malta, Netherlands, Norway, Poland, Portugal, Slovakia, Slovenia, Spain, Sweden, Switzerland
          
          Application Requirements by Embassy:
          - Application form (varies by country)
          - Visa fee (typically €60-80)
          - Biometric data collection
        `,
        keywords: ['Schengen', 'EU', 'Europe', 'visa', 'short-stay', 'travel'],
      },
      // Canada Visas
      {
        id: 'canada-visit-001',
        topic: 'Canada Visitor Visa',
        country: 'Canada',
        visaType: 'visitor',
        content: `
          Canadian Visitor Visa (also called Temporary Resident Visa).
          
          Requirements:
          - Valid passport
          - Completed application form IMM 5257 E
          - Passport photo
          - Proof of financial support (CA$20,000+ for single person)
          - Travel insurance (recommended)
          - Return ticket
          - Invitation letter (if applicable)
          - Medical exam (if required)
          
          Processing Time: 4-6 weeks
          Validity: Up to 10 years
          Stay Duration: Up to 6 months
          
          Application Process:
          1. Apply online or on paper
          2. Pay application fee (CA$100)
          3. Provide biometrics
          4. Attend interview (if required)
          5. Wait for decision
          
          Important: US citizens do not need a visa (ETA required only).
        `,
        keywords: ['Canada', 'visitor', 'temporary resident', 'TRV', 'North America'],
      },
      // Australia Visas
      {
        id: 'australia-visit-001',
        topic: 'Australia Visitor Visa',
        country: 'Australia',
        visaType: 'visitor',
        content: `
          Australian Visitor Visa (Subclass 600).
          
          Requirements:
          - Valid passport
          - Online application form
          - Proof of financial support
          - Travel insurance
          - Return ticket
          - Proof of character (police certificate)
          - Health requirements may apply
          
          Processing Time: 1-3 months
          Validity: Up to 12 months
          Stay Duration: Up to 3-12 months depending on visa granted
          
          Application Fee: AUD $190
          
          Health Requirements:
          - Chest X-ray if staying over 3 months
          - Medical examination if required by department
          
          Document Checklist:
          - Proof of employment
          - Bank statements (3-6 months)
          - Travel history
          - Character references
        `,
        keywords: ['Australia', 'visitor', 'subclass 600', 'travel', 'tourism'],
      },
      // General Information
      {
        id: 'general-doc-001',
        topic: 'General Visa Documentation',
        country: 'General',
        visaType: 'all',
        content: `
          Common documents required for most visa applications:
          
          1. Passport
             - Must be valid for at least 6 months beyond intended stay
             - Should have at least one blank page
             - Recent passport must be submitted with application
          
          2. Financial Documents
             - Bank statements (usually 3-6 months)
             - Proof of employment or business ownership
             - Tax returns
             - Sponsor letters (if applicable)
          
          3. Travel Documents
             - Return ticket or booking confirmation
             - Accommodation booking or invitation letter
             - Travel insurance policy
             - Itinerary
          
          4. Personal Documents
             - Birth certificate
             - Marriage certificate (if applicable)
             - Divorce decree (if applicable)
             - Police clearance certificate
          
          5. Medical Documents
             - Medical examination (as required)
             - Vaccination records
             - Health insurance
          
          Tips:
          - Provide original + 2 certified copies
          - Get documents translated if not in visa country language
          - Submit well in advance (3+ months before travel)
          - Keep copies for your records
        `,
        keywords: ['documents', 'requirements', 'general', 'passport', 'financial'],
      },
      // Visa Refusal
      {
        id: 'general-refusal-001',
        topic: 'Common Visa Refusal Reasons',
        country: 'General',
        visaType: 'all',
        content: `
          Common reasons for visa refusal and how to avoid them:
          
          1. Insufficient Funds
             - Ensure you have enough savings/sponsorship
             - Provide clear paper trail for funds
             - Show regular income or employment
          
          2. Lack of Ties to Home Country
             - Prove stable employment
             - Show property ownership
             - Demonstrate family/community ties
             - Provide reference letters
          
          3. Inconsistent Information
             - Ensure all documents match
             - Don't contradict yourself in interviews
             - Update information consistently
             - Keep original documents
          
          4. Travel History Concerns
             - Overstaying previous visas
             - Working illegally previously
             - Entry violations
             - Obtain character certificates if required
          
          5. Security/Criminal Background
             - Any criminal record impacts approval
             - Disclose all relevant information
             - Seek legal advice if applicable
          
          What to do if refused:
          - Request written explanation
          - Appeal if appeal process available
          - Correct any errors and reapply
          - Seek professional visa advice
          - Consider alternatives for travel
        `,
        keywords: ['refusal', 'rejection', 'denied', 'appeal', 'reasons', 'problematic'],
      },
      // Tips
      {
        id: 'general-tips-001',
        topic: 'Visa Application Tips',
        country: 'General',
        visaType: 'all',
        content: `
          Best practices for successful visa applications:
          
          1. Plan Early
             - Start 3-6 months before travel
             - Check visa requirements for your nationality
             - Verify processing times
             - Book appointments early
          
          2. Prepare Documents Thoroughly
             - Use official checklists from embassy
             - Get certified translations if needed
             - Keep originals safe
             - Organize documents clearly
          
          3. Application Quality
             - Fill forms completely and accurately
             - Use official forms only
             - Write clearly (use typed forms if available)
             - Double-check for errors
             - Sign in proper places
          
          4. Financial Proof
             - Provide 3-6 months bank statements
             - Show consistent deposits
             - Explain large transfers
             - Use official bank statements
          
          5. Interview Preparation (if required)
             - Know your itinerary details
             - Understand visa requirements
             - Be honest and confident
             - Practice common questions
             - Dress professionally
          
          6. Professional Help
             - Consider visa consultant for complex cases
             - Use official government websites
             - Avoid immigration scams
             - Keep all communications documented
          
          7. Follow-up
             - Keep application reference numbers
             - Check status regularly
             - Respond quickly to requests
             - Collect all documents for future applications
        `,
        keywords: ['tips', 'advice', 'application', 'preparation', 'success', 'guide'],
      },
    ];
  }

  /**
   * Retrieve relevant documents for a query
   */
  async retrieveContext(
    query: string,
    country?: string,
    visaType?: string,
    userId?: string
  ): Promise<RAGContext> {
    try {
      // Get user's visa applications context if userId provided
      let userContext = '';
      if (userId) {
        const userApplications = await this.prisma.application.findMany({
          where: { userId },
          include: { visaType: true, country: true },
          take: 5,
        });

        if (userApplications.length > 0) {
          userContext = `User's recent visa applications: ${userApplications
            .map((app: any): string => `${app.country?.name} - ${app.visaType?.name}`)
            .join(', ')}`;
        }
      }

      // Search knowledge base
      const relevantDocuments = this.searchKnowledgeBase(query, country, visaType);

      // Score and rank results
      const rankedDocuments = this.rankResults(query, relevantDocuments).slice(0, 5);

      // Build system prompt
      const systemPrompt = this.buildSystemPrompt(rankedDocuments, userContext, query);

      // Calculate tokens (rough estimate: 1 token ≈ 4 characters)
      const totalTokens = Math.ceil(systemPrompt.length / 4);

      return {
        relevantDocuments: rankedDocuments,
        systemPrompt,
        totalTokens,
      };
    } catch (error) {
      console.error('RAG retrieval error:', error);
      // Return empty context on error
      return {
        relevantDocuments: [],
        systemPrompt: this.getDefaultSystemPrompt(),
        totalTokens: 500,
      };
    }
  }

  /**
   * Search knowledge base for relevant documents
   */
  private searchKnowledgeBase(
    query: string,
    country?: string,
    visaType?: string
  ): KnowledgeEntry[] {
    const queryLower = query.toLowerCase();
    const queryTerms = queryLower.split(/\s+/).filter((term: string) => term.length > 2);

    return this.knowledgeBase.filter((entry: KnowledgeEntry) => {
      // Filter by country if provided
      if (country && entry.country !== 'General' && !entry.country.toLowerCase().includes(country.toLowerCase())) {
        return false;
      }

      // Filter by visa type if provided
      if (visaType && entry.visaType !== 'all' && entry.visaType !== visaType.toLowerCase()) {
        return false;
      }

      // Search in content and keywords
      const contentLower = (entry.content + ' ' + entry.topic + ' ' + entry.keywords.join(' ')).toLowerCase();

      // Check if query terms exist in content
      return queryTerms.some((term: string) => contentLower.includes(term)) || contentLower.includes(queryLower);
    });
  }

  /**
   * Rank results by relevance
   */
  private rankResults(query: string, documents: KnowledgeEntry[]): KnowledgeEntry[] {
    const queryTerms = query.toLowerCase().split(/\s+/);

    const scored = documents.map((doc: KnowledgeEntry) => {
      let score = 0;

      // Score based on keyword matches
      const contentLower = `${doc.content} ${doc.topic} ${doc.keywords.join(' ')}`.toLowerCase();
      queryTerms.forEach((term: string) => {
        const matches = (contentLower.match(new RegExp(term, 'g')) || []).length;
        score += matches;
      });

      // Boost exact topic matches
      if (doc.topic.toLowerCase().includes(query.toLowerCase())) {
        score += 10;
      }

      return { document: doc, score };
    });

    return scored.sort((a: { document: KnowledgeEntry; score: number }, b: { document: KnowledgeEntry; score: number }) => b.score - a.score).map((item: { document: KnowledgeEntry; score: number }) => item.document);
  }

  /**
   * Build system prompt with retrieved documents
   */
  private buildSystemPrompt(
    documents: KnowledgeEntry[],
    userContext: string,
    userQuery: string
  ): string {
    const documentContent = documents
      .map(
        (doc: KnowledgeEntry) => `
## ${doc.topic} (${doc.country})
${doc.content}
`
      )
      .join('\n');

    return `You are VisaBuddy, an expert visa assistant helping users navigate visa applications worldwide.

${userContext ? `User Context: ${userContext}\n` : ''}

Use the following knowledge base to answer visa-related questions accurately:

${documentContent}

Important Guidelines:
1. Provide accurate visa information based on the knowledge base
2. Always recommend consulting official government sources for final decisions
3. Be empathetic to visa challenges and encourage users
4. If information is not in the knowledge base, say so and suggest official sources
5. Explain complex visa concepts in simple terms
6. Provide step-by-step guidance when helpful
7. Maintain context from the conversation history
8. Ask clarifying questions when needed

User Question: ${userQuery}
`;
  }

  /**
   * Get default system prompt (fallback)
   */
  private getDefaultSystemPrompt(): string {
    return `You are VisaBuddy, an expert visa assistant helping users navigate visa applications worldwide.

You provide helpful information about:
- Visa requirements by country
- Application procedures
- Document preparation
- Common visa types (tourist, business, work, student)
- Troubleshooting visa issues

Important: Always recommend consulting official government sources for final decisions and verify current requirements, as visa policies change frequently.

Be helpful, empathetic, and encourage users to start their visa journey.`;
  }

  /**
   * Add custom knowledge entry (for future expansion)
   */
  async addKnowledgeEntry(entry: KnowledgeEntry): Promise<void> {
    this.knowledgeBase.push(entry);
    // In production, also save to database
    console.log(`Added knowledge entry: ${entry.topic}`);
  }

  /**
   * Update knowledge base from database
   */
  async syncWithDatabase(): Promise<void> {
    try {
      // This would load knowledge from database if you have a KnowledgeBase table
      // For now, in-memory knowledge base is used
      console.log('Knowledge base synced (in-memory)');
    } catch (error) {
      console.error('Error syncing knowledge base:', error);
    }
  }
}