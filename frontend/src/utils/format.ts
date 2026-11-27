/** Formatage prix/date + libellés de statut de commande. */

const priceFormatter = new Intl.NumberFormat('fr-FR', {
  style: 'currency',
  currency: 'EUR'
});

export const formatPrice = (value: number): string => priceFormatter.format(value);

export const formatDate = (isoDate: string): string =>
  new Date(isoDate).toLocaleDateString('fr-FR', {
    day: 'numeric',
    month: 'long',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit'
  });

export const ORDER_STATUS_LABELS: Record<string, string> = {
  pending: 'En attente de paiement',
  paid: 'Payée',
  failed: 'Paiement échoué',
  shipped: 'Expédiée',
  delivered: 'Livrée'
};

export const orderStatusLabel = (status: string): string =>
  ORDER_STATUS_LABELS[status] || status;
