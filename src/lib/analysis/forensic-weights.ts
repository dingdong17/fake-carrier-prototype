export const FORENSIC_WEIGHTS = {
  image: {
    editingSoftwareFingerprint: { severity: "major" as const, points: 30 },
    noMetadata: { severity: "minor" as const, points: 15 },
    dateInconsistency: { severity: "minor" as const, points: 10 },
  },
  pdf: {
    onlineEditorFingerprint: { severity: "major" as const, points: 30 },
    incrementalUpdates: { severity: "major" as const, points: 25 },
    embeddedJavascript: { severity: "critical" as const, points: 45 },
    noMetadata: { severity: "minor" as const, points: 15 },
    dateInconsistency: { severity: "minor" as const, points: 10 },
  },
};
