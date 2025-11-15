/**
 * Form Submission Service
 * Handles form submission, PDF generation, and download
 */

import { PrismaClient } from "@prisma/client";
import { errors } from "../utils/errors";
import { logError, logInfo } from "../middleware/logger";

const prisma = new PrismaClient();

/**
 * Form submission result
 */
export interface FormSubmissionResult {
  applicationId: string;
  submitted: boolean;
  submittedAt: string;
  pdfUrl?: string;
  submissionMethod: "download" | "email" | "api";
  trackingNumber?: string;
}

/**
 * Form Submission Service
 * Handles form submission and PDF generation
 */
export class FormSubmissionService {
  /**
   * Submit application form
   * 
   * @param applicationId - Application ID
   * @param userId - User ID
   * @param submissionMethod - How to submit (download, email, api)
   * @returns Submission result
   */
  static async submitForm(
    applicationId: string,
    userId: string,
    submissionMethod: "download" | "email" | "api" = "download"
  ): Promise<FormSubmissionResult> {
    try {
      // Get application
      const application = await prisma.visaApplication.findUnique({
        where: { id: applicationId },
        include: {
          country: true,
          visaType: true,
          user: true,
        },
      });

      if (!application) {
        throw errors.notFound("Application");
      }

      // Verify ownership
      if (application.userId !== userId) {
        throw errors.forbidden();
      }

      // Validate form is complete
      const validation = await this.validateApplicationComplete(application);
      if (!validation.isValid) {
        throw errors.validationError(
          `Application is incomplete: ${validation.missingFields.join(", ")}`
        );
      }

      // Generate PDF
      const pdfUrl = await this.generatePDF(application);

      // Update application status
      await prisma.visaApplication.update({
        where: { id: applicationId },
        data: {
          status: "submitted",
          submissionDate: new Date(),
          progressPercentage: 75, // Submitted = 75% progress
          notes: JSON.stringify({
            ...(application.notes ? JSON.parse(application.notes) : {}),
            submittedAt: new Date().toISOString(),
            submissionMethod,
            pdfUrl,
          }),
        },
      });

      // Update checkpoints
      await prisma.checkpoint.updateMany({
        where: {
          applicationId,
          order: { in: [2, 3] }, // Document Preparation and Submission
        },
        data: {
          isCompleted: true,
          completedAt: new Date(),
        },
      });

      logInfo("Form submitted successfully", {
        applicationId,
        userId,
        submissionMethod,
      });

      return {
        applicationId,
        submitted: true,
        submittedAt: new Date().toISOString(),
        pdfUrl,
        submissionMethod,
        trackingNumber: `VB-${applicationId.substring(0, 8).toUpperCase()}`,
      };
    } catch (error) {
      logError("Error submitting form", error as Error, {
        applicationId,
        userId,
      });
      throw error;
    }
  }

  /**
   * Generate PDF from application form
   */
  private static async generatePDF(application: any): Promise<string> {
    // For now, return a placeholder URL
    // In production, use a PDF library like pdfkit or puppeteer
    const pdfData = {
      applicationId: application.id,
      country: application.country.name,
      visaType: application.visaType.name,
      submittedAt: new Date().toISOString(),
    };

    // Generate PDF file path
    // Note: Actual PDF generation can be implemented using libraries like pdfkit or puppeteer
    // For now, we return a URL that can be used to generate/download the PDF on-demand
    logInfo("PDF generation requested", { applicationId: application.id });

    // Return URL endpoint for PDF generation/download
    // The actual PDF will be generated on-demand when this endpoint is accessed
    const baseUrl = process.env.FRONTEND_URL || process.env.API_URL || "http://localhost:3000";
    return `${baseUrl}/api/applications/${application.id}/form.pdf`;
  }

