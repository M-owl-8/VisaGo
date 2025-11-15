/**
 * Visa Type routes
 * Handles visa type selection and country lookup
 */

import express, { Request, Response, NextFunction } from "express";
import { VisaTypesService } from "../services/visa-types.service";

const router = express.Router();

/**
 * GET /api/visa-types
 * Get all unique visa types (across all countries)
 * 
 * @route GET /api/visa-types
 * @access Public
 * @query {string} [search] - Search visa types by name
 * @returns {object} List of unique visa types
 */
router.get("/", async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { search } = req.query;
    const visaTypes = await VisaTypesService.getAllVisaTypes(search as string);

    res.json({
      success: true,
      data: visaTypes,
      count: visaTypes.length,
    });
  } catch (error) {
    next(error);
  }
});

/**
 * GET /api/visa-types/popular
 * Get popular visa types
 * 
 * @route GET /api/visa-types/popular
 * @access Public
 * @returns {object} List of popular visa types
 */
router.get("/popular", async (req: Request, res: Response, next: NextFunction) => {
  try {
    const visaTypes = await VisaTypesService.getPopularVisaTypes();

    res.json({
      success: true,
      data: visaTypes,
    });
  } catch (error) {
    next(error);
  }
});

/**
 * GET /api/visa-types/:name
 * Get countries that offer a specific visa type
 * 
 * @route GET /api/visa-types/:name
 * @access Public
 * @param {string} name - Visa type name (e.g., "Student Visa", "Tourist Visa")
 * @returns {object} List of countries offering this visa type
 */
router.get("/:name", async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { name } = req.params;
    const countries = await VisaTypesService.getCountriesByVisaTypeName(name);

    res.json({
      success: true,
      data: countries,
      count: countries.length,
    });
  } catch (error) {
    next(error);
  }
});

/**
 * GET /api/visa-types/:name/countries/:countryId
 * Get specific visa type details for a country
 * 
 * @route GET /api/visa-types/:name/countries/:countryId
 * @access Public
 * @param {string} name - Visa type name
 * @param {string} countryId - Country ID
 * @returns {object} Visa type details
 */
router.get("/:name/countries/:countryId", async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { name, countryId } = req.params;
    const visaType = await VisaTypesService.getVisaTypeByNameAndCountry(name, countryId);

    res.json({
      success: true,
      data: visaType,
    });
  } catch (error) {
    next(error);
  }
});

export default router;








