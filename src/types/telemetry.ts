export type MetricKey =
  | 'temperature'
  | 'humidity'
  | 'pressure'
  | 'uvIntensity'
  | 'uvIndex'
  | 'altitude';

export type TelemetryPacket = {
  id: number;
  timestamp: string;
  receivedAt: string;
  temperature: number | null;
  humidity: number | null;
  pressure: number | null;
  uvIntensity: number | null;
  uvIndex: number | null;
  altitude: number | null;
  raw: string;
  valid: boolean;
};

export type SerialStatus = 'disconnected' | 'connecting' | 'connected' | 'error' | 'simulation';

export type MetricConfig = {
  key: MetricKey;
  label: string;
  shortLabel: string;
  unit: string;
  description: string;
};
