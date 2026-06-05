import { Download, PlugZap, Radio, Trash2 } from 'lucide-react';
import { packetsToCsv } from '../lib/parseTelemetry';
import { SerialStatus, TelemetryPacket } from '../types/telemetry';

type ConnectionPanelProps = {
  status: SerialStatus;
  packets: TelemetryPacket[];
  total: number;
  validCount: number;
  invalidCount: number;
  dataLossPercent: number;
  baudRate: number;
  setBaudRate: (value: number) => void;
  error: string | null;
  onConnect: () => void;
  onDisconnect: () => void;
  onSimulation: () => void;
  onClear: () => void;
};

function statusLabel(status: SerialStatus) {
  switch (status) {
    case 'connected': return 'Connected';
    case 'connecting': return 'Connecting';
    case 'simulation': return 'Simulation';
    case 'error': return 'Error';
    default: return 'Disconnected';
  }
}

export function ConnectionPanel(props: ConnectionPanelProps) {
  const exportCsv = () => {
    const blob = new Blob([packetsToCsv(props.packets)], { type: 'text/csv;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `cansat-telemetry-${new Date().toISOString().slice(0, 19).replaceAll(':', '-')}.csv`;
    link.click();
    URL.revokeObjectURL(url);
  };

  return (
    <aside className="panel side-panel">
      <div className="section-header">
        <div>
          <p className="eyebrow">Ground station</p>
          <h2>XBee Serial</h2>
        </div>
        <span className={`status-dot status-${props.status}`}>
          <Radio size={14} /> {statusLabel(props.status)}
        </span>
      </div>

      <label className="field-label" htmlFor="baudRate">Baud rate</label>
      <select
        id="baudRate"
        className="select"
        value={props.baudRate}
        onChange={(event) => props.setBaudRate(Number(event.target.value))}
        disabled={props.status === 'connected'}
      >
        <option value={9600}>9600</option>
        <option value={19200}>19200</option>
        <option value={38400}>38400</option>
        <option value={57600}>57600</option>
        <option value={115200}>115200</option>
      </select>

      <div className="button-grid">
        <button className="primary-button" onClick={props.onConnect} type="button">
          <PlugZap size={18} /> Connect
        </button>
        <button className="secondary-button" onClick={props.onDisconnect} type="button">
          Disconnect
        </button>
        <button className="secondary-button" onClick={props.onSimulation} type="button">
          Simulate
        </button>
        <button className="secondary-button" onClick={exportCsv} type="button" disabled={props.packets.length === 0}>
          <Download size={18} /> CSV
        </button>
      </div>

      {props.error && <div className="error-box">{props.error}</div>}

      <div className="stats-grid">
        <div><span>Total packets</span><strong>{props.total}</strong></div>
        <div><span>Valid packets</span><strong>{props.validCount}</strong></div>
        <div><span>Invalid packets</span><strong>{props.invalidCount}</strong></div>
        <div><span>Data loss</span><strong>{props.dataLossPercent}%</strong></div>
      </div>

      <button className="danger-button" onClick={props.onClear} type="button">
        <Trash2 size={16} /> Clear session
      </button>
    </aside>
  );
}
