import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter } from 'react-router-dom';
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

interface ListProps {
  products: Product[];
  loading: boolean;
  error: string | null;
  onRetry: () => void;
}

const renderList = (props: ListProps) =>
  render(
    <MemoryRouter>
      <ProductList {...props} onAdd={jest.fn()} />
    </MemoryRouter>
  );

describe('ProductList', () => {
  it('affiche des cartes pendant le chargement (rendu conditionnel)', () => {
    const { container } = renderList({ products: [], loading: true, error: null, onRetry: jest.fn() });

    expect(container.querySelectorAll('.skeleton-card')).toHaveLength(6);
  });

  it('affiche les cartes produits une fois chargées', () => {
    renderList({ products, loading: false, error: null, onRetry: jest.fn() });

    expect(screen.getByText('NovaBook Pro 14')).toBeInTheDocument();
    expect(screen.getByText('NovaKey TKL')).toBeInTheDocument();
  });

  it('affiche l\'erreur avec un bouton Réessayer (gestion des erreurs API)', async () => {
    const onRetry = jest.fn();
    renderList({ products: [], loading: false, error: 'Service indisponible', onRetry });

    expect(screen.getByText('Impossible de charger le catalogue')).toBeInTheDocument();
    expect(screen.getByText('Service indisponible')).toBeInTheDocument();

    await userEvent.click(screen.getByRole('button', { name: 'Réessayer' }));
    expect(onRetry).toHaveBeenCalledTimes(1);
  });

  it('affiche un état vide quand aucun produit ne correspond', () => {
    renderList({ products: [], loading: false, error: null, onRetry: jest.fn() });

    expect(screen.getByText('Aucun produit ne correspond')).toBeInTheDocument();
  });
});
