import { azureDocumentProvider } from "./providers/azure-document";
import { buildCrossCheckPrompt } from "./prompts/cross-check";
import { SYSTEM_PROMPT } from "./prompts/system";
import { applyForensicAnalysis } from "./forensic";
import { getAzureClient, ANALYSIS_DEPLOYMENT } from "@/lib/azure-openai";
import { getStorage } from "@/lib/storage";
import type { ProviderResult, CrossCheckResult } from "./providers/types";

function parseJsonResponse(text: string): Record<string, unknown> {
  const match = text.match(/{[\s\S]*}/);
  if (!match) {
    throw new Error("No JSON object found in response");
  }
  return JSON.parse(match[0]) as Record<string, unknown>;
}

export async function analyzeDocumentWithForensics(
  filePath: string,
  documentType: string,
  mimeType: string,
  carrierInfo: { name: string; country?: string; vatId?: string }
): Promise<ProviderResult> {
  const result = await azureDocumentProvider.analyze(
    filePath,
    documentType,
    mimeType,
    carrierInfo
  );
  try {
    const buffer = await getStorage().get(filePath);
    return await applyForensicAnalysis(result, buffer, mimeType);
  } catch {
    return result;
  }
}

export async function runCrossCheck(
  documentResults: ProviderResult[]
): Promise<CrossCheckResult> {
  if (documentResults.length < 2) {
    return { consistencyScore: 1.0, mismatches: [], patterns: [] };
  }

  const extractedData = documentResults.map((r) => ({
    documentType: r.documentType,
    fields: r.extraction.fields,
  }));

  const prompt = buildCrossCheckPrompt(extractedData);

  const response = await getAzureClient().chat.completions.create({
    model: ANALYSIS_DEPLOYMENT,
    messages: [
      { role: "system", content: SYSTEM_PROMPT },
      { role: "user", content: prompt },
    ],
    max_completion_tokens: 4096,
    temperature: 0,
  });

  const text = response.choices[0]?.message?.content;
  if (!text) {
    throw new Error("No text response from cross-check");
  }

  const parsed = parseJsonResponse(text);

  return {
    consistencyScore: (parsed.consistencyScore as number) || 0,
    mismatches:
      ((parsed.mismatches as CrossCheckResult["mismatches"]) || []).map(
        (m) => ({
          field: m.field || "",
          documents: m.documents || [],
          values: m.values || [],
          severity: m.severity || "minor",
          description: m.description || "",
        })
      ),
    patterns: (parsed.patterns as string[]) || [],
  };
}
