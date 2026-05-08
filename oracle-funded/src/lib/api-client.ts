// Typed fetch helper for the trader/admin UI. Wraps `fetch` so callers get
// JSON-typed responses + uniform error handling without sprinkling `await
// res.json()` calls everywhere. All routes return JSON, so a 4xx/5xx body
// is parsed for `error` field if present.
//
// Usage:
//   const configs = await api.get<ChallengeConfig[]>('/api/configs');
//   const session = await api.post<{ url: string }>('/api/checkout', { configId });

export class ApiError extends Error {
  constructor(
    public status: number,
    message: string,
    public body: unknown,
  ) {
    super(message);
    this.name = "ApiError";
  }
}

async function request<T>(
  path: string,
  init: RequestInit = {},
): Promise<T> {
  const res = await fetch(path, {
    ...init,
    headers: {
      "Content-Type": "application/json",
      ...(init.headers ?? {}),
    },
  });
  const text = await res.text();
  let body: unknown = null;
  try {
    body = text ? JSON.parse(text) : null;
  } catch {
    body = text;
  }
  if (!res.ok) {
    const err =
      body && typeof body === "object" && "error" in body && typeof body.error === "string"
        ? body.error
        : `Request failed: ${res.status} ${res.statusText}`;
    throw new ApiError(res.status, err, body);
  }
  return body as T;
}

export const api = {
  get: <T>(path: string): Promise<T> => request<T>(path, { method: "GET" }),
  post: <T>(path: string, body?: unknown): Promise<T> =>
    request<T>(path, { method: "POST", body: body ? JSON.stringify(body) : undefined }),
  patch: <T>(path: string, body?: unknown): Promise<T> =>
    request<T>(path, { method: "PATCH", body: body ? JSON.stringify(body) : undefined }),
};
