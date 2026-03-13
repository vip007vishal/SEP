const API_BASE_URL = (import.meta.env.VITE_API_BASE_URL || "http://localhost:5000/api").replace(/\/$/, "");

type RequestOptions = { method?: string; body?: unknown };

export async function apiRequest<T>(path: string, options: RequestOptions = {}): Promise<T> {
  const response = await fetch(`${API_BASE_URL}${path}`, {
    method: options.method ?? "GET",
    headers: { "Content-Type": "application/json" },
    body: options.body !== undefined ? JSON.stringify(options.body) : undefined,
  });

  const contentType = response.headers.get("content-type") || "";
  const payload = contentType.includes("application/json") ? await response.json() : await response.text();

  if (!response.ok) {
    const message = typeof payload === "string" ? payload : (payload?.error || payload?.message || "Request failed");
    throw new Error(message);
  }

  return payload as T;
}

export async function apiRpc<T>(method: string, ...args: unknown[]): Promise<T> {
  return apiRequest<T>("/rpc", { method: "POST", body: { method, args } });
}
