import { render, screen } from '@testing-library/react';
import { MemoryRouter, Route, Routes } from 'react-router-dom';
import OrderDetailPage from '../pages/OrderDetailPage';
import * as ordersApi from '../api/orders';
import { formatPrice } from '../utils/format';
import type { Order } from '../types';

jest.mock('../api/orders');

const mockedOrdersApi = jest.mocked(ordersApi);

/** Matcher exact de prix (espace insécable dans le formatage Intl). */
const priceText = (amount: number) => (_content: string, element: Element | null) =>
  element?.textContent === formatPrice(amount);

const paidOrder: Order = {
  _id: '683f0000000000000000abcd',
  items: [
    {
      product: 'p1',
      name: 'NovaKey TKL',
      imageUrl: '/images/products/novakey-tkl.svg',
      priceAtPurchase: 129,
      quantity: 2
    }
  ],
  totalAmount: 258,
  currency: 'eur',
  status: 'paid',
  stripePaymentIntentId: 'pi_test_123',
  createdAt: '2026-01-05T10:00:00.000Z',
  updatedAt: '2026-01-05T10:01:00.000Z',
  paidAt: '2026-01-05T10:01:00.000Z'
};

// La page lit l'identifiant via useParams : la route doit être montée
// pour que le paramètre existe.
const renderPage = (orderId = paidOrder._id) =>
  render(
    <MemoryRouter initialEntries={[`/orders/${orderId}`]}>
      <Routes>
        <Route path="/orders/:id" element={<OrderDetailPage />} />
      </Routes>
    </MemoryRouter>
  );

describe('OrderDetailPage (suivi de commande — bonus)', () => {
  beforeEach(() => {
    mockedOrdersApi.getOrder.mockReset();
  });

  it('affiche le statut, la chronologie et les articles d\'une commande payée', async () => {
    mockedOrdersApi.getOrder.mockResolvedValue(paidOrder);

    renderPage();

    expect(await screen.findByRole('heading', { name: 'Suivi de commande' })).toBeInTheDocument();
    expect(screen.getByText('Payée')).toBeInTheDocument();
    expect(screen.getByText(/0000ABCD/)).toBeInTheDocument();

    // Chronologie : l'étape « Paiement confirmé » est présente.
    expect(screen.getByText('Paiement confirmé')).toBeInTheDocument();

    // Articles et montants — 258 € apparaît sur la ligne, dans les métadonnées
    // (Montant) et sur le total de la commande.
    expect(screen.getByText('NovaKey TKL')).toBeInTheDocument();
    expect(screen.getAllByText(priceText(258))).toHaveLength(3);
  });

  it('affiche une bannière d\'échec pour un paiement refusé', async () => {
    mockedOrdersApi.getOrder.mockResolvedValue({ ...paidOrder, status: 'failed', paidAt: null });

    renderPage();

    expect(await screen.findByText(/Le paiement de cette commande a échoué/)).toBeInTheDocument();
    expect(screen.getByText('Paiement échoué')).toBeInTheDocument();
  });

  it('propose une connexion quand la commande est introuvable', async () => {
    mockedOrdersApi.getOrder.mockRejectedValue(new Error('Commande introuvable.'));

    renderPage();

    expect(await screen.findByRole('heading', { name: 'Commande introuvable' })).toBeInTheDocument();
    expect(screen.getByRole('link', { name: 'Se connecter' })).toBeInTheDocument();
  });
});
