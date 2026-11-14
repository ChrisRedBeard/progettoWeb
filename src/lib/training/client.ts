export async function postJson(url: string, body?: unknown) {
  try {
    const response = await fetch(url, {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: body === undefined ? "{}" : JSON.stringify(body),
      keepalive: true,
    });
    return response.ok;
  } catch {
    return false;
  }
}

export async function createWorkoutSession(body: unknown) {
  try {
    const response = await fetch("/api/sessions", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify(body),
    });
    if (!response.ok) return null;
    const payload: unknown = await response.json();
    if (!payload || typeof payload !== "object" || !("id" in payload) || typeof payload.id !== "string") return null;
    return payload.id;
  } catch {
    return null;
  }
}
