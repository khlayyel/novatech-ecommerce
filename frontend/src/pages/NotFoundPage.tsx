import { Link } from 'react-router-dom';
import EmptyState from '../components/EmptyState';

/** Page 404 pour toute route inconnue. */
const NotFoundPage = () => (
  <div className="container">
    <EmptyState
      title="Page introuvable (404)"
      message="La page demandée n'existe pas ou a été déplacée."
      icon="🧭"
      action={
        <Link to="/" className="button button--primary">
          Retour à l'accueil
        </Link>
      }
    />
  </div>
);

export default NotFoundPage;
