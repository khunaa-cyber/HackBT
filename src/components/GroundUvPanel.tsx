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
          <p className="eyebrow">UV харьцуулалт</p>
          <h2>Газар дээрх UV ба CanSat UV</h2>
        </div>
        <span className="unit-pill">Амьд UV индекс графикийн доор</span>
      </div>

      <div className="ground-uv-grid">
        <div className="ground-uv-card ground-uv-main">
          <span>CanSat UV индекс</span>
          <strong>{formatValue(canSatUvIndex)}</strong>
          <small>Энэ нь CanSat-аас ирж буй UV утга юм.</small>
        </div>

        <div className="ground-uv-card">
          <span>Газар дээрх UV</span>
          <strong>{formatValue(groundUvIndex)}</strong>
          <small>Газрын станцаас авсан лавлагаа утга.</small>
        </div>

        <div className="ground-uv-card">
          <span>Ялгаа</span>
          <strong>{formatValue(uvDiff, 2)}</strong>
          <small>CanSat UV - Газар дээрх UV.</small>
        </div>
      </div>
    </section>
  );
}