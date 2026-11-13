import { config } from "../config";

export const UNAUTHORIZED_EVENT = "roadassist:unauthorized";

const USER_INACTIVE_MESSAGE = "User is inactive";

let tokenRefresher: (() => Promise<string | null>) | null = null;

export function setTokenRefresher(
  fn: (() => Promise<string | null>) | null,
): void {
  tokenRefresher = fn;
}

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

function networkFailure(): ApiFailure {
  return {
    statusCode: 0,
    message:
      "Can't reach the RoadAssist API. Check your connection or the dev proxy.",
  };
}

function failedResponse(res: Response, body: Partial<ApiFailure>): ApiFailure {
  if (res.status === 502) {
    return {
      statusCode: 502,
      message: "The dev proxy could not reach the API.",
    };
  }
  return {
    statusCode: body.statusCode ?? res.status,
    message: body.message ?? `Request failed (HTTP ${res.status}).`,
    errors: body.errors,
  };
}

async function call<T>(
  path: string,
  init: RequestInit,
  token?: string | null,
): Promise<T> {
  let res: Response;
  try {
    res = await send(path, init, token);
    if (res.status === 401 && tokenRefresher) {
      const fresh = await tokenRefresher().catch(() => null);
      if (fresh) {
        res = await send(path, init, fresh);
      }
    }
  } catch {
    throw networkFailure();
  }

  let raw = "";
  try {
    raw = await res.text();
  } catch {
    throw networkFailure();
  }

  let body: Partial<ApiEnvelope<T>> & Partial<ApiFailure> = {};
  if (raw.trim() !== "") {
    try {
      body = JSON.parse(raw) as Partial<ApiEnvelope<T>> & Partial<ApiFailure>;
    } catch {
      throw {
        statusCode: res.status,
        message:
          res.status === 502
            ? "The dev proxy could not reach the API."
            : res.ok
              ? "The server returned an invalid response."
              : `Request failed (HTTP ${res.status}).`,
      } satisfies ApiFailure;
    }
  }

  if (!res.ok) {
    if (
      res.status === 401 ||
      body.statusCode === 401 ||
      (body.statusCode === 403 && body.message === USER_INACTIVE_MESSAGE)
    ) {
      notifyUnauthorized();
    }
    throw failedResponse(res, body);
  }
  return body.data as T;
}

function send(
  path: string,
  init: RequestInit,
  token?: string | null,
): Promise<Response> {
  const headers: Record<string, string> = {
    "Content-Type": "application/json",
  };
  if (token) {
    headers.Authorization = `Bearer ${token}`;
  }
  return fetch(`${config.apiBaseUrl}${path}`, {
    ...init,
    headers,
  });
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
