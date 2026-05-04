import axios from 'axios';

export interface WifiStatus {
  status: 'connected' | 'disconnected';
  ssid: string;
  ip: string;
}

export interface WifiNetwork {
  ssid: string;
  rssi: number;
  secured: boolean;
}

export interface WifiCredentials {
  ssid: string;
  pass: string;
}

export async function getWifiStatus(): Promise<WifiStatus> {
  return axios.get<WifiStatus>('/api/wifi/status').then(({ data }) => data);
}

export async function getAvailableNetworks(): Promise<WifiNetwork[]> {
  return axios.get<WifiNetwork[]>('/api/wifi/networks').then(({ data }) => {
    const networks = data.filter((network) => network.ssid !== null && network.ssid.length > 0);
    const networksUniqueByKey = [...new Map(networks.map((item) => [item.ssid, item])).values()];
    return networksUniqueByKey;
  });
}

export async function disconnectFromWifi(): Promise<void> {
  await axios.delete('/api/wifi/selected-network');
}

export async function connectToWifi({ ssid, pass }: WifiCredentials): Promise<void> {
  await axios.put('/api/wifi/selected-network', { ssid, pass }, { timeout: 10000 });
}

export async function refrehNetworks(): Promise<void> {
  await axios.delete('/api/wifi/networks');
}
