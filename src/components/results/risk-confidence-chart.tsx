interface RiskConfidenceChartProps {
  riskScore: number;
  confidenceLevel: number;
}

export function RiskConfidenceChart({
  riskScore,
  confidenceLevel,
}: RiskConfidenceChartProps) {
  // Chart area: x from 60 to 380, y from 40 to 360
  const chartX = 60;
  const chartY = 40;
  const chartW = 320;
  const chartH = 320;

  // Map scores to SVG coords
  const dotX = chartX + (confidenceLevel / 100) * chartW;
  const dotY = chartY + chartH - (riskScore / 100) * chartH;

  // Diagonal zone boundaries (from bottom-left to top-right)
  // Zone thresholds on the diagonal: risk - confidence mapping
  const zoneLines = [
    { x1: chartX, y1: chartY + chartH * 0.25, x2: chartX + chartW * 0.75, y2: chartY + chartH },
    { x1: chartX, y1: chartY + chartH * 0.5, x2: chartX + chartW * 0.5, y2: chartY + chartH },
    { x1: chartX, y1: chartY + chartH * 0.75, x2: chartX + chartW * 0.25, y2: chartY + chartH },
  ];

  return (
    <div className="w-full">
      <svg viewBox="0 0 440 420" className="w-full h-auto" role="img" aria-label="Risiko-Vertrauens-Diagramm">
        {/* Background zones */}
        {/* ABLEHNEN - top-left (high risk, low confidence) */}
        <polygon
          points={`${chartX},${chartY} ${chartX},${chartY + chartH * 0.25} ${chartX + chartW * 0.75},${chartY + chartH} ${chartX + chartW},${chartY + chartH} ${chartX + chartW},${chartY} ${chartX},${chartY}`}
          fill="#E02E2A"
          opacity="0.12"
        />
        {/* WARNUNG */}
        <polygon
          points={`${chartX},${chartY + chartH * 0.25} ${chartX},${chartY + chartH * 0.5} ${chartX + chartW * 0.5},${chartY + chartH} ${chartX + chartW * 0.75},${chartY + chartH}`}
          fill="#F75880"
          opacity="0.12"
        />
        {/* PRÜFEN */}
        <polygon
          points={`${chartX},${chartY + chartH * 0.5} ${chartX},${chartY + chartH * 0.75} ${chartX + chartW * 0.25},${chartY + chartH} ${chartX + chartW * 0.5},${chartY + chartH}`}
          fill="#FFCF31"
          opacity="0.15"
        />
        {/* FREIGEBEN - bottom-right (low risk, high confidence) */}
        <polygon
          points={`${chartX},${chartY + chartH * 0.75} ${chartX},${chartY + chartH} ${chartX + chartW * 0.25},${chartY + chartH}`}
          fill="#005E47"
          opacity="0.12"
        />

        {/* Diagonal zone lines */}
        {zoneLines.map((line, i) => (
          <line
            key={i}
            x1={line.x1}
            y1={line.y1}
            x2={line.x2}
            y2={line.y2}
            stroke="#979797"
            strokeWidth="1"
            strokeDasharray="4,4"
          />
        ))}

        {/* Zone labels */}
        <text x={chartX + chartW * 0.7} y={chartY + 30} fill="#E02E2A" fontSize="11" fontWeight="600">ABLEHNEN</text>
        <text x={chartX + chartW * 0.35} y={chartY + chartH * 0.35} fill="#F75880" fontSize="11" fontWeight="600">WARNUNG</text>
        <text x={chartX + chartW * 0.15} y={chartY + chartH * 0.6} fill="#9A6E00" fontSize="11" fontWeight="600">PRÜFEN</text>
        <text x={chartX + 8} y={chartY + chartH - 10} fill="#005E47" fontSize="11" fontWeight="600">FREIGEBEN</text>

        {/* Grid lines */}
        {[0, 25, 50, 75, 100].map((v) => {
          const y = chartY + chartH - (v / 100) * chartH;
          const x = chartX + (v / 100) * chartW;
          return (
            <g key={v}>
              <line x1={chartX} y1={y} x2={chartX + chartW} y2={y} stroke="#EEEEEE" strokeWidth="1" />
              <line x1={x} y1={chartY} x2={x} y2={chartY + chartH} stroke="#EEEEEE" strokeWidth="1" />
              <text x={chartX - 8} y={y + 4} textAnchor="end" fontSize="10" fill="#979797">{v}</text>
              <text x={x} y={chartY + chartH + 16} textAnchor="middle" fontSize="10" fill="#979797">{v}%</text>
            </g>
          );
        })}

        {/* Axes */}
        <line x1={chartX} y1={chartY} x2={chartX} y2={chartY + chartH} stroke="#3B3B3B" strokeWidth="1.5" />
        <line x1={chartX} y1={chartY + chartH} x2={chartX + chartW} y2={chartY + chartH} stroke="#3B3B3B" strokeWidth="1.5" />

        {/* Axis labels */}
        <text x={chartX + chartW / 2} y={chartY + chartH + 36} textAnchor="middle" fontSize="12" fill="#3B3B3B" fontWeight="500">Vertrauensniveau</text>
        <text transform={`rotate(-90, ${chartX - 40}, ${chartY + chartH / 2})`} x={chartX - 40} y={chartY + chartH / 2} textAnchor="middle" fontSize="12" fill="#3B3B3B" fontWeight="500">Risikoscore</text>

        {/* Carrier dot */}
        <circle cx={dotX} cy={dotY} r="16" fill="#2649A5" opacity="0.15" />
        <circle cx={dotX} cy={dotY} r="10" fill="#2649A5" />
        <text x={dotX} y={dotY + 4} textAnchor="middle" fontSize="10" fontWeight="700" fill="white">FF</text>

        {/* Score annotations */}
        <text x={dotX + 16} y={dotY - 8} fontSize="10" fill="#2649A5" fontWeight="500">
          Risiko: {riskScore.toFixed(0)} | Vertrauen: {confidenceLevel.toFixed(0)}%
        </text>
      </svg>
    </div>
  );
}
