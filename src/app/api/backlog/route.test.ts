import { describe, it, expect, beforeEach, vi, type Mock } from "vitest";

vi.mock("next/server", async (importOriginal) => {
  const actual = await importOriginal<typeof import("next/server")>();
  return actual;
});

type Chain = {
  select: Mock; from: Mock; where: Mock; get: Mock; all: Mock;
  insert: Mock; values: Mock; run: Mock;
  update: Mock; set: Mock;
  delete: Mock;
};

const { chain, authMock } = vi.hoisted(() => {
  const c = {} as Chain;
  const self = () => c;
  c.select = vi.fn(self);
  c.from = vi.fn(self);
  c.where = vi.fn(self);
  c.get = vi.fn();
  c.all = vi.fn();
  c.insert = vi.fn(self);
  c.values = vi.fn(self);
  c.run = vi.fn();
  c.update = vi.fn(self);
  c.set = vi.fn(self);
  c.delete = vi.fn(self);
  return { chain: c, authMock: vi.fn() };
});

vi.mock("@/lib/db", () => ({
  db: chain,
}));

vi.mock("@/lib/db/schema", () => ({
  backlogItems: { id: "id", itemNumber: "itemNumber" } as unknown,
}));

vi.mock("@/lib/auth/config", () => ({
  auth: () => authMock(),
}));

vi.mock("@/lib/utils", () => ({
  generateId: () => "generated-id",
  formatBacklogNumber: (n: number) => `BL-${String(n).padStart(3, "0")}`,
}));

import { POST } from "./route";

function mkReq(body: unknown) {
  return new Request("http://test/api/backlog", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  }) as unknown as Parameters<typeof POST>[0];
}

beforeEach(() => {
  vi.clearAllMocks();
  authMock.mockResolvedValue({ user: { role: "admin" } });
  chain.get.mockResolvedValue({ maxNum: "BL-005" });
  chain.run.mockResolvedValue({ rowsAffected: 1 });
});

describe("POST /api/backlog — auth gate", () => {
  it("returns 403 when session is missing", async () => {
    authMock.mockResolvedValueOnce(null);
    const res = await POST(mkReq({ action: "create", title: "x" }));
    expect(res.status).toBe(403);
  });

  it("returns 403 when role is not admin", async () => {
    authMock.mockResolvedValueOnce({ user: { role: "broker" } });
    const res = await POST(mkReq({ action: "create", title: "x" }));
    expect(res.status).toBe(403);
  });
});

describe("POST /api/backlog — create", () => {
  it("accepts and persists an optional category", async () => {
    const res = await POST(
      mkReq({ action: "create", title: "Test", category: "security_rbac" })
    );
    expect(res.status).toBe(200);
    expect(chain.insert).toHaveBeenCalled();
    const inserted = chain.values.mock.calls[0][0];
    expect(inserted.category).toBe("security_rbac");
  });

  it("sets category to null when omitted", async () => {
    const res = await POST(mkReq({ action: "create", title: "Test" }));
    expect(res.status).toBe(200);
    const inserted = chain.values.mock.calls[0][0];
    expect(inserted.category).toBeNull();
  });

  it("rejects an invalid category value with 400", async () => {
    const res = await POST(
      mkReq({ action: "create", title: "Test", category: "not_a_real_cat" })
    );
    expect(res.status).toBe(400);
  });
});

describe("POST /api/backlog — update", () => {
  it("updates category to a valid value", async () => {
    const res = await POST(
      mkReq({ action: "update", id: "abc", category: "ui" })
    );
    expect(res.status).toBe(200);
    const setArg = chain.set.mock.calls[0][0];
    expect(setArg.category).toBe("ui");
  });

  it("accepts explicit null to clear category", async () => {
    const res = await POST(mkReq({ action: "update", id: "abc", category: null }));
    expect(res.status).toBe(200);
    const setArg = chain.set.mock.calls[0][0];
    expect(setArg.category).toBeNull();
  });

  it("rejects an invalid category value with 400", async () => {
    const res = await POST(mkReq({ action: "update", id: "abc", category: "bad" }));
    expect(res.status).toBe(400);
  });
});

describe("POST /api/backlog — delete", () => {
  it("deletes by id and returns 200", async () => {
    const res = await POST(mkReq({ action: "delete", id: "abc" }));
    expect(res.status).toBe(200);
    expect(chain.delete).toHaveBeenCalled();
  });

  it("returns 400 when id is missing", async () => {
    const res = await POST(mkReq({ action: "delete" }));
    expect(res.status).toBe(400);
  });
});
