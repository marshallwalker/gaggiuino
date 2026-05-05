export type ChartColorName =
  | 'temperature' | 'flow' | 'weight-flow' | 'pressure' | 'weight';

function readVar(name: string): string {
  if (typeof window === 'undefined') return '#000000';
  return getComputedStyle(document.documentElement).getPropertyValue(name).trim();
}

export function chartColor(name: ChartColorName): string {
  return readVar(`--chart-${name}`);
}

export function alphaHex(hex: string, a: number): string {
  const m = /^#?([0-9a-f]{6})$/i.exec(hex.trim());
  if (!m) return hex;
  const v = parseInt(m[1], 16);
  const r = (v >> 16) & 0xff;
  const g = (v >> 8) & 0xff;
  const b = v & 0xff;
  return `rgba(${r}, ${g}, ${b}, ${a})`;
}

export function hslVar(name: string, alpha = 1): string {
  return `hsl(${readVar(`--${name}`)} / ${alpha})`;
}
