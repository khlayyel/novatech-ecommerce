import { render, screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import AssistantWidget from '../components/assistant/AssistantWidget';
import * as assistantApi from '../api/assistant';
import type { User } from '../types';

const mockAuth: { user: User | null } = { user: null };

jest.mock('../context/AuthContext', () => ({
  useAuth: () => ({ user: mockAuth.user })
}));
jest.mock('../api/assistant');

const mockedApi = jest.mocked(assistantApi);

const customerUser: User = { id: 'u1', name: 'Client', email: 'client@novatech.fr', role: 'customer' };
const adminUser: User = { id: 'a1', name: 'Admin', email: 'admin@novatech.fr', role: 'admin' };

beforeEach(() => {
  window.localStorage.clear();
  jest.clearAllMocks();
  mockAuth.user = null;
  mockedApi.sendChat.mockResolvedValue('Voici la réponse de l’assistant.');
});

const openWidget = async () => {
  await userEvent.click(screen.getByRole('button', { name: /Ouvrir l.assistant/i }));
  return screen.getByRole('dialog');
};

describe('AssistantWidget', () => {
  it('ouvre et ferme la fenêtre de discussion', async () => {
    render(<AssistantWidget />);

    const dialog = await openWidget();
    expect(within(dialog).getByText('Assistant boutique')).toBeInTheDocument();
    expect(within(dialog).getByText(/Bonjour !/)).toBeInTheDocument();

    await userEvent.click(within(dialog).getByRole('button', { name: /Fermer l.assistant/i }));
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
  });

  it('envoie une suggestion et affiche la réponse', async () => {
    mockAuth.user = customerUser;
    render(<AssistantWidget />);

    const dialog = await openWidget();
    await userEvent.click(
      within(dialog).getByRole('button', { name: /Quels écrans 4K/i })
    );

    expect(await within(dialog).findByText('Voici la réponse de l’assistant.')).toBeInTheDocument();
    expect(mockedApi.sendChat).toHaveBeenCalledWith([
      { role: 'user', text: 'Quels écrans 4K avez-vous en stock ?' }
    ]);
  });

  it('écrit un message libre et le transmet', async () => {
    render(<AssistantWidget />);

    const dialog = await openWidget();
    await userEvent.type(within(dialog).getByRole('textbox'), 'Avez-vous des claviers ?');
    await userEvent.click(within(dialog).getByRole('button', { name: /Envoyer/i }));

    expect(await within(dialog).findByText('Voici la réponse de l’assistant.')).toBeInTheDocument();
    expect(mockedApi.sendChat).toHaveBeenCalledWith([
      { role: 'user', text: 'Avez-vous des claviers ?' }
    ]);
  });

  it('conserve la conversation après un remontage (rafraîchissement)', async () => {
    const first = render(<AssistantWidget />);

    const dialog = await openWidget();
    await userEvent.type(within(dialog).getByRole('textbox'), 'Bonjour');
    await userEvent.click(within(dialog).getByRole('button', { name: /Envoyer/i }));
    await within(dialog).findByText('Voici la réponse de l’assistant.');

    await waitFor(() => {
      expect(window.localStorage.getItem('novatech.assistant.guest')).toContain('Bonjour');
    });

    first.unmount();
    render(<AssistantWidget />);

    const reopened = await openWidget();
    expect(within(reopened).getByText('Bonjour')).toBeInTheDocument();
    expect(within(reopened).getByText('Voici la réponse de l’assistant.')).toBeInTheDocument();
  });

  it('propose les questions analytiques à un administrateur', async () => {
    mockAuth.user = adminUser;
    render(<AssistantWidget />);

    const dialog = await openWidget();
    expect(within(dialog).getByText('Assistant administrateur')).toBeInTheDocument();
    expect(
      within(dialog).getByRole('button', { name: /Chiffre d.affaires des 7 derniers jours/i })
    ).toBeInTheDocument();
  });

  it('réinitialise la conversation', async () => {
    render(<AssistantWidget />);

    const dialog = await openWidget();
    await userEvent.type(within(dialog).getByRole('textbox'), 'Bonjour');
    await userEvent.click(within(dialog).getByRole('button', { name: /Envoyer/i }));
    await within(dialog).findByText('Voici la réponse de l’assistant.');

    await userEvent.click(within(dialog).getByRole('button', { name: /Nouvelle conversation/i }));

    expect(within(dialog).queryByText('Voici la réponse de l’assistant.')).not.toBeInTheDocument();
    expect(within(dialog).getByText(/Bonjour !/)).toBeInTheDocument();
  });
});
