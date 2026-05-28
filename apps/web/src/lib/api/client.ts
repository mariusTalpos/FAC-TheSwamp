import type { ProblemJson } from "@/lib/api/problem-json";

export type ApiClientError = {
  httpStatus: number;
  code: string;
  userMessage: string;
  raw?: unknown;
};

export class ApiClientErrorException extends Error {
  readonly httpStatus: number;
  readonly code: string;
  readonly userMessage: string;
  readonly raw?: unknown;

  constructor(err: ApiClientError) {
    super(err.userMessage);
    this.name = "ApiClientError";
    this.httpStatus = err.httpStatus;
    this.code = err.code;
    this.userMessage = err.userMessage;
    this.raw = err.raw;
  }
}

function isProblemJson(body: unknown): body is ProblemJson {
  if (!body || typeof body !== "object") return false;
  const o = body as Record<string, unknown>;
  return typeof o.message === "string";
}

export function parseProblemMessage(body: unknown, fallback: string): string {
  if (isProblemJson(body)) return body.message;
  return fallback;
}

function defaultMessageForStatus(status: number): string {
  if (status === 401) return "Session expired—sign in again.";
  if (status === 403) return "You do not have permission to perform this action.";
  if (status === 404) return "The requested resource was not found.";
  if (status >= 500) return "Something went wrong. Please try again.";
  return "Request failed.";
}

function isBrowser(): boolean {
  return typeof window !== "undefined";
}

function handleUnauthorized(): void {
  if (isBrowser()) {
    window.location.assign("/login");
  }
}

function toApiClientError(res: Response, body: unknown): ApiClientError {
  const fallback = defaultMessageForStatus(res.status);
  const userMessage = parseProblemMessage(body, fallback);
  const code =
    body && typeof body === "object" && typeof (body as ProblemJson).code === "string"
      ? (body as ProblemJson).code
      : "unknown";
  return {
    httpStatus: res.status,
    code,
    userMessage,
    raw: body,
  };
}

export async function apiJson<T>(path: string, init?: RequestInit): Promise<T> {
  const res = await fetch(path, {
    ...init,
    credentials: "same-origin",
    headers: {
      Accept: "application/json",
      ...init?.headers,
    },
  });

  let body: unknown = null;
  const contentType = res.headers.get("content-type") ?? "";
  if (contentType.includes("application/json")) {
    body = await res.json().catch(() => null);
  } else if (!res.ok) {
    body = await res.json().catch(() => null);
  }

  if (!res.ok) {
    if (res.status === 401) {
      handleUnauthorized();
    }
    throw new ApiClientErrorException(toApiClientError(res, body));
  }

  return body as T;
}

export async function apiGet<T>(path: string, init?: RequestInit): Promise<T> {
  return apiJson<T>(path, { ...init, method: "GET" });
}

export async function apiDelete<T>(
  path: string,
  body?: unknown,
  init?: RequestInit,
): Promise<T> {
  const headers: HeadersInit = {
    ...(init?.headers ?? {}),
  };
  let requestBody: BodyInit | undefined;
  if (body !== undefined) {
    (headers as Record<string, string>)["Content-Type"] = "application/json";
    requestBody = JSON.stringify(body);
  }
  return apiJson<T>(path, {
    ...init,
    method: "DELETE",
    headers,
    body: requestBody,
  });
}

export async function apiPatch<T>(
  path: string,
  body?: unknown,
  init?: RequestInit,
): Promise<T> {
  const headers: HeadersInit = {
    ...(init?.headers ?? {}),
  };
  let requestBody: BodyInit | undefined;
  if (body !== undefined) {
    (headers as Record<string, string>)["Content-Type"] = "application/json";
    requestBody = JSON.stringify(body);
  }
  return apiJson<T>(path, {
    ...init,
    method: "PATCH",
    headers,
    body: requestBody,
  });
}

export async function apiPost<T>(
  path: string,
  body?: unknown,
  init?: RequestInit,
): Promise<T> {
  const headers: HeadersInit = {
    ...(init?.headers ?? {}),
  };
  let requestBody: BodyInit | undefined;
  if (body !== undefined) {
    (headers as Record<string, string>)["Content-Type"] = "application/json";
    requestBody = JSON.stringify(body);
  }
  return apiJson<T>(path, {
    ...init,
    method: "POST",
    headers,
    body: requestBody,
  });
}

export function apiErrorMessage(err: unknown, fallback: string): string {
  if (err instanceof ApiClientErrorException) return err.userMessage;
  if (err instanceof Error && err.message) return err.message;
  return fallback;
}
