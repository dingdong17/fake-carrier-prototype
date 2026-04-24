export interface BrandConfig {
  id: string;
  name: string;
  logo: string;
  logoWhite: string;
  favicon: string;
  colors: {
    primary: string;
    primaryHover: string;
    accent: string;
    accentHover: string;
    text: string;
    textMuted: string;
    border: string;
    borderLight: string;
    background: string;
    surface: string;
    error: string;
    warning: string;
    info: string;
    success: string;
    red: string;
    yellow: string;
  };
  fontHeading: string;
  fontBody: string;
  borderRadius: string;
}

export const BRANDS: Record<string, BrandConfig> = {
  ecclesia: {
    id: "ecclesia",
    name: "Ecclesia Gruppe",
    logo: "/ecclesia-logo.svg",
    logoWhite: "/ecclesia-logo-white.png",
    favicon: "/ecclesia-logo.svg",
    colors: {
      primary: "#2649A5",
      primaryHover: "#0050D2",
      accent: "#75E7BC",
      accentHover: "#7BCA65",
      text: "#3B3B3B",
      textMuted: "#979797",
      border: "#E2E2E2",
      borderLight: "#EEEEEE",
      background: "#F7F7F7",
      surface: "#FFFFFF",
      error: "#E02E2A",
      warning: "#EF6C00",
      info: "#0088D1",
      success: "#2F7D31",
      red: "#F75880",
      yellow: "#FFCF31",
    },
    fontHeading: "'Barlow', sans-serif",
    fontBody: "'Inter', sans-serif",
    borderRadius: "0.75rem",
  },
  schunck: {
    id: "schunck",
    name: "SCHUNCK Group",
    logo: "/schunck-logo.png",
    logoWhite: "/schunck-logo.png",
    favicon: "/schunck-logo.png",
    colors: {
      primary: "#005E47",
      primaryHover: "#004a38",
      accent: "#7BCA65",
      accentHover: "#75E7BC",
      text: "#313131",
      textMuted: "#9B9B9B",
      border: "#E0E0E0",
      borderLight: "#EEEEEE",
      background: "#F5F5F5",
      surface: "#FFFFFF",
      error: "#BF1722",
      warning: "#FCB900",
      info: "#0088D1",
      success: "#005E47",
      red: "#BF1722",
      yellow: "#FCB900",
    },
    fontHeading: "-apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif",
    fontBody: "-apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif",
    borderRadius: "0.5rem",
  },
};

export function getBrand(id: string): BrandConfig {
  return BRANDS[id] || BRANDS.ecclesia;
}

export const DEFAULT_BRAND = "schunck";
