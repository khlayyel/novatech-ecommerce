import { formatPrice } from '../../utils/format';

interface BarChartProps {
  points: { label: string; value: number }[];
  formatValue?: (value: number) => string;
  emptyLabel?: string;
}

/**
 * Histogramme léger (aucune dépendance graphique) : hauteur proportionnelle
 * au maximum de la série, survol natif pour la valeur exacte.
 */
const BarChart = ({ points, formatValue = formatPrice, emptyLabel = 'Aucune donnée' }: BarChartProps) => {
  const max = Math.max(...points.map((point) => point.value), 0);
  const hasData = max > 0;

  if (!hasData) {
    return <p className="muted">{emptyLabel}</p>;
  }

  return (
    <div className="bar-chart" role="img" aria-label={`Histogramme sur ${points.length} jours`}>
      <div className="bar-chart__plot">
        {points.map((point) => (
          <div
            key={point.label}
            className={`bar-chart__col${point.value > 0 ? ' bar-chart__col--filled' : ''}`}
            title={`${point.label} — ${formatValue(point.value)}`}
          >
            <span
              className="bar-chart__bar"
              style={{ height: `${max > 0 ? Math.max(2, Math.round((point.value / max) * 100)) : 0}%` }}
            />
          </div>
        ))}
      </div>
      <div className="bar-chart__axis" aria-hidden="true">
        {points.map((point, index) => (
          <span key={point.label}>{index % 2 === 0 ? point.label : ''}</span>
        ))}
      </div>
    </div>
  );
};

export default BarChart;
