import { describe, it, expect } from "vitest";
import {
  getClassifyingMessage,
  getIdentifiedMessage,
  getExtractingMessages,
  getExtractedMessage,
} from "./terminal-messages";

const KNOWN_TYPES = [
  "insurance-cert",
  "transport-license",
  "letterhead",
  "freight-profile",
  "communication",
  "driver-vehicle",
  "unknown",
];

describe("terminal messages", () => {
  describe("getClassifyingMessage", () => {
    it("returns a string for each known type", () => {
      for (const type of KNOWN_TYPES) {
        const msg = getClassifyingMessage(type);
        expect(typeof msg).toBe("string");
        expect(msg.length).toBeGreaterThan(0);
      }
    });

    it("returns a fallback for undefined type", () => {
      const msg = getClassifyingMessage(undefined);
      expect(typeof msg).toBe("string");
      expect(msg.length).toBeGreaterThan(0);
    });
  });

  describe("getIdentifiedMessage", () => {
    it("returns document-type-specific identification for insurance-cert", () => {
      const msg = getIdentifiedMessage("insurance-cert");
      expect(msg).toContain("Versicherung");
    });

    it("returns document-type-specific identification for transport-license", () => {
      const msg = getIdentifiedMessage("transport-license");
      expect(msg).toContain("Transportlizenz");
    });

    it("returns document-type-specific identification for driver-vehicle", () => {
      const msg = getIdentifiedMessage("driver-vehicle");
      expect(msg).toContain("Fahrer");
    });

    it("returns fallback for unknown type", () => {
      const msg = getIdentifiedMessage("unknown");
      expect(msg).toContain("nicht");
    });
  });

  describe("getExtractingMessages", () => {
    it("returns multiple messages per type", () => {
      for (const type of KNOWN_TYPES) {
        const msgs = getExtractingMessages(type);
        expect(msgs.length).toBeGreaterThan(0);
        msgs.forEach((m) => expect(typeof m).toBe("string"));
      }
    });

    it("insurance-cert has messages about Policennummer and Versicherungsnehmer", () => {
      const msgs = getExtractingMessages("insurance-cert");
      const joined = msgs.join(" ");
      expect(joined).toContain("Versicherungsnehmer");
    });

    it("transport-license has messages about Lizenznummer", () => {
      const msgs = getExtractingMessages("transport-license");
      const joined = msgs.join(" ");
      expect(joined).toContain("Lizenznummer");
    });
  });

  describe("getExtractedMessage", () => {
    it("returns a completion message for each type", () => {
      for (const type of KNOWN_TYPES) {
        const msg = getExtractedMessage(type);
        expect(typeof msg).toBe("string");
        expect(msg).toContain("extrahiert");
      }
    });
  });
});
