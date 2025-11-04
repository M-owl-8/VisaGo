import { Router, Request, Response } from 'express';
import fs from 'fs';
import path from 'path';

const router = Router();

/**
 * GET /api/legal/privacy-policy
 * Serves the privacy policy HTML
 */
router.get('/privacy-policy', (req: Request, res: Response) => {
  try {
    // From dist/routes/legal.js: ../../.. goes to root
    const filePath = path.join(__dirname, '../../../../privacy_policy.html');
    
    // Check if file exists
    if (!fs.existsSync(filePath)) {
      return res.status(404).json({ 
        error: 'Privacy policy not found' 
      });
    }

    const content = fs.readFileSync(filePath, 'utf-8');
    
    // Set cache headers for 7 days
    res.setHeader('Content-Type', 'text/html; charset=utf-8');
    res.setHeader('Cache-Control', 'public, max-age=604800');
    
    res.send(content);
  } catch (error) {
    console.error('Error serving privacy policy:', error);
    res.status(500).json({ 
      error: 'Failed to retrieve privacy policy' 
    });
  }
});

/**
 * GET /api/legal/terms-of-service
 * Serves the terms of service HTML
 */
router.get('/terms-of-service', (req: Request, res: Response) => {
  try {
    // From dist/routes/legal.js: ../../.. goes to root
    const filePath = path.join(__dirname, '../../../../terms_of_service.html');
    
    if (!fs.existsSync(filePath)) {
      return res.status(404).json({ 
        error: 'Terms of service not found' 
      });
    }

    const content = fs.readFileSync(filePath, 'utf-8');
    
    // Set cache headers for 7 days
    res.setHeader('Content-Type', 'text/html; charset=utf-8');
    res.setHeader('Cache-Control', 'public, max-age=604800');
    
    res.send(content);
  } catch (error) {
    console.error('Error serving terms of service:', error);
    res.status(500).json({ 
      error: 'Failed to retrieve terms of service' 
    });
  }
});

/**
 * GET /api/legal/privacy-policy/json
 * Returns privacy policy as JSON (for in-app display)
 */
router.get('/privacy-policy/json', (req: Request, res: Response) => {
  try {
    res.json({
      title: 'Privacy Policy',
      lastUpdated: 'January 2025',
      sections: [
        {
          title: '1. Information We Collect',
          content: 'Account Information: Email, name, phone number, password. Visa Application Data: Nationality, visa type, dates, status. Documents: Passport scans, photos, supporting documents. Payment Information: Transaction records. Device Information: Device type, OS version, app version. Usage Data: Features used, time spent, error logs.'
        },
        {
          title: '2. How We Use Information',
          content: 'Provide visa application services and guidance. Process payments securely. Communicate about your applications. Improve app features. Comply with legal obligations.'
        },
        {
          title: '3. Data Security',
          content: 'We store data on secure servers with encryption. Payment details are never stored by VisaBuddy.'
        },
        {
          title: '4. Third-Party Services',
          content: 'We use Firebase, Google, Payment Processors, and OpenAI.'
        },
        {
          title: '5. Your Rights',
          content: 'You can access, delete, or correct your personal data.'
        },
        {
          title: '6. Contact',
          content: 'For privacy concerns: privacy@visabuddy.com'
        }
      ]
    });
  } catch (error) {
    console.error('Error generating privacy policy JSON:', error);
    res.status(500).json({ 
      error: 'Failed to generate privacy policy' 
    });
  }
});

/**
 * GET /api/legal/terms-of-service/json
 * Returns terms of service as JSON (for in-app display)
 */
router.get('/terms-of-service/json', (req: Request, res: Response) => {
  try {
    res.json({
      title: 'Terms of Service',
      lastUpdated: 'January 2025',
      sections: [
        {
          title: '1. Acceptance of Terms',
          content: 'By using VisaBuddy, you agree to these terms.'
        },
        {
          title: '2. Service Description',
          content: 'VisaBuddy provides information and tools to help manage visa applications. We are NOT immigration lawyers.'
        },
        {
          title: '3. User Responsibilities',
          content: 'Provide accurate information. Not share account credentials. Not upload fraudulent documents. Comply with applicable laws.'
        },
        {
          title: '4. Limitations',
          content: 'We cannot guarantee visa approval or provide legal advice.'
        },
        {
          title: '5. Payment Terms',
          content: 'All payments are non-refundable unless required by law.'
        },
        {
          title: '6. Contact',
          content: 'For inquiries: support@visabuddy.com'
        }
      ]
    });
  } catch (error) {
    console.error('Error generating terms of service JSON:', error);
    res.status(500).json({ 
      error: 'Failed to generate terms of service' 
    });
  }
});

export default router;