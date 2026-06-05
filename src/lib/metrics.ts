import { MetricConfig } from '../types/telemetry';

export const metrics: MetricConfig[] = [
  {
    key: 'temperature',
    label: 'Temperature',
    shortLabel: 'Temp',
    unit: '°C',
    description: 'BMP280 / DHT temperature reading'
  },
  {
    key: 'humidity',
    label: 'Humidity',
    shortLabel: 'Humidity',
    unit: '%',
    description: 'DHT11 relative humidity'
  },
  {
    key: 'pressure',
    label: 'Pressure',
    shortLabel: 'Pressure',
    unit: 'hPa',
    description: 'BMP280 atmospheric pressure'
  },
  {
    key: 'uvIntensity',
    label: 'UV Intensity',
    shortLabel: 'UV',
    unit: 'mW/cm²',
    description: 'GY-ML8511 UV intensity'
  },
  {
    key: 'uvIndex',
    label: 'UV Index',
    shortLabel: 'UVI',
    unit: '',
    description: 'Calculated UV index'
  },
  {
    key: 'altitude',
    label: 'Altitude',
    shortLabel: 'Altitude',
    unit: 'm',
    description: 'Estimated altitude from pressure'
  }
];

export function getMetric(key: string) {
  return metrics.find((metric) => metric.key === key) ?? metrics[0];
}
