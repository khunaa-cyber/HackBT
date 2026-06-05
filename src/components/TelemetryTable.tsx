import { TelemetryPacket } from '../types/telemetry';

type TelemetryTableProps = {
  packets: TelemetryPacket[];
};

function cell(value: number | null, decimals = 2) {
  return value === null ? '--' : value.toFixed(decimals);
}

export function TelemetryTable({ packets }: TelemetryTableProps) {
  const rows = [...packets].reverse().slice(0, 30);

  return (
    <section className="panel table-panel">
      <div className="section-header">
        <div>
          <p className="eyebrow">Latest data</p>
          <h2>Telemetry table</h2>
        </div>
        <span className="unit-pill">last 30 rows</span>
      </div>

      <div className="table-wrap">
        <table>
          <thead>
            <tr>
              <th>ID</th>
              <th>Time</th>
              <th>Temp °C</th>
              <th>Humidity %</th>
              <th>Pressure hPa</th>
              <th>UV mW/cm²</th>
              <th>UVI</th>
              <th>Alt m</th>
              <th>Status</th>
            </tr>
          </thead>
          <tbody>
            {rows.length === 0 ? (
              <tr>
                <td colSpan={9} className="empty-row">No packets received yet.</td>
              </tr>
            ) : (
              rows.map((packet) => (
                <tr key={packet.id}>
                  <td>{packet.id}</td>
                  <td>{packet.timestamp}</td>
                  <td>{cell(packet.temperature)}</td>
                  <td>{cell(packet.humidity, 1)}</td>
                  <td>{cell(packet.pressure)}</td>
                  <td>{cell(packet.uvIntensity)}</td>
                  <td>{cell(packet.uvIndex, 1)}</td>
                  <td>{cell(packet.altitude, 1)}</td>
                  <td><span className={packet.valid ? 'valid-pill' : 'invalid-pill'}>{packet.valid ? 'valid' : 'invalid'}</span></td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </section>
  );
}
