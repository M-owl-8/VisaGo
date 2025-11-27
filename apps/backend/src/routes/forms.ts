/**
 * Form routes
 * Handles form pre-filling, validation, and submission
 */

import express, { Request, Response, NextFunction } from 'express';
import { authenticateToken } from '../middleware/auth';
import { validateRequest } from '../middleware/request-validation';
import { FormFillingService } from '../services/form-filling.service';
import { FormSubmissionService } from '../services/form-submission.service';
import { successResponse, createdResponse, errorResponse } from '../utils/response';
import { HTTP_STATUS, ERROR_CODES } from '../config/constants';

const router = express.Router();

// All routes require authentication
router.use(authenticateToken);

/**
 * GET /api/forms/template/:countryId/:visaTypeId
 * Get form template for a visa type
 *
 * @route GET /api/forms/template/:countryId/:visaTypeId
 * @access Private
 * @returns {object} Form template
 */
router.get(
  '/template/:countryId/:visaTypeId',
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const { countryId, visaTypeId } = req.params;

      const template = await FormFillingService.getFormTemplate(countryId, visaTypeId);

      successResponse(res, template);
    } catch (error) {
      next(error);
    }
  }
);

/**
 * POST /api/forms/prefill
 * Pre-fill form with user data using AI
 *
 * @route POST /api/forms/prefill
 * @access Private
 * @body {string} countryId - Country ID
 * @body {string} visaTypeId - Visa type ID
 * @returns {object} Pre-filled form data
 */
router.post(
  '/prefill',
  validateRequest({
    body: {
      required: ['countryId', 'visaTypeId'],
    },
  }),
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      if (!req.userId) {
        return errorResponse(
          res,
          HTTP_STATUS.UNAUTHORIZED,
          'User ID not found in request',
          ERROR_CODES.UNAUTHORIZED
        );
      }

      const { countryId, visaTypeId } = req.body;

      const preFilledForm = await FormFillingService.preFillForm(req.userId, countryId, visaTypeId);

      successResponse(res, preFilledForm);
    } catch (error) {
      next(error);
    }
  }
);

/**
 * POST /api/forms/validate
 * Validate form data
 *
 * @route POST /api/forms/validate
 * @access Private
 * @body {string} countryId - Country ID
 * @body {string} visaTypeId - Visa type ID
 * @body {object} formData - Form data to validate
 * @returns {object} Validation result
 */
router.post(
  '/validate',
  validateRequest({
    body: {
      required: ['countryId', 'visaTypeId', 'formData'],
    },
  }),
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const { countryId, visaTypeId, formData } = req.body;

      const template = await FormFillingService.getFormTemplate(countryId, visaTypeId);

      const validation = FormFillingService.validateFormData(template, formData);

      successResponse(res, validation);
    } catch (error) {
      next(error);
    }
  }
);

/**
 * POST /api/forms/:applicationId/save
 * Save form data to application
 *
 * @route POST /api/forms/:applicationId/save
 * @access Private
 * @body {object} formData - Form data to save
 * @returns {object} Success confirmation
 */
router.post(
  '/:applicationId/save',
  validateRequest({
    body: {
      required: ['formData'],
    },
  }),
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      if (!req.userId) {
        return errorResponse(
          res,
          HTTP_STATUS.UNAUTHORIZED,
          'User ID not found in request',
          ERROR_CODES.UNAUTHORIZED
        );
      }

      const { applicationId } = req.params;
      const { formData } = req.body;

      await FormFillingService.saveFormData(applicationId, formData);

      successResponse(res, { message: 'Form data saved successfully' });
    } catch (error) {
      next(error);
    }
  }
);

/**
 * POST /api/forms/:applicationId/submit
 * Submit application form
 *
 * @route POST /api/forms/:applicationId/submit
 * @access Private
 * @body {string} submissionMethod - "download" | "email" | "api"
 * @returns {object} Submission result
 */
router.post(
  '/:applicationId/submit',
  validateRequest({
    body: {
      optional: ['submissionMethod'],
    },
  }),
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      if (!req.userId) {
        return errorResponse(
          res,
          HTTP_STATUS.UNAUTHORIZED,
          'User ID not found in request',
          ERROR_CODES.UNAUTHORIZED
        );
      }

      const { applicationId } = req.params;
      const submissionMethod = req.body.submissionMethod || 'download';

      const result = await FormSubmissionService.submitForm(
        applicationId,
        req.userId,
        submissionMethod
      );

      successResponse(res, result, HTTP_STATUS.CREATED);
    } catch (error) {
      next(error);
    }
  }
);

/**
 * GET /api/forms/:applicationId/download
 * Download form as PDF
 *
 * @route GET /api/forms/:applicationId/download
 * @access Private
 * @returns {object} PDF download information
 */
router.get('/:applicationId/download', async (req: Request, res: Response, next: NextFunction) => {
  try {
    if (!req.userId) {
      return errorResponse(
        res,
        HTTP_STATUS.UNAUTHORIZED,
        'User ID not found in request',
        ERROR_CODES.UNAUTHORIZED
      );
    }

    const { applicationId } = req.params;

    const result = await FormSubmissionService.downloadFormPDF(applicationId, req.userId);

    successResponse(res, result);
  } catch (error) {
    next(error);
  }
});

export default router;
