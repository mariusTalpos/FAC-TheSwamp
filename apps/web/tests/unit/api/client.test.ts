import { afterEach, describe, expect, it, vi } from "vitest";
import {
  ApiClientErrorException,
  apiGet,
  apiJson,
  apiPost,
  parseProblemMessage,
} from "@/lib/api/client";

describe("parseProblemMessage", () => {
  it("returns message from ProblemJson body", () => {
    expect(parseProblemMessage({ code: "x", message: "Bad input" }, "fallback")).toBe(
      "Bad input",
    );
  });

  it("returns fallback for non-object body", () => {
    expect(parseProblemMessage(null, "fallback")).toBe("fallback");
    expect(parseProblemMessage("oops", "fallback")).toBe("fallback");
  });

  it("returns fallback when message is not a string", () => {
    expect(parseProblemMessage({ code: "x", message: 1 }, "fallback")).toBe("fallback");
    expect(parseProblemMessage({ message: null }, "fallback")).toBe("fallback");
  });
});

describe("apiJson", () => {
  afterEach(() => {
    vi.unstubAllGlobals();
    vi.restoreAllMocks();
  });

  it("returns parsed JSON on success", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue({
        ok: true,
        status: 200,
        headers: { get: () => "application/json" },
        json: async () => ({ id: "1" }),
      }),
    );
    await expect(apiJson("/api/test")).resolves.toEqual({ id: "1" });
  });

  it("throws ApiClientErrorException with server message", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue({
        ok: false,
        status: 400,
        headers: { get: () => "application/json" },
        json: async () => ({ code: "validation_error", message: "Name required" }),
      }),
    );
    await expect(apiGet("/api/test")).rejects.toMatchObject({
      userMessage: "Name required",
      code: "validation_error",
      httpStatus: 400,
    });
  });

  it("uses status fallback when body has no message", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue({
        ok: false,
        status: 404,
        headers: { get: () => "application/json" },
        json: async () => ({ code: "not_found" }),
      }),
    );
    try {
      await apiGet("/api/missing");
    } catch (err) {
      expect(err).toBeInstanceOf(ApiClientErrorException);
      expect((err as ApiClientErrorException).userMessage).toBe(
        "The requested resource was not found.",
      );
    }
  });

  it("redirects to login on 401 in browser", async () => {
    const assign = vi.fn();
    vi.stubGlobal("window", { location: { assign } });
    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue({
        ok: false,
        status: 401,
        headers: { get: () => "application/json" },
        json: async () => ({ code: "unauthorized", message: "Sign in" }),
      }),
    );
    await expect(apiGet("/api/me")).rejects.toBeInstanceOf(ApiClientErrorException);
    expect(assign).toHaveBeenCalledWith("/login");
  });

  it("apiPost sends JSON content type", async () => {
    const fetchMock = vi.fn().mockResolvedValue({
      ok: true,
      status: 201,
      headers: { get: () => "application/json" },
      json: async () => ({ ok: true }),
    });
    vi.stubGlobal("fetch", fetchMock);
    await apiPost("/api/events", { name: "Test" });
    expect(fetchMock).toHaveBeenCalledWith(
      "/api/events",
      expect.objectContaining({
        method: "POST",
        credentials: "same-origin",
        body: JSON.stringify({ name: "Test" }),
      }),
    );
  });
});
