export interface DocumentTypeConfig {
  id: string;
  labelDe: string;
  labelEn: string;
  required: boolean;
  confidenceWeight: number;
  requiredFields: string[];
  optionalFields: string[];
  redFlagRules: string[];
}

export const DOCUMENT_TYPES: Record<string, DocumentTypeConfig> = {
  "insurance-cert": {
    id: "insurance-cert",
    labelDe: "Versicherungsnachweis",
    labelEn: "Insurance Certificate",
    required: true,
    confidenceWeight: 0.25,
    requiredFields: ["insurer", "policyNumber", "coveragePeriod", "coverageAmount", "insuredCompany", "contactInfo"],
    optionalFields: ["coverageType", "deductible", "specialConditions"],
    redFlagRules: ["generic-form", "missing-logo", "expired-period", "company-name-mismatch", "short-coverage-period"],
  },
  "transport-license": {
    id: "transport-license",
    labelDe: "EU-Transportlizenz",
    labelEn: "EU Transport License",
    required: false,
    confidenceWeight: 0.2,
    requiredFields: ["licenseNumber", "authority", "validityPeriod", "companyName", "companyAddress"],
    optionalFields: ["vehicleCount", "trafficManager"],
    redFlagRules: ["fresh-license", "wrong-authority", "address-mismatch"],
  },
  letterhead: {
    id: "letterhead",
    labelDe: "Briefkopf / Unternehmensdaten",
    labelEn: "Company Letterhead",
    required: false,
    confidenceWeight: 0.15,
    requiredFields: ["companyName", "legalForm", "address", "phone", "email", "bankDetails"],
    optionalFields: ["fax", "website", "registrationNumber", "vatId"],
    redFlagRules: ["iban-country-mismatch", "domain-name-mismatch", "multiple-name-variants", "edited-pdf"],
  },
  "freight-profile": {
    id: "freight-profile",
    labelDe: "Frachtenbörsen-Profil",
    labelEn: "Freight Exchange Profile",
    required: false,
    confidenceWeight: 0.15,
    requiredFields: ["memberSince", "address", "contact", "legalForm"],
    optionalFields: ["activityDescription", "references", "rating"],
    redFlagRules: ["very-new-member", "mobile-only", "freemail-domain", "coworking-address"],
  },
  communication: {
    id: "communication",
    labelDe: "Kommunikation / E-Mails",
    labelEn: "Communication / Emails",
    required: false,
    confidenceWeight: 0.1,
    requiredFields: ["senderEmail", "contactPerson"],
    optionalFields: ["emailDomain", "communicationChannel", "timestamps"],
    redFlagRules: ["freemail-address", "domain-mismatch", "unusual-hours", "changing-contacts", "spelling-patterns"],
  },
  "driver-vehicle": {
    id: "driver-vehicle",
    labelDe: "Fahrer- & Fahrzeugdaten",
    labelEn: "Driver & Vehicle Data",
    required: false,
    confidenceWeight: 0.15,
    requiredFields: ["driverName", "driverId", "licensePlate", "vehicleType"],
    optionalFields: ["vin", "driverLicense", "vehiclePhotos", "vehiclePapers"],
    redFlagRules: ["plate-country-mismatch", "document-manipulation", "vehicle-type-mismatch"],
  },
};

export function getDocumentType(id: string): DocumentTypeConfig | undefined {
  return DOCUMENT_TYPES[id];
}

export function getRequiredDocumentTypes(): DocumentTypeConfig[] {
  return Object.values(DOCUMENT_TYPES).filter((dt) => dt.required);
}

export function getAllDocumentTypes(): DocumentTypeConfig[] {
  return Object.values(DOCUMENT_TYPES);
}

export function getTotalConfidenceWeight(): number {
  return Object.values(DOCUMENT_TYPES).reduce((sum, dt) => sum + dt.confidenceWeight, 0);
}
