import { describe, expect, it, jest } from "@jest/globals";
import type { NextFunction, Request, Response } from "express";
import { requireAuth } from "./auth";

function invoke(apiKey: string | undefined, headers: Record<string, string>) {
  const req = { headers } as unknown as Request;
  const res = {
    status: jest.fn().mockReturnThis(),
    json: jest.fn().mockReturnThis(),
  } as unknown as Response;
  const next = jest.fn() as unknown as NextFunction;
  requireAuth(apiKey)(req, res, next);
  return { res, next };
}

describe("requireAuth", () => {
  it("passes through when API-key authentication is disabled", () => {
    const { next, res } = invoke(undefined, {});
    expect(next).toHaveBeenCalledTimes(1);
    expect(res.status).not.toHaveBeenCalled();
  });

  it("also treats an empty configured key as public mode", () => {
    const { next } = invoke("", {});
    expect(next).toHaveBeenCalledTimes(1);
  });

  it("rejects a missing token", () => {
    const { next, res } = invoke("correct-secret", {});
    expect(next).not.toHaveBeenCalled();
    expect(res.status).toHaveBeenCalledWith(401);
    expect(res.json).toHaveBeenCalledWith({ error: "authentication required" });
  });

  it("rejects malformed authorization and does not fall back to X-API-Key", () => {
    const { next, res } = invoke("correct-secret", {
      authorization: "Basic wrong",
      "x-api-key": "correct-secret",
    });
    expect(next).not.toHaveBeenCalled();
    expect(res.status).toHaveBeenCalledWith(401);
    expect(res.json).toHaveBeenCalledWith({ error: "authentication required" });
  });

  it("accepts a case-insensitive Bearer scheme", () => {
    const { next, res } = invoke("correct-secret", {
      authorization: "bEaReR correct-secret",
    });
    expect(next).toHaveBeenCalledTimes(1);
    expect(res.status).not.toHaveBeenCalled();
  });

  it("accepts the X-API-Key header when Authorization is absent", () => {
    const { next } = invoke("correct-secret", { "x-api-key": "correct-secret" });
    expect(next).toHaveBeenCalledTimes(1);
  });

  it("rejects a same-length incorrect token", () => {
    const { next, res } = invoke("correct-secret", {
      authorization: "Bearer incorrect-secret",
    });
    expect(next).not.toHaveBeenCalled();
    expect(res.status).toHaveBeenCalledWith(401);
    expect(res.json).toHaveBeenCalledWith({ error: "invalid API key" });
  });

  it("rejects a token with a different byte length", () => {
    const { next, res } = invoke("correct-secret", {
      "x-api-key": "short",
    });
    expect(next).not.toHaveBeenCalled();
    expect(res.status).toHaveBeenCalledWith(401);
    expect(res.json).toHaveBeenCalledWith({ error: "invalid API key" });
  });
});
