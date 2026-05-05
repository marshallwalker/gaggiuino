// REST client for scales calibration endpoints. Uses fetch directly to avoid
// pulling axios as a dep — these are only POST/GETs with small JSON bodies.

import { getApiBase, type ScalesData } from "@/lib/api";

async function postNoBody(path: string): Promise<void> {
  const res = await fetch(`${getApiBase()}${path}`, { method: "POST" });
  if (!res.ok) {
    const text = await res.text().catch(() => "");
    throw new Error(`POST ${path} failed: ${res.status} ${text}`);
  }
}

async function postJson<T = unknown>(path: string, body: T): Promise<void> {
  const res = await fetch(`${getApiBase()}${path}`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
  if (!res.ok) {
    const text = await res.text().catch(() => "");
    throw new Error(`POST ${path} failed: ${res.status} ${text}`);
  }
}

export async function tareScales(): Promise<void> {
  await postNoBody("/scales/tare");
}

export async function setScalesFactors(factor1: number, factor2: number): Promise<void> {
  await postJson("/scales/factors", { factor1, factor2 });
}

export async function fetchScalesState(): Promise<ScalesData> {
  const res = await fetch(`${getApiBase()}/scales/state`);
  if (!res.ok) {
    const text = await res.text().catch(() => "");
    throw new Error(`GET /scales/state failed: ${res.status} ${text}`);
  }
  return (await res.json()) as ScalesData;
}
