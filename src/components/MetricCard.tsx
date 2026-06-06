import { ArrowDownRight, ArrowUpRight } from 'lucide-react';
import { MetricConfig, TelemetryPacket } from '../types/telemetry';

type MetricCardProps = {
  metric: MetricConfig;
  latest: TelemetryPacket | null;
  previous: TelemetryPacket | null;
  selected: boolean;
  onClick: () => void;
};

function formatValue(value: number | null, unit: string) {
  if (value === null) return '--';
  return `${value.toFixed(value >= 100 ? 1 : 2)}${unit ? ` ${unit}` : ''}`;
}

export function MetricCard({ metric, latest, previous, selected, onClick }: MetricCardProps) {
  const currentValue = latest?.[metric.key] ?? null;
  const previousValue = previous?.[metric.key] ?? null;
  const delta = currentValue !== null && previousValue !== null ? currentValue - previousValue : null;

  function uvGuidance(uvi: number | null) {
    if (uvi === null) return null;
    if (uvi <= 2) return 'Low: normal outdoor activity is safe. Use sunscreen if you have sensitive skin.';
    if (uvi <= 5) return 'Moderate: use sunscreen (SPF 30+), wear a hat and seek shade during midday.';
    if (uvi <= 7) return 'High: sun protection required—reapply sunscreen every 2 hours and limit direct sun exposure.';
    if (uvi <= 10) return 'Very High: avoid prolonged sun exposure; wear protective clothing and sunscreen.';
    return 'Extreme: stay indoors if possible; use full sun protection (SPF 50+, hat, sunglasses).';
  }

  return (
    <button
      className={`metric-card ${selected ? 'metric-card-selected' : ''}`}
      onClick={onClick}
      type="button"
    >
      <div className="metric-card-header">
        <span>{metric.shortLabel}</span>
        {delta !== null && Math.abs(delta) > 0.001 ? (
          <span className={delta >= 0 ? 'delta-up' : 'delta-down'}>
            {delta >= 0 ? <ArrowUpRight size={16} /> : <ArrowDownRight size={16} />}
            {Math.abs(delta).toFixed(2)}
          </span>
        ) : (
          <span className="delta-flat">stable</span>
        )}
      </div>
      <div className="metric-value">{formatValue(currentValue, metric.unit)}</div>
      <div className="metric-description">{metric.description}</div>
      {metric.key === 'uvIndex' ? (
        <div className="metric-guidance">{uvGuidance(currentValue)}</div>
      ) : null}
    </button>
  );
}
