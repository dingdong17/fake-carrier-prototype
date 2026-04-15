export interface RiskSignal {
  severity: "critical" | "major" | "minor";
  rule: string;
  description: string;
  field?: string;
  points: number;
}

export interface ExtractionResult {
  fields: Record<string, unknown>;
  confidence: number;
  riskSignals: RiskSignal[];
  missingFields: string[];
}

export interface ProviderResult {
  providerId: string;
  documentType: string;
  extraction: ExtractionResult;
  rawResponse?: string;
}

export interface CrossCheckResult {
  consistencyScore: number;
  mismatches: Array<{
    field: string;
    documents: string[];
    values: string[];
    severity: "critical" | "major" | "minor";
    description: string;
  }>;
  patterns: string[];
}

export interface AnalysisProvider {
  id: string;
  name: string;
  analyze(
    documentPath: string,
    documentType: string,
    mimeType: string,
    carrierInfo: { name: string; country?: string; vatId?: string }
  ): Promise<ProviderResult>;
}

export interface GuidanceItem {
  tier: "ai_verified" | "human_required" | "outside_scope";
  labelDe: string;
  description: string;
  action?: string;
}

export interface AnalysisOutput {
  checkId: string;
  documentResults: ProviderResult[];
  crossCheck: CrossCheckResult;
  riskScore: number;
  confidenceLevel: number;
  recommendation: "approve" | "review" | "warning" | "reject";
  explanation: string;
  nextSteps: string[];
  guidance: GuidanceItem[];
}
