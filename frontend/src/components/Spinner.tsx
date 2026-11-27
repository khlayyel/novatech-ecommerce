/** Indicateur de chargement accessible. */
const Spinner = ({ label }: { label?: string }) => (
  <div className="spinner-wrap" role="status" aria-live="polite">
    <span className="spinner" aria-hidden="true" />
    {label && <span className="spinner-label">{label}</span>}
  </div>
);

export default Spinner;
