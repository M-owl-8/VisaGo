"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = __importDefault(require("express"));
const countries_service_1 = require("../services/countries.service");
const visa_requirements_service_1 = require("../services/visa-requirements.service");
const router = express_1.default.Router();
/**
 * GET /api/countries
 * Get all countries (with optional search)
 */
router.get("/", async (req, res, next) => {
    try {
        const { search } = req.query;
        const countries = await countries_service_1.CountriesService.getAllCountries(search);
        res.json({
            success: true,
            data: countries,
            count: countries.length,
        });
    }
    catch (error) {
        next(error);
    }
});
/**
 * GET /api/countries/popular
 * Get popular countries (top 10)
 */
router.get("/popular", async (req, res, next) => {
    try {
        const countries = await countries_service_1.CountriesService.getPopularCountries();
        res.json({
            success: true,
            data: countries,
        });
    }
    catch (error) {
        next(error);
    }
});
/**
 * GET /api/countries/:id
 * Get country by ID
 */
router.get("/:id", async (req, res, next) => {
    try {
        const country = await countries_service_1.CountriesService.getCountryById(req.params.id);
        res.json({
            success: true,
            data: country,
        });
    }
    catch (error) {
        next(error);
    }
});
/**
 * GET /api/countries/code/:code
 * Get country by ISO code (e.g., US, GB)
 */
router.get("/code/:code", async (req, res, next) => {
    try {
        const country = await countries_service_1.CountriesService.getCountryByCode(req.params.code);
        res.json({
            success: true,
            data: country,
        });
    }
    catch (error) {
        next(error);
    }
});
/**
 * GET /api/countries/:countryId/visa-types
 * Get all visa types for a country
 */
router.get("/:countryId/visa-types", async (req, res, next) => {
    try {
        const visaTypes = await countries_service_1.CountriesService.getVisaTypesByCountry(req.params.countryId);
        res.json({
            success: true,
            data: visaTypes,
        });
    }
    catch (error) {
        next(error);
    }
});
/**
 * GET /api/countries/visa-requirements/check
 * Check visa requirement for a country (for Uzbek citizens by default)
 * Query params: countryName (required), nationalityCode (optional, default: UZ)
 */
router.get("/visa-requirements/check", async (req, res, next) => {
    try {
        const { countryName, nationalityCode } = req.query;
        if (!countryName) {
            return res.status(400).json({
                success: false,
                error: { message: "countryName query parameter is required" },
            });
        }
        const requirement = await (0, visa_requirements_service_1.checkVisaRequirement)(countryName, nationalityCode || 'UZ');
        res.json({
            success: true,
            data: requirement,
        });
    }
    catch (error) {
        next(error);
    }
});
/**
 * GET /api/countries/visa-requirements/all
 * Get all countries that require visas (for Uzbek citizens by default)
 * Query params: nationalityCode (optional, default: UZ)
 */
router.get("/visa-requirements/all", async (req, res, next) => {
    try {
        const { nationalityCode } = req.query;
        const countries = (0, visa_requirements_service_1.getAllVisaRequiredCountries)(nationalityCode || 'UZ');
        res.json({
            success: true,
            data: countries,
            count: countries.length,
        });
    }
    catch (error) {
        next(error);
    }
});
/**
 * GET /api/countries/visa-requirements/regions
 * Get visa requirements organized by region (for Uzbek citizens by default)
 * Query params: nationalityCode (optional, default: UZ)
 */
router.get("/visa-requirements/regions", async (req, res, next) => {
    try {
        const { nationalityCode } = req.query;
        const regions = (0, visa_requirements_service_1.getVisaRequirementsByRegion)(nationalityCode || 'UZ');
        res.json({
            success: true,
            data: regions,
        });
    }
    catch (error) {
        next(error);
    }
});
exports.default = router;
//# sourceMappingURL=countries.js.map