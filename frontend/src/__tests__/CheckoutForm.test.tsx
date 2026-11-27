import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import CheckoutForm from '../components/CheckoutForm';
import * as ordersApi from '../api/orders';
import { formatPrice } from '../utils/format';

// Stripe Elements est moqué : les tests valident la logique du formulaire.
// NB : Jest 30 exige que les variables référencées dans les factories
// jest.mock() commencent par le préfixe « mock ».
jest.mock('@stripe/react-stripe-js', () => ({
  PaymentElement: () => <div data-testid="payment-element" />,
  useStripe: () => ({ confirmPayment: mockConfirmPayment }),
  useElements: () => ({ getElement: jest.fn() })
}));

jest.mock('../api/orders');
jest.mock('../context/ToastContext', () => ({
  useToast: () => ({ showToast: mockShowToast })
}));

const mockedOrdersApi = jest.mocked(ordersApi);
const mockConfirmPayment = jest.fn();
const mockShowToast = jest.fn();
const mockOnDone = jest.fn();

const renderForm = () =>
  render(<CheckoutForm orderId="order_123" totalAmount={258} onDone={mockOnDone} />);

describe('CheckoutForm (Stripe Elements)', () => {
  beforeEach(() => {
    mockConfirmPayment.mockReset();
    mockShowToast.mockReset();
    mockOnDone.mockClear();
    mockedOrdersApi.confirmOrder.mockReset();
    mockedOrdersApi.confirmOrder.mockResolvedValue({
      _id: 'order_123',
      items: [],
      totalAmount: 258,
      currency: 'eur',
      status: 'paid',
      createdAt: '',
      updatedAt: ''
    });
  });

  it('affiche l\'élément de paiement et le bouton avec le montant', () => {
    renderForm();

    expect(screen.getByTestId('payment-element')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: `Payer ${formatPrice(258)}` })).toBeEnabled();
  });

  it('confirme le paiement, synchronise la commande puis appelle onDone', async () => {
    mockConfirmPayment.mockResolvedValue({
      error: undefined,
      paymentIntent: { id: 'pi_123', status: 'succeeded' }
    });

    renderForm();
    await userEvent.click(screen.getByRole('button', { name: /Payer/i }));

    await waitFor(() => {
      expect(mockOnDone).toHaveBeenCalledTimes(1);
    });

    expect(mockConfirmPayment).toHaveBeenCalledWith(
      expect.objectContaining({ elements: expect.anything(), redirect: 'if_required' })
    );
    expect(mockedOrdersApi.confirmOrder).toHaveBeenCalledWith('order_123');
    expect(mockShowToast).toHaveBeenCalledWith(
      expect.stringContaining('Paiement accepté'),
      'success'
    );
  });

  it('affiche l\'erreur Stripe sans confirmer la commande (paiement refusé)', async () => {
    mockConfirmPayment.mockResolvedValue({
      error: { message: 'Votre carte a été refusée.' },
      paymentIntent: undefined
    });

    renderForm();
    await userEvent.click(screen.getByRole('button', { name: /Payer/i }));

    expect(await screen.findByRole('alert')).toHaveTextContent('Votre carte a été refusée.');
    expect(mockedOrdersApi.confirmOrder).not.toHaveBeenCalled();
    expect(mockOnDone).not.toHaveBeenCalled();
    expect(screen.getByRole('button', { name: /Payer/i })).toBeEnabled();
  });

  it('reste sur un état vérifiable si le paiement n\'est pas encore abouti', async () => {
    mockConfirmPayment.mockResolvedValue({ error: undefined, paymentIntent: { id: 'pi_123', status: 'processing' } });

    renderForm();
    await userEvent.click(screen.getByRole('button', { name: /Payer/i }));

    expect(await screen.findByRole('alert')).toHaveTextContent(/en cours de vérification/);
    expect(mockOnDone).not.toHaveBeenCalled();
  });
});
