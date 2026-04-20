import "next-auth";

declare module "next-auth" {
  interface Session {
    user: {
      id: string;
      email: string;
      name: string | null;
      role: "admin" | "broker" | "client";
      clientId: string | null;
      clientSlug: string | null;
    };
  }

  interface User {
    role: "admin" | "broker" | "client";
    clientId: string | null;
  }
}
