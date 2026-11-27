interface QuantityStepperProps {
  value: number;
  min?: number;
  max: number;
  disabled?: boolean;
  onChange: (quantity: number) => void;
}

/** Sélecteur de quantité − / + utilisé dans le panier. */
const QuantityStepper = ({ value, min = 1, max, disabled = false, onChange }: QuantityStepperProps) => {
  const decrease = () => onChange(Math.max(min, value - 1));
  const increase = () => onChange(Math.min(max, value + 1));

  return (
    <div className="stepper" data-disabled={disabled || undefined}>
      <button type="button" className="stepper__btn" onClick={decrease} disabled={disabled || value <= min} aria-label="Diminuer la quantité">
        −
      </button>
      <span className="stepper__value" aria-live="polite">{value}</span>
      <button
        type="button"
        className="stepper__btn"
        onClick={increase}
        disabled={disabled || value >= max}
        aria-label="Augmenter la quantité"
      >
        +
      </button>
    </div>
  );
};

export default QuantityStepper;
