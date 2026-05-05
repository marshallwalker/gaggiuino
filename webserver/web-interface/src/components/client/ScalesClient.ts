import axios from 'axios';

export interface ScalesState {
  present: boolean;
  raw1: number;
  raw2: number;
  weight: number;
  factor1: number;
  factor2: number;
}

export async function tareScales(): Promise<void> {
  await axios.post('/api/scales/tare');
}

export async function setScalesFactors(factor1: number, factor2: number): Promise<void> {
  await axios.post('/api/scales/factors', { factor1, factor2 });
}

export async function fetchScalesState(): Promise<ScalesState> {
  const { data } = await axios.get<ScalesState>('/api/scales/state');
  return data;
}
