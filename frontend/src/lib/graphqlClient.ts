import { authHeaders } from "./authStore";

const API_BASE = import.meta.env.VITE_API_BASE ?? "";

export async function gql<T = unknown>(
  query: string,
  variables?: Record<string, unknown>,
): Promise<T> {
  const res = await fetch(`${API_BASE}/graphql`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      ...authHeaders(),
    },
    body: JSON.stringify({ query, variables }),
  });

  const json = await res.json();

  if (json.errors) {
    const msg = json.errors[0]?.message ?? "GraphQL error";
    throw new Error(msg);
  }

  return json.data as T;
}
