import { config } from "../config";

export const UNAUTHORIZED_EVENT = "roadassist:unauthorized";

export type ApiEnvelope<T> = {
  statusCode: number;
  status: string;
  message?: string;
  data: T;
  errors?: unknown;
};

export type ApiFailure = {
  statusCode: number;
  message: string;
  errors?: unknown;
};

function notifyUnauthorized(): void {
  window.dispatchEvent(new CustomEvent(UNAUTHORIZED_EVENT));
}

async function call<T>(
  path: string,
  init: RequestInit,
  token?: string | null,
): Promise<T> {
  const headers: Record<string, string> = {
    "Content-Type": "application/json",
  };
  if (token) {
    headers.Authorization = `Bearer ${token}`;
  }
  const res = await fetch(`${config.apiBaseUrl}${path}`, {
    ...init,
    headers,
  });
  const body = (await res.json()) as Partial<ApiEnvelope<T>> &
    Partial<ApiFailure>;
  if (!res.ok) {
    if (res.status === 401 || body.statusCode === 401) {
      notifyUnauthorized();
    }
    throw {
      statusCode: body.statusCode ?? res.status,
      message: body.message ?? "Request failed",
      errors: body.errors,
    } satisfies ApiFailure;
  }
  return body.data as T;
}

export const api = {
  post: <T>(
    path: string,
    payload: unknown,
    token?: string | null,
  ): Promise<T> =>
    call<T>(path, { method: "POST", body: JSON.stringify(payload) }, token),
  put: <T>(path: string, payload: unknown, token?: string | null): Promise<T> =>
    call<T>(path, { method: "PUT", body: JSON.stringify(payload) }, token),
};

export function toMessage(e: unknown): string {
  if (
    e &&
    typeof e === "object" &&
    "message" in e &&
    typeof e.message === "string"
  ) {
    return e.message;
  }
  return "Request failed";
}
