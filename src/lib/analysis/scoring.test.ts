import { describe, it, expect } from "vitest";
import {
  calculateRiskScore,
  calculateConfidenceLevel,
  determineRecommendation,
  getRiskLevel,
  generateGuidance,
} from "./scoring";
import type { ProviderResult, CrossCheckResult } from "./providers/types";

function makeResult(
  documentType: string,
  confidence: number,
  riskSignals: Array<{ severity: "critical" | "major" | "minor"; points: number }>
): ProviderResult {
  return {
    providerId: "test",
    documentType,
    extraction: {
      fields: { testField: "value" },
      confidence,
      riskSignals: riskSignals.map((s, i) => ({
        severity: s.severity,
        rule: `test-rule-${i}`,
        description: "Test signal",
        points: s.points,
      })),
      missingFields: [],
    },
  };
}

const NO_MISMATCHES: CrossCheckResult = {
  consistencyScore: 1,
  mismatches: [],
  patterns: [],
};

describe("calculateRiskScore", () => {
  it("returns 0 when no risk signals", () => {
    const results = [makeResult("insurance-cert", 0.9, [])];
    expect(calculateRiskScore(results, NO_MISMATCHES)).toBe(0);
  });

  it("sums risk signal points", () => {
    const results = [
      makeResult("insurance-cert", 0.9, [
        { severity: "minor", points: 8 },
        { severity: "major", points: 20 },
      ]),
    ];
    expect(calculateRiskScore(results, NO_MISMATCHES)).toBe(28);
  });

  it("sums across multiple documents", () => {
    const results = [
      makeResult("insurance-cert", 0.9, [{ severity: "minor", points: 10 }]),
      makeResult("letterhead", 0.8, [{ severity: "major", points: 15 }]),
    ];
    expect(calculateRiskScore(results, NO_MISMATCHES)).toBe(25);
  });

  it("adds points for cross-check mismatches", () => {
    const results = [makeResult("insurance-cert", 0.9, [])];
    const crossCheck: CrossCheckResult = {
      consistencyScore: 0.5,
      mismatches: [
        { field: "address", documents: ["a", "b"], values: ["x", "y"], severity: "critical", description: "mismatch" },
      ],
      patterns: [],
    };
    // critical: avg of 30-50 = 40
    expect(calculateRiskScore(results, crossCheck)).toBe(40);
  });

  it("caps at 100", () => {
    const results = [
      makeResult("insurance-cert", 0.9, [
        { severity: "critical", points: 50 },
        { severity: "critical", points: 50 },
        { severity: "critical", points: 50 },
      ]),
    ];
    expect(calculateRiskScore(results, NO_MISMATCHES)).toBe(100);
  });
});

describe("calculateConfidenceLevel", () => {
  it("returns 0 with no documents", () => {
    expect(calculateConfidenceLevel([])).toBe(0);
  });

  it("returns weighted confidence for insurance cert only", () => {
    // insurance-cert has weight 0.25 out of total 1.0
    // confidence 0.9 → 0.25/1.0 * 0.9 * 100 = 22.5 → 23
    const results = [makeResult("insurance-cert", 0.9, [])];
    const confidence = calculateConfidenceLevel(results);
    expect(confidence).toBeGreaterThan(0);
    expect(confidence).toBeLessThanOrEqual(25); // max for one doc type
  });

  it("increases with more document types", () => {
    const oneDoc = [makeResult("insurance-cert", 0.9, [])];
    const twoDocs = [
      makeResult("insurance-cert", 0.9, []),
      makeResult("transport-license", 0.9, []),
    ];
    expect(calculateConfidenceLevel(twoDocs)).toBeGreaterThan(
      calculateConfidenceLevel(oneDoc)
    );
  });

  it("reaches near 100% with all doc types at full confidence", () => {
    const allDocs = [
      makeResult("insurance-cert", 1.0, []),
      makeResult("transport-license", 1.0, []),
      makeResult("letterhead", 1.0, []),
      makeResult("freight-profile", 1.0, []),
      makeResult("communication", 1.0, []),
      makeResult("driver-vehicle", 1.0, []),
    ];
    expect(calculateConfidenceLevel(allDocs)).toBe(100);
  });

  it("ignores unknown document types", () => {
    const results = [makeResult("unknown-type", 1.0, [])];
    expect(calculateConfidenceLevel(results)).toBe(0);
  });
});

describe("determineRecommendation", () => {
  it("approves low risk + high confidence", () => {
    expect(determineRecommendation(10, 80)).toBe("approve");
  });

  it("rejects high risk + high confidence", () => {
    expect(determineRecommendation(70, 60)).toBe("reject");
  });

  it("warns on high risk + low confidence", () => {
    expect(determineRecommendation(70, 30)).toBe("warning");
  });

  it("reviews medium risk", () => {
    expect(determineRecommendation(40, 50)).toBe("review");
  });

  it("reviews low risk + low confidence", () => {
    expect(determineRecommendation(15, 40)).toBe("review");
  });

  it("reviews at boundary (25 risk, 59 confidence)", () => {
    expect(determineRecommendation(25, 59)).toBe("review");
  });

  it("approves at boundary (25 risk, 60 confidence)", () => {
    expect(determineRecommendation(25, 60)).toBe("approve");
  });

  it("rejects at boundary (56 risk, 40 confidence)", () => {
    expect(determineRecommendation(56, 40)).toBe("reject");
  });
});

describe("getRiskLevel", () => {
  it("returns low for 0-25", () => {
    expect(getRiskLevel(0)).toBe("low");
    expect(getRiskLevel(25)).toBe("low");
  });

  it("returns medium for 26-55", () => {
    expect(getRiskLevel(26)).toBe("medium");
    expect(getRiskLevel(55)).toBe("medium");
  });

  it("returns high for 56+", () => {
    expect(getRiskLevel(56)).toBe("high");
    expect(getRiskLevel(100)).toBe("high");
  });
});

describe("generateGuidance", () => {
  it("includes ai_verified items for analyzed documents", () => {
    const results = [makeResult("insurance-cert", 0.9, [])];
    const guidance = generateGuidance(results, NO_MISMATCHES);
    const aiVerified = guidance.filter((g) => g.tier === "ai_verified");
    expect(aiVerified.length).toBeGreaterThan(0);
  });

  it("always includes human_required items", () => {
    const guidance = generateGuidance([], NO_MISMATCHES);
    const humanRequired = guidance.filter((g) => g.tier === "human_required");
    expect(humanRequired.length).toBeGreaterThan(0);
  });

  it("always includes outside_scope items", () => {
    const guidance = generateGuidance([], NO_MISMATCHES);
    const outsideScope = guidance.filter((g) => g.tier === "outside_scope");
    expect(outsideScope.length).toBeGreaterThan(0);
  });

  it("adds cross-check passed message when no mismatches and multiple docs", () => {
    const results = [
      makeResult("insurance-cert", 0.9, []),
      makeResult("letterhead", 0.8, []),
    ];
    const guidance = generateGuidance(results, NO_MISMATCHES);
    const crossCheckPassed = guidance.find((g) =>
      g.description.includes("Konsistenzprüfung")
    );
    expect(crossCheckPassed).toBeDefined();
  });
});
