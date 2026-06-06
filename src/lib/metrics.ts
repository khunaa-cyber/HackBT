import { MetricConfig } from '../types/telemetry';

export const metrics: MetricConfig[] = [
  {
    key: 'temperature',
    label: 'Температур',
    shortLabel: 'Темп',
    unit: '°C',
    description: 'BMP280 / DHT температурын уншлага'
  },
  {
    key: 'humidity',
    label: 'Чийгшил',
    shortLabel: 'Чийг',
    unit: '%',
    description: 'DHT11 харьцан буй чийгшил'
  },
  {
    key: 'pressure',
    label: 'Агаарын даралт',
    shortLabel: 'Даралт',
    unit: 'hPa',
    description: 'BMP280 агаарын даралт'
  },
  {
    key: 'uvIntensity',
    label: 'UV эрчим',
    shortLabel: 'UV',
    unit: 'mW/cm²',
    description: 'GY-ML8511 UV эрчим'
  },
  {
    key: 'uvIndex',
    label: 'UV индекс',
    shortLabel: 'UVI',
    unit: '',
    description: 'Тоологдсон UV индекс'
  },
  {
    key: 'altitude',
    label: 'Өндөр',
    shortLabel: 'Өндөр',
    unit: 'm',
    description: 'Даралтаас тооцоолсон өндөр'
  }
];

export function getMetric(key: string) {
  return metrics.find((metric) => metric.key === key) ?? metrics[0];
}
