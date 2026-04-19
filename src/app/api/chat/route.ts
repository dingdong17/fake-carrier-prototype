import { NextRequest } from "next/server";
import { db } from "@/lib/db";
import { checks, documents, chatMessages } from "@/lib/db/schema";
import { eq, asc } from "drizzle-orm";
import { SYSTEM_PROMPT } from "@/lib/analysis/prompts/system";
import { generateId } from "@/lib/utils";
import { getAzureClient, CHAT_DEPLOYMENT } from "@/lib/azure-openai";
import type { ChatCompletionMessageParam } from "openai/resources/chat/completions";

export const maxDuration = 120;

function buildContextMessage(
  check: typeof checks.$inferSelect,
  docs: (typeof documents.$inferSelect)[],
): string {
  const lines: string[] = [];

  lines.push("=== KONTEXT: PRÜFERGEBNISSE ===");
  lines.push(`Frachtführer: ${check.carrierName}`);
  if (check.carrierCountry) lines.push(`Land: ${check.carrierCountry}`);
  if (check.carrierVatId) lines.push(`USt-IdNr: ${check.carrierVatId}`);
  lines.push(`Risiko-Score: ${check.riskScore ?? "Nicht berechnet"}`);
  lines.push(`Vertrauensniveau: ${check.confidenceLevel ?? "Nicht berechnet"}%`);
  lines.push(`Empfehlung: ${check.recommendation ?? "Ausstehend"}`);
  lines.push(`Status: ${check.status}`);
  lines.push("");

  if (docs.length > 0) {
    lines.push("=== ANALYSIERTE DOKUMENTE ===");
    for (const doc of docs) {
      lines.push(`--- ${doc.fileName} (${doc.documentType}) ---`);
      if (doc.extractedFields) {
        lines.push(`Extrahierte Felder: ${JSON.stringify(doc.extractedFields, null, 2)}`);
      }
      if (doc.riskSignals) {
        lines.push(`Risikosignale: ${JSON.stringify(doc.riskSignals, null, 2)}`);
      }
      if (doc.documentScore != null) {
        lines.push(`Dokumenten-Score: ${doc.documentScore}`);
      }
      if (doc.confidence != null) {
        lines.push(`Konfidenz: ${doc.confidence}`);
      }
      lines.push("");
    }
  }

  lines.push("=== ENDE KONTEXT ===");
  return lines.join("\n");
}

export async function POST(request: NextRequest) {
  const encoder = new TextEncoder();

  let body: { checkId?: string; message?: string };
  try {
    body = await request.json();
  } catch {
    return new Response(
      JSON.stringify({ error: "Invalid JSON body" }),
      { status: 400, headers: { "Content-Type": "application/json" } },
    );
  }

  const { checkId, message } = body;
  if (!checkId || !message) {
    return new Response(
      JSON.stringify({ error: "checkId and message are required" }),
      { status: 400, headers: { "Content-Type": "application/json" } },
    );
  }

  const check = await db.select().from(checks).where(eq(checks.id, checkId)).get();
  if (!check) {
    return new Response(
      JSON.stringify({ error: "Check not found" }),
      { status: 404, headers: { "Content-Type": "application/json" } },
    );
  }

  const checkDocs = await db
    .select()
    .from(documents)
    .where(eq(documents.checkId, checkId))
    .all();

  const history = await db
    .select()
    .from(chatMessages)
    .where(eq(chatMessages.checkId, checkId))
    .orderBy(asc(chatMessages.createdAt))
    .all();

  await db.insert(chatMessages)
    .values({
      id: generateId(),
      checkId,
      role: "user",
      content: message,
    })
    .run();

  const contextMessage = buildContextMessage(check, checkDocs);

  const messages: ChatCompletionMessageParam[] = [
    { role: "system", content: SYSTEM_PROMPT },
    { role: "user", content: contextMessage },
    {
      role: "assistant",
      content:
        "Verstanden. Ich habe die Prüfergebnisse und Dokumente geladen. Wie kann ich Ihnen helfen?",
    },
  ];

  for (const msg of history) {
    if (msg.role === "user" || msg.role === "assistant") {
      messages.push({ role: msg.role, content: msg.content });
    }
  }

  messages.push({ role: "user", content: message });

  const stream = new ReadableStream({
    async start(controller) {
      try {
        const response = await getAzureClient().chat.completions.create({
          model: CHAT_DEPLOYMENT,
          messages,
          max_completion_tokens: 4096,
          temperature: 0,
          stream: true,
        });

        let fullText = "";

        for await (const event of response) {
          // Azure emits a prompt-filter preflight event with empty choices;
          // the final usage event (when include_usage is set) also has empty choices.
          if (!event.choices || event.choices.length === 0) continue;
          const delta = event.choices[0].delta?.content;
          if (delta) {
            fullText += delta;
            const payload = `data: ${JSON.stringify({ text: delta })}\n\n`;
            controller.enqueue(encoder.encode(payload));
          }
        }

        await db.insert(chatMessages)
          .values({
            id: generateId(),
            checkId,
            role: "assistant",
            content: fullText,
          })
          .run();

        controller.enqueue(
          encoder.encode(`data: ${JSON.stringify({ done: true })}\n\n`),
        );
        controller.close();
      } catch (error) {
        const errorMessage =
          error instanceof Error ? error.message : "Unknown error";
        controller.enqueue(
          encoder.encode(
            `data: ${JSON.stringify({ error: errorMessage })}\n\n`,
          ),
        );
        controller.close();
      }
    },
  });

  return new Response(stream, {
    headers: {
      "Content-Type": "text/event-stream",
      "Cache-Control": "no-cache",
      Connection: "keep-alive",
    },
  });
}
