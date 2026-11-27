import { useState } from 'react';
import type { FormEvent } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';

interface FieldErrors {
  name?: string;
  email?: string;
  password?: string;
  confirm?: string;
}

/** Inscription (bonus JWT) : le panier invité en cours est automatiquement rattaché. */
const RegisterPage = () => {
  const { register } = useAuth();
  const navigate = useNavigate();

  const [form, setForm] = useState({ name: '', email: '', password: '', confirm: '' });
  const [errors, setErrors] = useState<FieldErrors>({});
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  const update = (field: keyof typeof form) => (value: string) => {
    setForm((current) => ({ ...current, [field]: value }));
  };

  const validate = (): boolean => {
    const next: FieldErrors = {};
    if (form.name.trim().length < 2) next.name = 'Le nom doit contenir au moins 2 caractères.';
    if (!/^\S+@\S+\.\S+$/.test(form.email)) next.email = 'L\'adresse email n\'est pas valide.';
    if (form.password.length < 8) next.password = 'Le mot de passe doit contenir au moins 8 caractères.';
    if (form.confirm !== form.password) next.confirm = 'Les mots de passe ne correspondent pas.';
    setErrors(next);
    return Object.keys(next).length === 0;
  };

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setError(null);

    if (!validate()) return;

    setSubmitting(true);
    try {
      await register(form.name.trim(), form.email.trim().toLowerCase(), form.password);
      navigate('/', { replace: true });
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Inscription impossible.');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="container auth-layout">
      <section className="card auth-card">
        <h1 className="auth-card__title">Créer un compte</h1>
        <p className="muted">
          Votre panier actuel sera automatiquement rattaché à votre nouveau compte.
        </p>

        <form className="form" onSubmit={handleSubmit} noValidate>
          <label className="field">
            <span className="field__label">Nom complet</span>
            <input
              type="text"
              className="input"
              placeholder="Prénom Nom"
              autoComplete="name"
              value={form.name}
              onChange={(event) => update('name')(event.target.value)}
              aria-invalid={Boolean(errors.name)}
            />
            {errors.name && <span className="field__error">{errors.name}</span>}
          </label>

          <label className="field">
            <span className="field__label">Email</span>
            <input
              type="email"
              className="input"
              placeholder="vous@exemple.fr"
              autoComplete="email"
              value={form.email}
              onChange={(event) => update('email')(event.target.value)}
              aria-invalid={Boolean(errors.email)}
            />
            {errors.email && <span className="field__error">{errors.email}</span>}
          </label>

          <label className="field">
            <span className="field__label">Mot de passe</span>
            <input
              type="password"
              className="input"
              placeholder="8 caractères minimum"
              autoComplete="new-password"
              value={form.password}
              onChange={(event) => update('password')(event.target.value)}
              aria-invalid={Boolean(errors.password)}
            />
            {errors.password && <span className="field__error">{errors.password}</span>}
          </label>

          <label className="field">
            <span className="field__label">Confirmez le mot de passe</span>
            <input
              type="password"
              className="input"
              placeholder="Répétez le mot de passe"
              autoComplete="new-password"
              value={form.confirm}
              onChange={(event) => update('confirm')(event.target.value)}
              aria-invalid={Boolean(errors.confirm)}
            />
            {errors.confirm && <span className="field__error">{errors.confirm}</span>}
          </label>

          {error && (
            <p className="form-error" role="alert">
              {error}
            </p>
          )}

          <button type="submit" className="button button--primary button--full button--lg" disabled={submitting}>
            {submitting ? 'Création du compte…' : 'Créer mon compte'}
          </button>
        </form>

        <p className="auth-card__switch">
          Déjà inscrit ? <Link to="/login">Se connecter</Link>
        </p>
      </section>
    </div>
  );
};

export default RegisterPage;
