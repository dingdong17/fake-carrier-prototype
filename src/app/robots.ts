import type { MetadataRoute } from "next";

function baseUrl(): string {
  const env =
    process.env.NEXT_PUBLIC_BASE_URL ??
    (process.env.VERCEL_URL ? `https://${process.env.VERCEL_URL}` : null);
  return env ?? "https://fakecarrier.rorlach.de";
}

export default function robots(): MetadataRoute.Robots {
  return {
    rules: [
      {
        userAgent: "*",
        allow: ["/"],
        disallow: [
          "/admin",
          "/admin/",
          "/api/",
          "/broker",
          "/client",
          "/backlog",
          "/feedback",
          "/checks-catalog",
          "/login",
          "/auth/",
          "/webinar/confirm",
          "/demo/confirm",
        ],
      },
    ],
    sitemap: `${baseUrl()}/sitemap.xml`,
  };
}
