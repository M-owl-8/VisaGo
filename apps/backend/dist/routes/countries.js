"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = __importDefault(require("express"));
const countries_service_1 = require("../services/countries.service");
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
exports.default = router;
//# sourceMappingURL=countries.js.map