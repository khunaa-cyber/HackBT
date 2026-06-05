import { Satellite } from 'lucide-react';
import { useMemo, useState } from 'react';
import { ConnectionPanel } from './components/ConnectionPanel';
import { LiveChart } from './components/LiveChart';
import { MetricCard } from './components/MetricCard';
import { TelemetryTable } from './components/TelemetryTable';
import { useSerialTelemetry } from './hooks/useSerialTelemetry';
import { metrics } from './lib/metrics';
import { MetricKey } from './types/telemetry';

export default function App() {
  const [selectedMetric, setSelectedMetric] = useState<MetricKey>('temperature');
  const telemetry = useSerialTelemetry();
  const latest = telemetry.stats.latest;
  const previous = telemetry.packets.length > 1 ? telemetry.packets[telemetry.packets.length - 2] : null;

  const missionTime = useMemo(() => {
    if (!latest) return '--:--';
    return new Date(latest.receivedAt).toLocaleTimeString();
  }, [latest]);

  return (
    <main className="dashboard-shell">
      <header className="hero">
        <div>
          <div className="brand-row">
            <span className="brand-icon"><Satellite size={22} /></span>
            <span>WE Mongolia CanSat 2026</span>
          </div>
          <h1>Live Weather Telemetry Dashboard</h1>
          <p>
            Real-time CanSat ground station interface for temperature, humidity, pressure,
            UV intensity, UV index, and estimated altitude.
          </p>
        </div>
        <div className="hero-card">
          <span>Last received</span>
          <strong>{missionTime}</strong>
          <small>{latest?.raw ?? 'Waiting for XBee telemetry...'}</small>
        </div>
      </header>

      <section className="metric-grid">
        {metrics.map((metric) => (
          <MetricCard
            key={metric.key}
            metric={metric}
            latest={latest}
            previous={previous}
            selected={selectedMetric === metric.key}
            onClick={() => setSelectedMetric(metric.key)}
          />
        ))}
      </section>

      <section className="content-grid">
        <LiveChart packets={telemetry.packets} metricKey={selectedMetric} />
        <ConnectionPanel
          status={telemetry.status}
          packets={telemetry.packets}
          total={telemetry.stats.total}
          validCount={telemetry.stats.validCount}
          invalidCount={telemetry.stats.invalidCount}
          dataLossPercent={telemetry.stats.dataLossPercent}
          baudRate={telemetry.baudRate}
          setBaudRate={telemetry.setBaudRate}
          error={telemetry.error}
          onConnect={telemetry.connect}
          onDisconnect={telemetry.disconnect}
          onSimulation={telemetry.startSimulation}
          onClear={telemetry.clearPackets}
        />
      </section>

      <TelemetryTable packets={telemetry.packets} />
    </main>
  );
}
