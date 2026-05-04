import axios from 'axios';
import type { ProfileSummary } from '../../models/api';

export async function getProfiles(): Promise<ProfileSummary[]> {
  return axios.get<ProfileSummary[]>('/api/profiles').then(({ data }) => data);
}

export async function setActiveProfile(index: number): Promise<void> {
  await axios.put('/api/profiles/active', { index });
}
