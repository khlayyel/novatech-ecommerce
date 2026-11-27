import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import ProductCard from '../components/ProductCard';
import { formatPrice } from '../utils/format';
import type { Product } from '../types';

/** Matcher exact de prix : le formatage Intl contient un espace insécable
    (U+00A0) que le matcher texte par défaut de RTL ne normalise pas. */
const priceText = (amount: number) => (_content: string, element: Element | null) =>
  element?.textContent === formatPrice(amount);

const baseProduct: Product = {
  _id: 'p1',
  name: 'NovaGlide Pro',
  description: 'Souris sans fil 8000 DPI pour joueur exigeant.',
  price: 79,
  category: 'Périphériques',
  stock: 40,
  imageUrl: '/images/products/novaglide-pro.svg',
  createdAt: '2026-01-01T00:00:00.000Z',
  updatedAt: '2026-01-01T00:00:00.000Z'
};

describe('ProductCard', () => {
  it('affiche le nom, la description, le prix formaté et le stock', () => {
    render(<ProductCard product={baseProduct} onAdd={jest.fn()} />);

    expect(screen.getByText('NovaGlide Pro')).toBeInTheDocument();
    expect(screen.getByText(/Souris sans fil 8000 DPI/)).toBeInTheDocument();
    expect(screen.getByText(priceText(79))).toBeInTheDocument();
    expect(screen.getByText('En stock')).toBeInTheDocument();
    expect(screen.getByAltText('NovaGlide Pro')).toHaveAttribute(
      'src',
      '/images/products/novaglide-pro.svg'
    );
  });

  it('déclenche l\'ajout au panier au clic', async () => {
    const onAdd = jest.fn();
    render(<ProductCard product={baseProduct} onAdd={onAdd} />);

    await userEvent.click(screen.getByRole('button', { name: /Ajouter au panier/i }));

    expect(onAdd).toHaveBeenCalledTimes(1);
    expect(onAdd).toHaveBeenCalledWith(baseProduct);
  });

  it('désactive l\'ajout quand le produit est épuisé', () => {
    render(<ProductCard product={{ ...baseProduct, stock: 0 }} onAdd={jest.fn()} />);

    // « Épuisé » apparaît sur le ruban ET dans l'indice de stock.
    expect(screen.getAllByText('Épuisé')).toHaveLength(2);
    expect(screen.getByRole('button', { name: /Indisponible/i })).toBeDisabled();
  });

  it('signale un stock faible', () => {
    render(<ProductCard product={{ ...baseProduct, stock: 3 }} onAdd={jest.fn()} />);

    expect(screen.getByText(/Plus que 3 en stock/)).toBeInTheDocument();
  });
});
