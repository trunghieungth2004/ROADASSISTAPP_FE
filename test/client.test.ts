import { afterEach, describe, expect, it, vi } from "vitest";
import {
  api,
  setTokenRefresher,
  UNAUTHORIZED_EVENT,
} from "../src/api/client";

function jsonResponse(body: unknown, status = 200): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { "Content-Type": "application/json" },
  });
}

describe("api client", () => {
  afterEach(() => {
    vi.restoreAllMocks();
    setTokenRefresher(null);
  });

  it("unwraps the envelope and sends the bearer token", async () => {
    const fetchMock = vi
      .spyOn(globalThis, "fetch")
      .mockResolvedValue(jsonResponse({ statusCode: 200, status: "OK", data: { id: "1" } }));
    const result = await api.post<{ id: string }>("/x", { a: 1 }, "tok");
    expect(result).toEqual({ id: "1" });
    const init = fetchMock.mock.calls[0][1] as RequestInit;
    expect(init.headers).toMatchObject({
      "Content-Type": "application/json",
      Authorization: "Bearer tok",
    });
  });

  it("refreshes once on 401 and retries", async () => {
    const fetchMock = vi
      .spyOn(globalThis, "fetch")
      .mockResolvedValueOnce(jsonResponse({ statusCode: 401, message: "no" }, 401))
      .mockResolvedValueOnce(jsonResponse({ statusCode: 200, status: "OK", data: "ok" }));
    let refreshes = 0;
    setTokenRefresher(async () => {
      refreshes += 1;
      return "fresh";
    });
    await expect(api.post("/x", {}, "old")).resolves.toBe("ok");
    expect(refreshes).toBe(1);
    const retry = fetchMock.mock.calls[1][1] as RequestInit;
    expect(retry.headers).toMatchObject({ Authorization: "Bearer fresh" });
  });

  it("fires the unauthorized event when the retry still fails", async () => {
    vi.spyOn(globalThis, "fetch").mockResolvedValue(
      jsonResponse({ statusCode: 401, message: "no" }, 401),
    );
    setTokenRefresher(async () => null);
    const spy = vi.fn();
    window.addEventListener(UNAUTHORIZED_EVENT, spy);
    await expect(api.post("/x", {}, "tok")).rejects.toMatchObject({ statusCode: 401 });
    expect(spy).toHaveBeenCalledTimes(1);
    window.removeEventListener(UNAUTHORIZED_EVENT, spy);
  });

  it("surfaces the backend message", async () => {
    vi.spyOn(globalThis, "fetch").mockResolvedValue(
      jsonResponse({ statusCode: 400, message: "Bad input" }, 400),
    );
    await expect(api.post("/x", {}, null)).rejects.toMatchObject({ message: "Bad input" });
  });
});