  /**
   * Validate application is complete
   */
  private static async validateApplicationComplete(application: any): Promise<{
    isValid: boolean;
    missingFields: string[];
  }> {
    const missingFields: string[] = [];

    // Check if form data exists
    let formData: any = {};
    try {
      if (application.notes) {
        const notes = JSON.parse(application.notes);
        formData = notes.formData || {};
      }
    } catch {
      // Notes not in JSON format
    }

    // Check required fields
    const requiredFields = [
      "firstName",
      "lastName",
      "email",
      "phone",
      "dateOfBirth",
      "nationality",
      "passportNumber",
      "passportExpiryDate",
      "purposeOfVisit",
    ];

    for (const field of requiredFields) {
      if (!formData[field] || formData[field] === "") {
        missingFields.push(field);
      }
    }

    // Check documents are uploaded
    const documents = await prisma.userDocument.findMany({
      where: { applicationId: application.id },
    });

    const requiredDocs = ["passport", "photo"];
    for (const docType of requiredDocs) {
      const doc = documents.find((d) => d.documentType === docType);
      if (!doc || doc.status !== "verified") {
        missingFields.push(`document_${docType}`);
      }
    }

    return {
      isValid: missingFields.length === 0,
      missingFields,
    };
  }

  /**
   * Download form as PDF
   */
  static async downloadFormPDF(
    applicationId: string,
    userId: string
  ): Promise<{ pdfUrl: string; filename: string }> {
    const application = await prisma.visaApplication.findUnique({
      where: { id: applicationId },
      include: {
        country: true,
        visaType: true,
        user: true,
      },
    });

    if (!application) {
      throw errors.notFound("Application");
    }

    if (application.userId !== userId) {
      throw errors.forbidden();
    }

    const pdfUrl = await this.generatePDF(application);
    const filename = `visa-application-${application.country.code}-${application.id}.pdf`;

    return { pdfUrl, filename };
  }

  /**
   * Email form to user
   */
  static async emailForm(
    applicationId: string,
    userId: string,
    recipientEmail?: string
  ): Promise<void> {
    const application = await prisma.visaApplication.findUnique({
      where: { id: applicationId },
      include: {
        country: true,
        visaType: true,
        user: true,
      },
    });

    if (!application) {
      throw errors.notFound("Application");
    }

    if (application.userId !== userId) {
      throw errors.forbidden();
    }

    const email = recipientEmail || application.user.email;
    const pdfUrl = await this.generatePDF(application);

    // Send email notification with PDF link
    // Note: PDF attachment can be added when PDF generation is fully implemented
    try {
      const { EmailService } = await import("./email.service");
      const emailService = new EmailService();
      const userName = `${application.user.firstName} ${application.user.lastName}`;
      
      await emailService.send({
        to: email,
        subject: `Your ${application.visaType.name} Visa Application Form - ${application.country.name}`,
        html: `
          <h2>Your Visa Application Form</h2>
          <p>Dear ${userName},</p>
          <p>Your visa application form for ${application.country.name} (${application.visaType.name}) is ready.</p>
          <p><strong>Application ID:</strong> ${application.id}</p>
          <p>You can download your application form PDF using the link below:</p>
          <p><a href="${pdfUrl}" style="background: #1976d2; color: white; padding: 10px 20px; text-decoration: none; border-radius: 4px; display: inline-block;">Download Application Form</a></p>
          <p>If you have any questions, please contact our support team.</p>
          <p>Best regards,<br>VisaBuddy Team</p>
        `,
        text: `Your Visa Application Form\n\nDear ${userName},\n\nYour visa application form for ${application.country.name} (${application.visaType.name}) is ready.\n\nApplication ID: ${application.id}\n\nDownload your form: ${pdfUrl}\n\nBest regards,\nVisaBuddy Team`,
      });
      
      logInfo("Form email sent successfully", {
        applicationId,
        recipientEmail: email,
      });
    } catch (error) {
      logError("Failed to send form email", error as Error, {
        applicationId,
        recipientEmail: email,
      });
      // Don't fail the request if email fails - log and continue
    }
  }
}


