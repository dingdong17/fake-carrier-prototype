import { AzureOpenAI } from "openai";

let _client: AzureOpenAI | null = null;

export function getAzureClient(): AzureOpenAI {
  if (_client) return _client;
  const endpoint = process.env.AZURE_OPENAI_ENDPOINT;
  const apiKey = process.env.AZURE_OPENAI_API_KEY;
  const apiVersion = process.env.AZURE_OPENAI_API_VERSION || "2024-10-21";
  if (!endpoint || !apiKey) {
    throw new Error(
      "Azure OpenAI not configured: set AZURE_OPENAI_ENDPOINT and AZURE_OPENAI_API_KEY"
    );
  }
  _client = new AzureOpenAI({ endpoint, apiKey, apiVersion });
  return _client;
}

export const CHAT_DEPLOYMENT =
  process.env.AZURE_OPENAI_DEPLOYMENT_CHAT || "gpt-5.2";

export const ANALYSIS_DEPLOYMENT =
  process.env.AZURE_OPENAI_DEPLOYMENT_ANALYSIS || "gpt-5.2";
