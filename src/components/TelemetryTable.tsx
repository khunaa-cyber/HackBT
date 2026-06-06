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
          <p className="eyebrow">Сүүлийн өгөгдөл</p>
          <h2>Телеметрийн хүснэгт</h2>
        </div>
        <span className="unit-pill">Сүүлийн 30 мөр</span>
      </div>

      <div className="table-wrap">
        <table>
          <thead>
            <tr>
              <th>ID</th>
              <th>Цаг</th>
              <th>Темп °C</th>
              <th>Чийг %</th>
              <th>Даралт hPa</th>
              <th>UV mW/cm²</th>
              <th>UV индекс</th>
              <th>Өндөр m</th>
              <th>Төлөв</th>
            </tr>
          </thead>
          <tbody>
            {rows.length === 0 ? (
              <tr>
                <td colSpan={9} className="empty-row">Одоогоор пакет хүлээгдээгүй.</td>
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
                  <td><span className={packet.valid ? 'valid-pill' : 'invalid-pill'}>{packet.valid ? 'Хүчинтэй' : 'Хүчингүй'}</span></td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </section>
  );
}
