"use strict";
var __awaiter = (this && this.__awaiter) || function (thisArg, _arguments, P, generator) {
    function adopt(value) { return value instanceof P ? value : new P(function (resolve) { resolve(value); }); }
    return new (P || (P = Promise))(function (resolve, reject) {
        function fulfilled(value) { try { step(generator.next(value)); } catch (e) { reject(e); } }
        function rejected(value) { try { step(generator["throw"](value)); } catch (e) { reject(e); } }
        function step(result) { result.done ? resolve(result.value) : adopt(result.value).then(fulfilled, rejected); }
        step((generator = generator.apply(thisArg, _arguments || [])).next());
    });
};
var __generator = (this && this.__generator) || function (thisArg, body) {
    var _ = { label: 0, sent: function() { if (t[0] & 1) throw t[1]; return t[1]; }, trys: [], ops: [] }, f, y, t, g = Object.create((typeof Iterator === "function" ? Iterator : Object).prototype);
    return g.next = verb(0), g["throw"] = verb(1), g["return"] = verb(2), typeof Symbol === "function" && (g[Symbol.iterator] = function() { return this; }), g;
    function verb(n) { return function (v) { return step([n, v]); }; }
    function step(op) {
        if (f) throw new TypeError("Generator is already executing.");
        while (g && (g = 0, op[0] && (_ = 0)), _) try {
            if (f = 1, y && (t = op[0] & 2 ? y["return"] : op[0] ? y["throw"] || ((t = y["return"]) && t.call(y), 0) : y.next) && !(t = t.call(y, op[1])).done) return t;
            if (y = 0, t) op = [op[0] & 2, t.value];
            switch (op[0]) {
                case 0: case 1: t = op; break;
                case 4: _.label++; return { value: op[1], done: false };
                case 5: _.label++; y = op[1]; op = [0]; continue;
                case 7: op = _.ops.pop(); _.trys.pop(); continue;
                default:
                    if (!(t = _.trys, t = t.length > 0 && t[t.length - 1]) && (op[0] === 6 || op[0] === 2)) { _ = 0; continue; }
                    if (op[0] === 3 && (!t || (op[1] > t[0] && op[1] < t[3]))) { _.label = op[1]; break; }
                    if (op[0] === 6 && _.label < t[1]) { _.label = t[1]; t = op; break; }
                    if (t && _.label < t[2]) { _.label = t[2]; _.ops.push(op); break; }
                    if (t[2]) _.ops.pop();
                    _.trys.pop(); continue;
            }
            op = body.call(thisArg, _);
        } catch (e) { op = [6, e]; y = 0; } finally { f = t = 0; }
        if (op[0] & 5) throw op[1]; return { value: op[0] ? op[1] : void 0, done: true };
    }
};
Object.defineProperty(exports, "__esModule", { value: true });
var client_1 = require("@prisma/client");
var prisma = new client_1.PrismaClient();
function main() {
    return __awaiter(this, void 0, void 0, function () {
        var countries, createdCountries, visaTypes;
        return __generator(this, function (_a) {
            switch (_a.label) {
                case 0:
                    console.log("🌱 Starting database seed...");
                    // Clear existing data in correct order (child records first, then parent records)
                    // This prevents foreign key constraint violations
                    console.log("🗑️  Clearing existing data...");
                    // Delete child records that reference VisaApplication
                    return [4 /*yield*/, prisma.checkpoint.deleteMany({})];
                case 1:
                    // Delete child records that reference VisaApplication
                    _a.sent();
                    return [4 /*yield*/, prisma.userDocument.deleteMany({})];
                case 2:
                    _a.sent();
                    return [4 /*yield*/, prisma.payment.deleteMany({})];
                case 3:
                    _a.sent();
                    // Delete applications that reference VisaType and Country
                    return [4 /*yield*/, prisma.visaApplication.deleteMany({})];
                case 4:
                    // Delete applications that reference VisaType and Country
                    _a.sent();
                    return [4 /*yield*/, prisma.application.deleteMany({})];
                case 5:
                    _a.sent();
                    // Now safe to delete VisaType and Country
                    return [4 /*yield*/, prisma.visaType.deleteMany({})];
                case 6:
                    // Now safe to delete VisaType and Country
                    _a.sent();
                    return [4 /*yield*/, prisma.country.deleteMany({})];
                case 7:
                    _a.sent();
                    console.log("✅ Existing data cleared");
                    countries = [
                        {
                            name: "United States",
                            code: "US",
                            flagEmoji: "🇺🇸",
                            description: "Land of opportunity with various visa categories",
                            requirements: JSON.stringify({
                                minAge: 18,
                                language: "English proficiency required for many visa types",
                            }),
                        },
                        {
                            name: "United Kingdom",
                            code: "GB",
                            flagEmoji: "🇬🇧",
                            description: "Home to world-class universities and opportunities",
                            requirements: JSON.stringify({
                                minAge: 18,
                                language: "English language requirement varies by visa type",
                            }),
                        },
                        {
                            name: "Spain",
                            code: "ES",
                            flagEmoji: "🇪🇸",
                            description: "European charm with vibrant culture",
                            requirements: JSON.stringify({
                                minAge: 18,
                                language: "A1 Spanish proficiency for most visas",
                            }),
                        },
                        {
                            name: "Germany",
                            code: "DE",
                            flagEmoji: "🇩🇪",
                            description: "Economic powerhouse with strong job market",
                            requirements: JSON.stringify({
                                minAge: 18,
                                language: "B1 German language proficiency required",
                            }),
                        },
                        {
                            name: "Japan",
                            code: "JP",
                            flagEmoji: "🇯🇵",
                            description: "Land of innovation and tradition",
                            requirements: JSON.stringify({
                                minAge: 18,
                                language: "Japanese language helpful but not always required",
                            }),
                        },
                        {
                            name: "United Arab Emirates",
                            code: "AE",
                            flagEmoji: "🇦🇪",
                            description: "Modern Arab hub with thriving economy",
                            requirements: JSON.stringify({
                                minAge: 18,
                                language: "English widely spoken",
                            }),
                        },
                        {
                            name: "Canada",
                            code: "CA",
                            flagEmoji: "🇨🇦",
                            description: "North American destination known for quality of life",
                            requirements: JSON.stringify({
                                minAge: 18,
                                language: "English or French proficiency required",
                            }),
                        },
                        {
                            name: "Australia",
                            code: "AU",
                            flagEmoji: "🇦🇺",
                            description: "Southern hemisphere adventure with opportunity",
                            requirements: JSON.stringify({
                                minAge: 18,
                                language: "English language requirement",
                            }),
                        },
                    ];
                    return [4 /*yield*/, Promise.all(countries.map(function (country) {
                            return prisma.country.create({
                                data: country,
                            });
                        }))];
                case 8:
                    createdCountries = _a.sent();
                    console.log("\u2705 Created ".concat(createdCountries.length, " countries"));
                    visaTypes = [
                        // USA Visas
                        {
                            countryId: createdCountries[0].id,
                            name: "B1/B2 Visitor Visa",
                            description: "For tourism and business purposes",
                            processingDays: 30,
                            validity: "10 years",
                            fee: 160,
                            requirements: JSON.stringify({
                                documents: ["passport", "photo", "visa_application", "financial_proof"],
                            }),
                            documentTypes: JSON.stringify([
                                "passport",
                                "passport_photo",
                                "visa_application_form",
                                "financial_proof",
                                "employment_letter",
                            ]),
                        },
                        {
                            countryId: createdCountries[0].id,
                            name: "F-1 Student Visa",
                            description: "For students pursuing academic programs",
                            processingDays: 45,
                            validity: "Duration of study + 1 year",
                            fee: 350,
                            requirements: JSON.stringify({
                                documents: [
                                    "i20_form",
                                    "passport",
                                    "bank_statement",
                                    "academic_records",
                                ],
                            }),
                            documentTypes: JSON.stringify([
                                "passport",
                                "i20_form",
                                "bank_statement",
                                "academic_records",
                                "visa_application_form",
                            ]),
                        },
                        {
                            countryId: createdCountries[0].id,
                            name: "H-1B Work Visa",
                            description: "For specialty occupation workers",
                            processingDays: 60,
                            validity: "3 years (renewable)",
                            fee: 460,
                            requirements: JSON.stringify({
                                documents: ["passport", "job_offer", "degree_certificate", "passport_photo"],
                            }),
                            documentTypes: JSON.stringify([
                                "passport",
                                "job_offer_letter",
                                "degree_certificate",
                                "employment_verification",
                                "passport_photo",
                            ]),
                        },
                        // UK Visas
                        {
                            countryId: createdCountries[1].id,
                            name: "Standard Visitor Visa",
                            description: "For tourism, business, and family visits",
                            processingDays: 20,
                            validity: "6 months to 10 years",
                            fee: 100,
                            requirements: JSON.stringify({
                                documents: [
                                    "passport",
                                    "financial_proof",
                                    "accommodation_proof",
                                    "travel_plans",
                                ],
                            }),
                            documentTypes: JSON.stringify([
                                "passport",
                                "bank_statement",
                                "accommodation_booking",
                                "travel_itinerary",
                                "passport_photo",
                            ]),
                        },
                        {
                            countryId: createdCountries[1].id,
                            name: "Student Visa",
                            description: "For students enrolled in UK educational institutions",
                            processingDays: 30,
                            validity: "Duration of course + 4 months",
                            fee: 719,
                            requirements: JSON.stringify({
                                documents: ["cas_number", "passport", "bank_statement", "academic_records"],
                            }),
                            documentTypes: JSON.stringify([
                                "passport",
                                "cas_letter",
                                "bank_statement",
                                "degree_certificate",
                                "ielts_certificate",
                            ]),
                        },
                        {
                            countryId: createdCountries[1].id,
                            name: "Skilled Worker Visa",
                            description: "For skilled professionals in shortage occupations",
                            processingDays: 45,
                            validity: "Up to 5 years",
                            fee: 719,
                            requirements: JSON.stringify({
                                documents: ["job_offer", "passport", "diploma", "skills_assessment"],
                            }),
                            documentTypes: JSON.stringify([
                                "passport",
                                "job_offer_letter",
                                "degree_certificate",
                                "skills_assessment",
                                "financial_proof",
                            ]),
                        },
                        // Spain Visas
                        {
                            countryId: createdCountries[2].id,
                            name: "Schengen Tourist Visa",
                            description: "For short-term tourism in Spain and EU",
                            processingDays: 15,
                            validity: "90 days",
                            fee: 80,
                            requirements: JSON.stringify({
                                documents: ["passport", "travel_itinerary", "financial_proof", "travel_insurance"],
                            }),
                            documentTypes: JSON.stringify([
                                "passport",
                                "travel_itinerary",
                                "bank_statement",
                                "travel_insurance",
                                "accommodation_proof",
                            ]),
                        },
                        {
                            countryId: createdCountries[2].id,
                            name: "Student Visa",
                            description: "For students attending Spanish universities",
                            processingDays: 30,
                            validity: "1 year (renewable)",
                            fee: 150,
                            requirements: JSON.stringify({
                                documents: ["admission_letter", "passport", "bank_statement", "accommodation"],
                            }),
                            documentTypes: JSON.stringify([
                                "passport",
                                "university_admission_letter",
                                "bank_statement",
                                "accommodation_proof",
                                "spanish_level_certificate",
                            ]),
                        },
                        {
                            countryId: createdCountries[2].id,
                            name: "Work Visa",
                            description: "For employment opportunities in Spain",
                            processingDays: 45,
                            validity: "1 year (renewable)",
                            fee: 200,
                            requirements: JSON.stringify({
                                documents: ["job_offer", "passport", "work_permit", "degree"],
                            }),
                            documentTypes: JSON.stringify([
                                "passport",
                                "job_offer_letter",
                                "work_permit_application",
                                "degree_certificate",
                                "employment_contract",
                            ]),
                        },
                        // Germany Visas
                        {
                            countryId: createdCountries[3].id,
                            name: "Schengen Tourist Visa",
                            description: "For tourism in Germany and Schengen area",
                            processingDays: 14,
                            validity: "90 days",
                            fee: 80,
                            requirements: JSON.stringify({
                                documents: ["passport", "travel_itinerary", "financial_proof", "health_insurance"],
                            }),
                            documentTypes: JSON.stringify([
                                "passport",
                                "travel_itinerary",
                                "bank_statement",
                                "health_insurance",
                                "accommodation_proof",
                            ]),
                        },
                        {
                            countryId: createdCountries[3].id,
                            name: "Study Permit",
                            description: "For students attending German universities",
                            processingDays: 35,
                            validity: "2 years (renewable)",
                            fee: 75,
                            requirements: JSON.stringify({
                                documents: ["admission_letter", "passport", "financial_proof", "language_certificate"],
                            }),
                            documentTypes: JSON.stringify([
                                "passport",
                                "university_admission",
                                "financial_statement",
                                "german_language_test",
                                "health_insurance",
                            ]),
                        },
                        {
                            countryId: createdCountries[3].id,
                            name: "Work Visa",
                            description: "For employment in Germany",
                            processingDays: 50,
                            validity: "2 years",
                            fee: 220,
                            requirements: JSON.stringify({
                                documents: ["job_offer", "passport", "degree", "german_language_cert"],
                            }),
                            documentTypes: JSON.stringify([
                                "passport",
                                "job_offer_letter",
                                "degree_certificate",
                                "german_language_certificate",
                                "employment_contract",
                            ]),
                        },
                        // Japan Visas
                        {
                            countryId: createdCountries[4].id,
                            name: "Temporary Visitor",
                            description: "For tourism and short stays in Japan",
                            processingDays: 10,
                            validity: "90 days",
                            fee: 0,
                            requirements: JSON.stringify({
                                documents: ["passport", "passport_photo", "travel_itinerary", "return_ticket"],
                            }),
                            documentTypes: JSON.stringify([
                                "passport",
                                "passport_photo",
                                "travel_itinerary",
                                "return_flight_ticket",
                                "accommodation_proof",
                            ]),
                        },
                        {
                            countryId: createdCountries[4].id,
                            name: "Student Visa",
                            description: "For students in Japanese educational institutions",
                            processingDays: 40,
                            validity: "1-4 years",
                            fee: 0,
                            requirements: JSON.stringify({
                                documents: ["admission_letter", "passport", "financial_proof", "sponsor_form"],
                            }),
                            documentTypes: JSON.stringify([
                                "passport",
                                "admission_letter",
                                "financial_documents",
                                "coe_certificate",
                                "passport_photo",
                            ]),
                        },
                        {
                            countryId: createdCountries[4].id,
                            name: "Work Visa",
                            description: "For employment in Japan",
                            processingDays: 45,
                            validity: "1-3 years (renewable)",
                            fee: 0,
                            requirements: JSON.stringify({
                                documents: ["job_offer", "passport", "degree", "certificate_of_eligibility"],
                            }),
                            documentTypes: JSON.stringify([
                                "passport",
                                "job_offer_letter",
                                "degree_certificate",
                                "coe_certificate",
                                "employment_contract",
                            ]),
                        },
                        // UAE Visas
                        {
                            countryId: createdCountries[5].id,
                            name: "Tourist Visa",
                            description: "For short-term tourism in UAE",
                            processingDays: 5,
                            validity: "30 days",
                            fee: 50,
                            requirements: JSON.stringify({
                                documents: ["passport", "passport_photo", "financial_proof", "return_ticket"],
                            }),
                            documentTypes: JSON.stringify([
                                "passport",
                                "passport_photo",
                                "bank_statement",
                                "return_flight_ticket",
                                "accommodation_proof",
                            ]),
                        },
                        {
                            countryId: createdCountries[5].id,
                            name: "Work Visa",
                            description: "For employment opportunities in UAE",
                            processingDays: 30,
                            validity: "2 years (renewable)",
                            fee: 250,
                            requirements: JSON.stringify({
                                documents: ["job_offer", "passport", "medical_test", "background_check"],
                            }),
                            documentTypes: JSON.stringify([
                                "passport",
                                "job_offer_letter",
                                "employment_contract",
                                "medical_examination",
                                "police_clearance",
                            ]),
                        },
                        {
                            countryId: createdCountries[5].id,
                            name: "Student Visa",
                            description: "For students in UAE institutions",
                            processingDays: 20,
                            validity: "Duration of study",
                            fee: 100,
                            requirements: JSON.stringify({
                                documents: ["admission_letter", "passport", "sponsor_approval", "financial_proof"],
                            }),
                            documentTypes: JSON.stringify([
                                "passport",
                                "admission_letter",
                                "sponsor_letter",
                                "bank_statement",
                                "passport_photo",
                            ]),
                        },
                        // Canada Visas
                        {
                            countryId: createdCountries[6].id,
                            name: "Visitor Visa",
                            description: "For tourism, business, and family visits",
                            processingDays: 25,
                            validity: "Up to 10 years",
                            fee: 100,
                            requirements: JSON.stringify({
                                documents: ["passport", "financial_proof", "travel_itinerary", "ties_to_home"],
                            }),
                            documentTypes: JSON.stringify([
                                "passport",
                                "bank_statement",
                                "travel_itinerary",
                                "employment_letter",
                                "property_documents",
                            ]),
                        },
                        {
                            countryId: createdCountries[6].id,
                            name: "Study Permit",
                            description: "For students in Canadian institutions",
                            processingDays: 35,
                            validity: "Duration of study + 3 months",
                            fee: 150,
                            requirements: JSON.stringify({
                                documents: ["loa_letter", "passport", "financial_proof", "medical_exam"],
                            }),
                            documentTypes: JSON.stringify([
                                "passport",
                                "loa_letter",
                                "financial_proof",
                                "medical_examination",
                                "police_clearance",
                            ]),
                        },
                        {
                            countryId: createdCountries[6].id,
                            name: "Express Entry Work Visa",
                            description: "For skilled workers through Express Entry program",
                            processingDays: 90,
                            validity: "Up to 3 years",
                            fee: 550,
                            requirements: JSON.stringify({
                                documents: ["job_offer", "language_test", "education_credentials", "medical_exam"],
                            }),
                            documentTypes: JSON.stringify([
                                "passport",
                                "language_test_results",
                                "education_certificate",
                                "job_offer_letter",
                                "police_clearance",
                            ]),
                        },
                        // Australia Visas
                        {
                            countryId: createdCountries[7].id,
                            name: "Visitor Visa",
                            description: "For tourism and family visits to Australia",
                            processingDays: 20,
                            validity: "Usually 1 year",
                            fee: 145,
                            requirements: JSON.stringify({
                                documents: ["passport", "financial_proof", "travel_itinerary", "accommodation"],
                            }),
                            documentTypes: JSON.stringify([
                                "passport",
                                "bank_statement",
                                "travel_itinerary",
                                "accommodation_booking",
                                "employment_letter",
                            ]),
                        },
                        {
                            countryId: createdCountries[7].id,
                            name: "Student Visa",
                            description: "For students in Australian educational institutions",
                            processingDays: 45,
                            validity: "Duration of course + 6 months",
                            fee: 620,
                            requirements: JSON.stringify({
                                documents: ["coe_number", "passport", "financial_proof", "medical_exam"],
                            }),
                            documentTypes: JSON.stringify([
                                "passport",
                                "coe_confirmation",
                                "financial_proof",
                                "medical_examination",
                                "police_clearance",
                            ]),
                        },
                        {
                            countryId: createdCountries[7].id,
                            name: "Skilled Migration Visa",
                            description: "For skilled professionals planning to work in Australia",
                            processingDays: 60,
                            validity: "Permanent resident status",
                            fee: 3600,
                            requirements: JSON.stringify({
                                documents: ["skills_assessment", "language_test", "occupation_list", "points_test"],
                            }),
                            documentTypes: JSON.stringify([
                                "passport",
                                "skills_assessment",
                                "ielts_certificate",
                                "occupation_certificate",
                                "police_clearance",
                            ]),
                        },
                    ];
                    return [4 /*yield*/, Promise.all(visaTypes.map(function (visaType) {
                            return prisma.visaType.create({
                                data: visaType,
                            });
                        }))];
                case 9:
                    _a.sent();
                    console.log("\u2705 Created ".concat(visaTypes.length, " visa types"));
                    console.log("✨ Database seed completed successfully!");
                    return [2 /*return*/];
            }
        });
    });
}
main()
    .catch(function (e) {
    console.error("❌ Seed failed:", e);
    process.exit(1);
})
    .finally(function () { return __awaiter(void 0, void 0, void 0, function () {
    return __generator(this, function (_a) {
        switch (_a.label) {
            case 0: return [4 /*yield*/, prisma.$disconnect()];
            case 1:
                _a.sent();
                return [2 /*return*/];
        }
    });
}); });
