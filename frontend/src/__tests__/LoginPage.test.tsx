import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter } from 'react-router-dom';
import LoginPage from '../pages/LoginPage';
import { AuthProvider } from '../context/AuthContext';
import * as authApi from '../api/auth';

jest.mock('../api/auth');
jest.mock('react-router-dom', () => ({
  ...jest.requireActual('react-router-dom'),
  useNavigate: () => mockNavigate
}));

const mockedAuthApi = jest.mocked(authApi);
const mockNavigate = jest.fn();

const renderPage = (route = '/login') =>
  render(
    <MemoryRouter initialEntries={[route]}>
      <AuthProvider>
        <LoginPage />
      </AuthProvider>
    </MemoryRouter>
  );

describe('LoginPage', () => {
  beforeEach(() => {
    mockNavigate.mockClear();
    window.localStorage.clear();
    mockedAuthApi.fetchMe.mockReset();
    mockedAuthApi.login.mockReset();
  });

  it('valide la présence des champs (rendu conditionnel de l\'erreur)', async () => {
    renderPage();

    await userEvent.click(screen.getByRole('button', { name: /Se connecter/i }));

    expect(screen.getByRole('alert')).toHaveTextContent('Renseignez votre email et votre mot de passe.');
    expect(mockedAuthApi.login).not.toHaveBeenCalled();
  });

  it('connecte l\'utilisateur, stocke le jeton et redirige', async () => {
    mockedAuthApi.login.mockResolvedValue({
      token: 'jwt-test-123',
      user: { id: 'u1', name: 'Démo', email: 'demo@novatech.fr' }
    });

    renderPage();

    await userEvent.type(screen.getByLabelText(/Email/i), 'demo@novatech.fr');
    await userEvent.type(screen.getByLabelText(/Mot de passe/i), 'Demo1234!');
    await userEvent.click(screen.getByRole('button', { name: /Se connecter/i }));

    await waitFor(() => {
      expect(mockNavigate).toHaveBeenCalledWith('/', { replace: true });
    });

    expect(mockedAuthApi.login).toHaveBeenCalledWith('demo@novatech.fr', 'Demo1234!');
    expect(window.localStorage.getItem('novatech_token')).toBe('jwt-test-123');
  });

  it('affiche l\'erreur d\'identifiants renvoyée par l\'API', async () => {
    mockedAuthApi.login.mockRejectedValue(new Error('Identifiants incorrects'));

    renderPage();

    await userEvent.type(screen.getByLabelText(/Email/i), 'demo@novatech.fr');
    await userEvent.type(screen.getByLabelText(/Mot de passe/i), 'FauxMotDePasse');
    await userEvent.click(screen.getByRole('button', { name: /Se connecter/i }));

    expect(await screen.findByRole('alert')).toHaveTextContent('Identifiants incorrects');
    expect(mockNavigate).not.toHaveBeenCalled();
  });

  it('pré-remplit le formulaire avec le compte de démonstration', async () => {
    renderPage();

    await userEvent.click(screen.getByRole('button', { name: /compte de démonstration/i }));

    expect(screen.getByLabelText(/Email/i)).toHaveValue('demo@novatech.fr');
    expect(screen.getByLabelText(/Mot de passe/i)).toHaveValue('Demo1234!');
  });
});
