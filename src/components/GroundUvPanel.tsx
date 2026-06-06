type GroundUvPanelProps = {
  canSatUvIndex: number | null;
  groundUvIndex: number | null;
  uvDiff: number | null;
};

function formatValue(value: number | null, decimals = 1) {
  return value === null ? '--' : value.toFixed(decimals);
}

export function GroundUvPanel({ canSatUvIndex, groundUvIndex, uvDiff }: GroundUvPanelProps) {
  return (
    <section className="panel ground-uv-panel">
      <div className="section-header">
        <div>
          <p className="eyebrow">UV comparison</p>
          <h2>Ground UV vs CanSat UV</h2>
        </div>
        <span className="unit-pill">under live UV index graph</span>
      </div>

      <div className="ground-uv-grid">
        <div className="ground-uv-card ground-uv-main">
          <span>CanSat UV index</span>
          <strong>{formatValue(canSatUvIndex)}</strong>
          <small>This is the UV value coming from the CanSat.</small>
        </div>

        <div className="ground-uv-card">
          <span>Ground UV</span>
          <strong>{formatValue(groundUvIndex)}</strong>
          <small>Reference value from the ground station.</small>
        </div>

        <div className="ground-uv-card">
          <span>Diff</span>
          <strong>{formatValue(uvDiff, 2)}</strong>
          <small>CanSat UV minus ground UV.</small>
        </div>
      </div>
    </section>
  );
}