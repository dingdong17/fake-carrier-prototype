import { NextRequest } from "next/server";
import Anthropic from "@anthropic-ai/sdk";
import { db } from "@/lib/db";
import { checks, documents, chatMessages } from "@/lib/db/schema";
import { eq, asc } from "drizzle-orm";
import { SYSTEM_PROMPT } from "@/lib/analysis/prompts/system";
import { generateId } from "@/lib/utils";

const client = new Anthropic();

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

  // 1. Load check
  const check = db.select().from(checks).where(eq(checks.id, checkId)).get();
  if (!check) {
    return new Response(
      JSON.stringify({ error: "Check not found" }),
      { status: 404, headers: { "Content-Type": "application/json" } },
    );
  }

  // 2. Load documents
  const checkDocs = db
    .select()
    .from(documents)
    .where(eq(documents.checkId, checkId))
    .all();

  // 3. Load chat history
  const history = db
    .select()
    .from(chatMessages)
    .where(eq(chatMessages.checkId, checkId))
    .orderBy(asc(chatMessages.createdAt))
    .all();

  // 4. Save user message
  db.insert(chatMessages)
    .values({
      id: generateId(),
      checkId,
      role: "user",
      content: message,
    })
    .run();

  // 5. Build messages array
  const contextMessage = buildContextMessage(check, checkDocs);

  const messages: Anthropic.MessageParam[] = [];

  // First message: context + any history
  messages.push({
    role: "user",
    content: contextMessage,
  });
  messages.push({
    role: "assistant",
    content:
      "Verstanden. Ich habe die Prüfergebnisse und Dokumente geladen. Wie kann ich Ihnen helfen?",
  });

  // Add history
  for (const msg of history) {
    if (msg.role === "user" || msg.role === "assistant") {
      messages.push({ role: msg.role, content: msg.content });
    }
  }

  // Add the new user message
  messages.push({ role: "user", content: message });

  // 6. Call Claude with streaming
  const stream = new ReadableStream({
    async start(controller) {
      try {
        const response = await client.messages.create({
          model: "claude-sonnet-4-20250514",
          max_tokens: 4096,
          system: SYSTEM_PROMPT,
          messages,
          stream: true,
        });

        let fullText = "";

        for await (const event of response) {
          if (
            event.type === "content_block_delta" &&
            event.delta.type === "text_delta"
          ) {
            const chunk = event.delta.text;
            fullText += chunk;
            const payload = `data: ${JSON.stringify({ text: chunk })}\n\n`;
            controller.enqueue(encoder.encode(payload));
          }
        }

        // 8. Save assistant response
        db.insert(chatMessages)
          .values({
            id: generateId(),
            checkId,
            role: "assistant",
            content: fullText,
          })
          .run();

        // 9. Send done event
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
