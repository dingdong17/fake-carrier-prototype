import React from "react";
import ReactPDF from "@react-pdf/renderer";
import { CarrierReport } from "./report";

const { renderToBuffer } = ReactPDF;

export async function generateReport(
  check: Parameters<typeof CarrierReport>[0]["check"],
  documents: Parameters<typeof CarrierReport>[0]["documents"]
): Promise<Buffer> {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const element = React.createElement(CarrierReport, { check, documents }) as any;
  const buffer = await renderToBuffer(element);
  return Buffer.from(buffer);
}
