import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import ProductList from '../components/ProductList';
import type { Product } from '../types';

const products: Product[] = [
  {
    _id: 'p1',
    name: 'NovaBook Pro 14',
    description: 'Ultraportable professionnel.',
    price: 1299,
    category: 'Ordinateurs',
    stock: 12,
    imageUrl: '/images/products/novabook-pro-14.svg',
    createdAt: '',
    updatedAt: ''
  },
  {
    _id: 'p2',
    name: 'NovaKey TKL',
    description: 'Clavier mécanique sans fil.',
    price: 129,
    category: 'Périphériques',
    stock: 30,
    imageUrl: '/images/products/novakey-tkl.svg',
    createdAt: '',
    updatedAt: ''
  }
];

describe('ProductList', () => {
  it('affiche des cartes pendant le chargement (rendu conditionnel)', () => {
    const { container } = render(
      <ProductList products={[]} loading error={null} onAdd={jest.fn()} onRetry={jest.fn()} />
    );

    expect(container.querySelectorAll('.skeleton-card')).toHaveLength(6);
  });

  it('affiche les cartes produits une fois chargées', () => {
    render(<ProductList products={products} loading={false} error={null} onAdd={jest.fn()} onRetry={jest.fn()} />);

    expect(screen.getByText('NovaBook Pro 14')).toBeInTheDocument();
    expect(screen.getByText('NovaKey TKL')).toBeInTheDocument();
  });

  it('affiche l\'erreur avec un bouton Réessayer (gestion des erreurs API)', async () => {
    const onRetry = jest.fn();
    render(
      <ProductList products={[]} loading={false} error="Service indisponible" onAdd={jest.fn()} onRetry={onRetry} />
    );

    expect(screen.getByText('Impossible de charger le catalogue')).toBeInTheDocument();
    expect(screen.getByText('Service indisponible')).toBeInTheDocument();

    await userEvent.click(screen.getByRole('button', { name: 'Réessayer' }));
    expect(onRetry).toHaveBeenCalledTimes(1);
  });

  it('affiche un état vide quand aucun produit ne correspond', () => {
    render(<ProductList products={[]} loading={false} error={null} onAdd={jest.fn()} onRetry={jest.fn()} />);

    expect(screen.getByText('Aucun produit ne correspond')).toBeInTheDocument();
  });
});
