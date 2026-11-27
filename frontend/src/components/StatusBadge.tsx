import { orderStatusLabel } from '../utils/format';

/** Pastille colorée reflétant le statut d'une commande. */
const StatusBadge = ({ status }: { status: string }) => (
  <span className={`status-badge status-badge--${status}`}>{orderStatusLabel(status)}</span>
);

export default StatusBadge;
