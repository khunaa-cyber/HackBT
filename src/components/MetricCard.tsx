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
    </button>
  );
}
