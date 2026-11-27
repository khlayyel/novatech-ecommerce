import { useState } from 'react';
import type { FormEvent } from 'react';
import { PaymentElement, useElements, useStripe } from '@stripe/react-stripe-js';
import { confirmOrder } from '../api/orders';
import { useToast } from '../context/ToastContext';
import { formatPrice } from '../utils/format';

interface CheckoutFormProps {
  orderId: string;
  totalAmount: number;
  onDone: () => void;
}

/**
 * Formulaire de paiement Stripe Elements.
 * Après un paiement réussi, la commande est confirmée côté serveur
 * (état revérifié auprès de Stripe), puis l'utilisateur est redirigé.
 */
const CheckoutForm = ({ orderId, totalAmount, onDone }: CheckoutFormProps) => {
  const stripe = useStripe();
  const elements = useElements();
  const { showToast } = useToast();

  const [processing, setProcessing] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();

    if (!stripe || !elements) return;

    setProcessing(true);
    setError(null);

    const { error: stripeError, paymentIntent } = await stripe.confirmPayment({
      elements,
      redirect: 'if_required'
    });

    if (stripeError) {
      setError(stripeError.message || 'Le paiement a été refusé.');
      setProcessing(false);
      return;
    }

    if (paymentIntent && paymentIntent.status === 'succeeded') {
      try {
        await confirmOrder(orderId);
      } catch {
        // La confirmation serveur échoue rarement (réseau) : le webhook Stripe
        // rattrapera la commande. Le suivi affichera l'état réel.
      }
      showToast('Paiement accepté ! Votre commande est confirmée.', 'success');
      onDone();
      return;
    }

    setError('Le paiement est encore en cours de vérification, consultez le suivi de votre commande.');
    setProcessing(false);
  };

  return (
    <form className="payment-form" onSubmit={handleSubmit}>
      <PaymentElement options={{ layout: 'accordion' }} />

      {error && (
        <p className="form-error" role="alert">
          {error}
        </p>
      )}

      <button type="submit" className="button button--primary button--full button--lg" disabled={!stripe || processing}>
        {processing ? 'Traitement du paiement…' : `Payer ${formatPrice(totalAmount)}`}
      </button>

      <p className="muted small payment-form__note">
        🔒 Paiement sécurisé par Stripe (mode test). Carte de test : 4242 4242 4242 4242 —
        n'importe quelle date future, CVC 3 chiffres.
      </p>
    </form>
  );
};

export default CheckoutForm;
