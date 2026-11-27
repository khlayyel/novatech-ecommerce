import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { I18nProvider, useI18n } from '../i18n';

const Probe = () => {
  const { t, locale, dir, setLocale } = useI18n();
  return (
    <div>
      <p data-testid="state">{`${locale}:${dir}`}</p>
      <p data-testid="products">{t('admin.nav.products')}</p>
      <p data-testid="range">{t('table.range', { from: 1, to: 10, total: 25 })}</p>
      <button type="button" onClick={() => setLocale('en')}>EN</button>
      <button type="button" onClick={() => setLocale('ar')}>AR</button>
    </div>
  );
};

const renderProbe = () =>
  render(
    <I18nProvider>
      <Probe />
    </I18nProvider>
  );

beforeEach(() => {
  window.localStorage.clear();
  document.documentElement.lang = 'fr';
  document.documentElement.dir = 'ltr';
});

describe('i18n', () => {
  it('utilise le français par défaut et interpole les paramètres', () => {
    renderProbe();

    expect(screen.getByTestId('state')).toHaveTextContent('fr:ltr');
    expect(screen.getByTestId('products')).toHaveTextContent('Produits');
    expect(screen.getByTestId('range')).toHaveTextContent('1–10 sur 25 ligne(s)');
  });

  it('bascule en anglais depuis les ressources', async () => {
    renderProbe();

    await userEvent.click(screen.getByRole('button', { name: 'EN' }));

    expect(screen.getByTestId('state')).toHaveTextContent('en:ltr');
    expect(screen.getByTestId('products')).toHaveTextContent('Products');
    expect(screen.getByTestId('range')).toHaveTextContent('1–10 of 25 row(s)');
    expect(window.localStorage.getItem('novatech.locale')).toBe('en');
  });

  it('bascule en arabe et applique le sens de lecture RTL', async () => {
    renderProbe();

    await userEvent.click(screen.getByRole('button', { name: 'AR' }));

    expect(screen.getByTestId('state')).toHaveTextContent('ar:rtl');
    expect(screen.getByTestId('products')).toHaveTextContent('المنتجات');
    expect(document.documentElement.dir).toBe('rtl');
    expect(document.documentElement.lang).toBe('ar');
  });

  it('restaure la langue mémorisée', () => {
    window.localStorage.setItem('novatech.locale', 'en');

    renderProbe();

    expect(screen.getByTestId('state')).toHaveTextContent('en:ltr');
    expect(screen.getByTestId('products')).toHaveTextContent('Products');
  });
});
