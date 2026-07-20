export type EvolutionConnectionRequestKind = "start" | "refresh";

export function evolutionConnectionRequest(
  kind: EvolutionConnectionRequestKind,
): RequestInit {
  if (kind === "refresh") {
    return { method: "GET", cache: "no-store" };
  }

  return {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ consent: true }),
  };
}
