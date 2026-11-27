import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter, Route, Routes } from 'react-router-dom';
import ProductDetailPage from '../pages/ProductDetailPage';
import { formatPrice } from '../utils/format';
import type { Product } from '../types';

const mockGetProduct = jest.fn();
const mockListProducts = jest.fn();
const mockAddToCart = jest.fn();
const mockShowToast = jest.fn();

jest.mock('../api/products', () => ({
  getProduct: (...args: unknown[]) => mockGetProduct(...args),
  listProducts: (...args: unknown[]) => mockListProducts(...args),
  listCategories: jest.fn().mockResolvedValue([])
}));

jest.mock('../context/CartContext', () => ({
  useCart: () => ({ addToCart: mockAddToCart, totalItems: 0 })
}));

jest.mock('../context/ToastContext', () => ({
  useToast: () => ({ showToast: mockShowToast })
}));

const product: Product = {
  _id: 'p-detail-1',
  name: 'ClearView 27" 4K',
  description: 'Écran 27 pouces 4K UHD avec dalle IPS.',
  price: 449,
  category: 'Écrans',
  stock: 9,
  imageUrl: '/images/products/clearview-27-4k.svg',
  createdAt: '2026-01-01T00:00:00.000Z',
  updatedAt: '2026-01-01T00:00:00.000Z'
};

const renderPage = () =>
  render(
    <MemoryRouter initialEntries={['/products/p-detail-1']}>
      <Routes>
        <Route path="/products/:id" element={<ProductDetailPage />} />
      </Routes>
    </MemoryRouter>
  );

const priceText = (amount: number) => (_content: string, element: Element | null) =>
  element?.textContent === formatPrice(amount);

beforeEach(() => {
  mockGetProduct.mockReset();
  mockListProducts.mockReset();
  mockAddToCart.mockReset();
  mockShowToast.mockReset();
  mockListProducts.mockResolvedValue({ products: [], total: 0, page: 1, pages: 1 });
});

describe('ProductDetailPage', () => {
  it('affiche la fiche complète du produit', async () => {
    mockGetProduct.mockResolvedValue(product);

    renderPage();

    expect(await screen.findByRole('heading', { name: 'ClearView 27" 4K' })).toBeInTheDocument();
    expect(screen.getByText(/dalle IPS/)).toBeInTheDocument();
    expect(screen.getByText(priceText(449))).toBeInTheDocument();
    expect(screen.getByText('9 en stock')).toBeInTheDocument();
    expect(mockGetProduct).toHaveBeenCalledWith('p-detail-1');
  });

  it('ajoute la quantité choisie au panier', async () => {
    mockGetProduct.mockResolvedValue(product);
    mockAddToCart.mockResolvedValue(undefined);

    renderPage();

    await screen.findByRole('heading', { name: 'ClearView 27" 4K' });

    await userEvent.click(screen.getByRole('button', { name: /Augmenter la quantité/i }));
    await userEvent.click(screen.getByRole('button', { name: /Ajouter au panier/i }));

    expect(mockAddToCart).toHaveBeenCalledWith('p-detail-1', 2);
    expect(mockShowToast).toHaveBeenCalled();
  });

  it('affiche la galerie et change l\'image principale', async () => {
    mockGetProduct.mockResolvedValue({
      ...product,
      imageUrls: ['/api/media/a', '/api/media/b']
    });

    renderPage();

    const thumbs = await screen.findAllByRole('button', { name: /Voir l.image/i });
    expect(thumbs).toHaveLength(2);

    const mainImage = screen.getByRole('img', { name: 'ClearView 27" 4K' });
    expect(mainImage.getAttribute('src')).toMatch(/\/api\/media\/a$/);

    await userEvent.click(thumbs[1]);

    expect(mainImage.getAttribute('src')).toMatch(/\/api\/media\/b$/);
    expect(thumbs[1]).toHaveAttribute('aria-pressed', 'true');
  });

  it('affiche un état d\'erreur pour un produit inconnu', async () => {
    mockGetProduct.mockRejectedValue(new Error('Produit introuvable'));

    renderPage();

    expect(await screen.findByText(/Produit indisponible/i)).toBeInTheDocument();
  });

  it('désactive l\'achat quand le stock est épuisé', async () => {
    mockGetProduct.mockResolvedValue({ ...product, stock: 0 });

    renderPage();

    expect(await screen.findByRole('button', { name: /Indisponible/i })).toBeDisabled();
  });
});
