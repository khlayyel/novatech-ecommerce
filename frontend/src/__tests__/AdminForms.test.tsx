import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter, Route, Routes } from 'react-router-dom';
import AdminProductFormPage from '../pages/admin/AdminProductFormPage';
import AdminCategoryFormPage from '../pages/admin/AdminCategoryFormPage';
import * as adminApi from '../api/admin';
import * as productsApi from '../api/products';

jest.mock('../api/admin');
jest.mock('../api/products');
jest.mock('../context/ToastContext', () => ({
  useToast: () => ({ showToast: jest.fn() })
}));

const mockedAdmin = jest.mocked(adminApi);
const mockedProducts = jest.mocked(productsApi);

const categoryTree = [
  {
    _id: 'c1',
    name: 'Ordinateurs',
    description: 'Portables et tours',
    subcategories: ['Portables', 'Bureaux'],
    createdAt: '2026-01-01T00:00:00.000Z',
    updatedAt: '2026-01-01T00:00:00.000Z'
  }
];

const product = {
  _id: 'p1',
  name: 'NovaBook Pro 14',
  description: 'Ultraportable professionnel.',
  price: 1299,
  category: 'Ordinateurs',
  subcategory: 'Portables',
  stock: 12,
  imageUrl: '/images/products/novabook-pro-14.svg',
  createdAt: '2026-01-01T00:00:00.000Z',
  updatedAt: '2026-01-01T00:00:00.000Z'
};

beforeEach(() => {
  window.localStorage.clear();
  jest.clearAllMocks();
  mockedAdmin.listCategories.mockResolvedValue(categoryTree);
  mockedAdmin.updateProduct.mockResolvedValue(product);
  mockedAdmin.updateCategory.mockResolvedValue(categoryTree[0]);
});

describe('Formulaire produit (page dédiée)', () => {
  it('préremplit les champs avec le produit existant et enregistre', async () => {
    mockedProducts.getProduct.mockResolvedValue(product);

    render(
      <MemoryRouter initialEntries={['/admin/products/p1/edit']}>
        <Routes>
          <Route path="/admin/products/:id/edit" element={<AdminProductFormPage />} />
          <Route path="/admin/products" element={<p>LISTE PRODUITS</p>} />
        </Routes>
      </MemoryRouter>
    );

    expect(await screen.findByDisplayValue('NovaBook Pro 14')).toBeInTheDocument();
    expect(screen.getByDisplayValue('1299')).toBeInTheDocument();
    expect(screen.getByDisplayValue('12')).toBeInTheDocument();
    expect(screen.getByDisplayValue('Ultraportable professionnel.')).toBeInTheDocument();

    await userEvent.click(screen.getByRole('button', { name: /Enregistrer les modifications/i }));

    await waitFor(() => {
      expect(mockedAdmin.updateProduct).toHaveBeenCalledWith(
        'p1',
        expect.objectContaining({ name: 'NovaBook Pro 14', price: 1299, stock: 12 })
      );
    });

    expect(await screen.findByText('LISTE PRODUITS')).toBeInTheDocument();
  });
});

describe('Formulaire catégorie (page dédiée)', () => {
  it('préremplit la famille et enregistre les sous-familles', async () => {
    mockedAdmin.getCategory.mockResolvedValue({
      ...categoryTree[0],
      subcategories: ['Portables', 'Bureaux']
    });

    render(
      <MemoryRouter initialEntries={['/admin/categories/c1/edit']}>
        <Routes>
          <Route path="/admin/categories/:id/edit" element={<AdminCategoryFormPage />} />
          <Route path="/admin/categories" element={<p>LISTE CATÉGORIES</p>} />
        </Routes>
      </MemoryRouter>
    );

    expect(await screen.findByDisplayValue('Ordinateurs')).toBeInTheDocument();
    expect(screen.getByDisplayValue('Portables, Bureaux')).toBeInTheDocument();

    await userEvent.click(screen.getByRole('button', { name: /Enregistrer les modifications/i }));

    await waitFor(() => {
      expect(mockedAdmin.updateCategory).toHaveBeenCalledWith(
        'c1',
        expect.objectContaining({
          name: 'Ordinateurs',
          subcategories: ['Portables', 'Bureaux']
        })
      );
    });

    expect(await screen.findByText('LISTE CATÉGORIES')).toBeInTheDocument();
  });
});
