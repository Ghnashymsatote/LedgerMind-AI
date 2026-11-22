import { afterEach, expect, test, vi } from "vitest";
import { createApiClient } from "../lib/api/api-client";
import { ApiError } from "../lib/api/api-error";

afterEach(() => vi.unstubAllGlobals());

test("sends same-origin requests and serializes JSON bodies", async () => {
  const fetchMock = vi.fn<typeof fetch>()
    .mockResolvedValueOnce(Response.json([{ id: "one" }]))
    .mockResolvedValueOnce(Response.json({ id: "one" }, { status: 201 }))
    .mockResolvedValueOnce(Response.json({ id: "one" }))
    .mockResolvedValueOnce(new Response(null, { status: 204 }));
  vi.stubGlobal("fetch", fetchMock);
  const client = createApiClient("/api/");

  await expect(client.request<{ id: string }[]>("/suppliers")).resolves.toEqual([{ id: "one" }]);
  const input = { name: "Supplier" };
  await client.request("/suppliers", { method: "POST", body: input });
  await client.request("/suppliers/one", { method: "PATCH", body: input });
  await expect(client.request<void>("/suppliers/one", { method: "DELETE" })).resolves.toBeUndefined();

  expect(fetchMock.mock.calls.map(([url, options]) => [url, options?.method])).toEqual([
    ["/api/suppliers", "GET"],
    ["/api/suppliers", "POST"],
    ["/api/suppliers/one", "PATCH"],
    ["/api/suppliers/one", "DELETE"],
  ]);
  for (const [, options] of fetchMock.mock.calls) {
    expect(options?.credentials).toBe("same-origin");
    expect(options?.cache).toBe("no-store");
  }
  expect(new Headers(fetchMock.mock.calls[1][1]?.headers).get("content-type")).toBe("application/json");
  expect(fetchMock.mock.calls[1][1]?.body).toBe(JSON.stringify(input));
});

test("passes FormData through and lets fetch assign its content type", async () => {
  const fetchMock = vi.fn<typeof fetch>().mockResolvedValue(Response.json({ id: "one" }, { status: 201 }));
  vi.stubGlobal("fetch", fetchMock);
  const body = new FormData();
  body.set("file", new Blob(["sample"], { type: "text/plain" }), "sample.txt");

  await createApiClient("/api").request("/example", { method: "POST", body });
  const [, options] = fetchMock.mock.calls[0];
  expect(options?.body).toBe(body);
  expect(new Headers(options?.headers).has("content-type")).toBe(false);
});

test("keeps HTTP status and server messages and handles non-JSON responses", async () => {
  const fetchMock = vi.fn<typeof fetch>()
    .mockResolvedValueOnce(Response.json({ error: "Sign in to continue." }, { status: 401 }))
    .mockResolvedValueOnce(new Response("<html>Bad gateway</html>", { status: 502 }))
    .mockResolvedValueOnce(new Response("Unexpected text", { status: 200 }));
  vi.stubGlobal("fetch", fetchMock);
  const client = createApiClient("/api");

  await expect(client.request("/auth/me")).rejects.toMatchObject({
    name: "ApiError", status: 401, message: "Sign in to continue.",
  });
  await expect(client.request("/auth/me")).rejects.toMatchObject({
    name: "ApiError", status: 502, message: "The request could not be completed.",
  });
  await expect(client.request("/auth/me")).rejects.toMatchObject({ name: "ApiError", status: 200 });
});

test("wraps network errors and preserves cancellation", async () => {
  const controller = new AbortController();
  controller.abort();
  const cancelled = new DOMException("cancelled", "AbortError");
  vi.stubGlobal("fetch", vi.fn<typeof fetch>()
    .mockRejectedValueOnce(new TypeError("network"))
    .mockRejectedValueOnce(cancelled));
  const client = createApiClient("/api");

  await expect(client.request("/auth/me")).rejects.toBeInstanceOf(ApiError);
  await expect(client.request("/auth/me", { signal: controller.signal })).rejects.toBe(cancelled);
});
