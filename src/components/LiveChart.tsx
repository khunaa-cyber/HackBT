import {
  CartesianGrid,
  Line,
  LineChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis
} from 'recharts';
import { getMetric } from '../lib/metrics';
import { MetricKey, TelemetryPacket } from '../types/telemetry';

type LiveChartProps = {
  packets: TelemetryPacket[];
  metricKey: MetricKey;
};

export function LiveChart({ packets, metricKey }: LiveChartProps) {
  const metric = getMetric(metricKey);
  const data = packets
    .filter((packet) => packet[metricKey] !== null)
    .slice(-80)
    .map((packet) => ({
      id: packet.id,
      time: packet.timestamp,
      value: packet[metricKey]
    }));

  return (
    <section className="panel chart-panel">
      <div className="section-header">
        <div>
          <p className="eyebrow">Live graph</p>
          <h2>{metric.label}</h2>
        </div>
        <span className="unit-pill">{metric.unit || 'index'}</span>
      </div>

      {data.length === 0 ? (
        <div className="empty-state">No valid telemetry yet. Connect serial or start simulation.</div>
      ) : (
        <ResponsiveContainer width="100%" height={330}>
          <LineChart data={data} margin={{ top: 16, right: 20, left: 0, bottom: 8 }}>
            <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.08)" />
            <XAxis dataKey="time" stroke="rgba(255,255,255,0.55)" tick={{ fontSize: 12 }} minTickGap={28} />
            <YAxis stroke="rgba(255,255,255,0.55)" tick={{ fontSize: 12 }} width={48} />
            <Tooltip
              contentStyle={{
                background: 'rgba(10, 16, 30, 0.95)',
                border: '1px solid rgba(255,255,255,0.12)',
                borderRadius: '14px',
                color: '#fff'
              }}
              formatter={(value) => [`${Number(value).toFixed(2)} ${metric.unit}`, metric.label]}
            />
            <Line
              type="monotone"
              dataKey="value"
              stroke="#7dd3fc"
              strokeWidth={3}
              dot={false}
              activeDot={{ r: 5 }}
              isAnimationActive={false}
            />
          </LineChart>
        </ResponsiveContainer>
      )}
    </section>
  );
}
