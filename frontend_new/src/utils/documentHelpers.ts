/**
 * Document Type Utilities
 * Helpers for document type labels, icons, and formatting
 */

export const DOCUMENT_TYPE_LABELS: Record<string, string> = {
  passport: "Passport",
  birth_certificate: "Birth Certificate",
  bank_statement: "Bank Statement",
  proof_of_residence: "Proof of Residence",
  employment_letter: "Employment Letter",
  financial_proof: "Financial Proof",
  visa_photo: "Visa Photo",
  marriage_certificate: "Marriage Certificate",
  divorce_certificate: "Divorce Certificate",
  health_certificate: "Health Certificate",
  police_certificate: "Police Certificate",
  educational_certificate: "Educational Certificate",
  employment_contract: "Employment Contract",
  job_offer_letter: "Job Offer Letter",
  sponsorship_letter: "Sponsorship Letter",
  no_objection_certificate: "No Objection Certificate",
  travel_ticket: "Travel Ticket",
  accommodation_proof: "Accommodation Proof",
  insurance_certificate: "Insurance Certificate",
  vaccination_certificate: "Vaccination Certificate",
  language_certificate: "Language Certificate",
  degree_certificate: "Degree Certificate",
  transcript: "Transcript",
  cv_resume: "CV/Resume",
  motivation_letter: "Motivation Letter",
};

export const getDocumentTypeLabel = (type: string): string => {
  return DOCUMENT_TYPE_LABELS[type] || type.replace(/_/g, " ");
};

export const formatFileSize = (bytes: number): string => {
  if (bytes === 0) return "0 Bytes";
  const k = 1024;
  const sizes = ["Bytes", "KB", "MB", "GB"];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return Math.round((bytes / Math.pow(k, i)) * 100) / 100 + " " + sizes[i];
};

export const getStatusBadgeColor = (
  status: "pending" | "verified" | "rejected"
): { bg: string; text: string; icon: string } => {
  switch (status) {
    case "verified":
      return {
        bg: "#D4EDDA",
        text: "#155724",
        icon: "checkmark-circle",
      };
    case "rejected":
      return {
        bg: "#F8D7DA",
        text: "#721C24",
        icon: "close-circle",
      };
    case "pending":
      return {
        bg: "#FFF3CD",
        text: "#856404",
        icon: "hourglass",
      };
    default:
      return {
        bg: "#E2E3E5",
        text: "#383D41",
        icon: "help-circle",
      };
  }
};

export const calculateProgressPercentage = (
  uploaded: number,
  required: number
): number => {
  if (required === 0) return 0;
  return Math.round((uploaded / required) * 100);
};

export const formatUploadDate = (dateString: string): string => {
  const date = new Date(dateString);
  return date.toLocaleDateString("en-US", {
    year: "numeric",
    month: "short",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
};

export const groupDocumentsByStatus = (
  documents: any[],
  requiredTypes: string[]
): {
  verified: any[];
  pending: any[];
  missing: string[];
  rejected: any[];
} => {
  const grouped = {
    verified: documents.filter((d) => d.status === "verified"),
    pending: documents.filter((d) => d.status === "pending"),
    rejected: documents.filter((d) => d.status === "rejected"),
    missing: [] as string[],
  };

  const uploadedTypes = documents.map((d) => d.documentType);
  grouped.missing = requiredTypes.filter((type) => !uploadedTypes.includes(type));

  return grouped;
};

export const getOCRStatusLabel = (
  status?: "pending" | "processing" | "complete" | "failed"
): string => {
  switch (status) {
    case "processing":
      return "OCR Processing...";
    case "complete":
      return "OCR Complete";
    case "failed":
      return "OCR Failed";
    case "pending":
      return "OCR Pending";
    default:
      return "OCR Not Started";
  }
};

export const getOCRStatusBadgeColor = (
  status?: "pending" | "processing" | "complete" | "failed"
): { bg: string; text: string; icon: string } => {
  switch (status) {
    case "complete":
      return {
        bg: "#E8F5E9",
        text: "#2E7D32",
        icon: "checkmark-done",
      };
    case "processing":
      return {
        bg: "#E3F2FD",
        text: "#1565C0",
        icon: "hourglass",
      };
    case "failed":
      return {
        bg: "#FFEBEE",
        text: "#C62828",
        icon: "alert-circle",
      };
    case "pending":
      return {
        bg: "#FFF8E1",
        text: "#F57F17",
        icon: "clock",
      };
    default:
      return {
        bg: "#F5F5F5",
        text: "#616161",
        icon: "help-circle",
      };
  }
};
