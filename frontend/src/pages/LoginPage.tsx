import { useState } from 'react';
import type { FormEvent } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';

const DEMO_CREDENTIALS = { email: 'demo@novatech.fr', password: 'Demo1234!' };

/** Connexion (bonus JWT) — redirige vers la page demandée après authentification. */
const LoginPage = () => {
  const { login } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const from = (location.state as { from?: string } | null)?.from || '/';

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setError(null);

    if (!email || !password) {
      setError('Renseignez votre email et votre mot de passe.');
      return;
    }

    setSubmitting(true);
    try {
      const user = await login(email, password);
      // Un administrateur arrive directement sur son back-office.
      navigate(user.role === 'admin' ? '/admin' : from, { replace: true });
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Connexion impossible.');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="container auth-layout">
      <section className="card auth-card">
        <h1 className="auth-card__title">Connexion</h1>
        <p className="muted">Retrouvez vos commandes et gardez votre panier d'un appareil à l'autre.</p>

        <form className="form" onSubmit={handleSubmit} noValidate>
          <label className="field">
            <span className="field__label">Email</span>
            <input
              type="email"
              className="input"
              placeholder="vous@exemple.fr"
              autoComplete="email"
              value={email}
              onChange={(event) => setEmail(event.target.value)}
            />
          </label>

          <label className="field">
            <span className="field__label">Mot de passe</span>
            <input
              type="password"
              className="input"
              placeholder="••••••••"
              autoComplete="current-password"
              value={password}
              onChange={(event) => setPassword(event.target.value)}
            />
          </label>

          {error && (
            <p className="form-error" role="alert">
              {error}
            </p>
          )}

          <button type="submit" className="button button--primary button--full button--lg" disabled={submitting}>
            {submitting ? 'Connexion…' : 'Se connecter'}
          </button>
        </form>

        <button
          type="button"
          className="auth-card__demo button button--ghost button--sm"
          onClick={() => {
            setEmail(DEMO_CREDENTIALS.email);
            setPassword(DEMO_CREDENTIALS.password);
          }}
        >
          Remplir avec le compte de démonstration
        </button>

        <p className="auth-card__switch">
          Pas encore de compte ? <Link to="/register">Créer un compte</Link>
        </p>
      </section>
    </div>
  );
};

export default LoginPage;
