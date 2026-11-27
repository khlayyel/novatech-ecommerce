import { render, screen, within } from '@testing-library/react';
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

const REPLY = 'Voici la réponse de l’assistant.';

beforeEach(() => {
  jest.clearAllMocks();
  mockAuth.user = null;

  mockedApi.getConversation.mockResolvedValue(null);
  mockedApi.startConversation.mockResolvedValue({
    id: 'conv-new',
    role: 'customer',
    title: '',
    messages: []
  });
  mockedApi.sendMessage.mockImplementation(async (conversationId, text) => ({
    conversationId: conversationId ?? 'conv-1',
    reply: REPLY,
    messages: [
      { role: 'user', text },
      { role: 'model', text: REPLY }
    ]
  }));
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
    await userEvent.click(within(dialog).getByRole('button', { name: /Quels écrans 4K/i }));

    expect(await within(dialog).findByText(REPLY)).toBeInTheDocument();
    expect(mockedApi.sendMessage).toHaveBeenCalledWith(
      null,
      'Quels écrans 4K avez-vous en stock ?'
    );
  });

  it('écrit un message libre et le transmet', async () => {
    render(<AssistantWidget />);

    const dialog = await openWidget();
    await userEvent.type(within(dialog).getByRole('textbox'), 'Avez-vous des claviers ?');
    await userEvent.click(within(dialog).getByRole('button', { name: /Envoyer/i }));

    expect(await within(dialog).findByText(REPLY)).toBeInTheDocument();
    expect(mockedApi.sendMessage).toHaveBeenCalledWith(null, 'Avez-vous des claviers ?');
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

  it('restaure la conversation persistée (rafraîchissement)', async () => {
    mockedApi.getConversation.mockResolvedValue({
      id: 'conv-old',
      role: 'customer',
      title: 'Bonjour',
      messages: [
        { role: 'user', text: 'Bonjour' },
        { role: 'model', text: 'Réponse sauvegardée' }
      ]
    });

    render(<AssistantWidget />);

    const dialog = await openWidget();

    expect(await within(dialog).findByText('Bonjour')).toBeInTheDocument();
    expect(within(dialog).getByText('Réponse sauvegardée')).toBeInTheDocument();
  });

  it('démarre une nouvelle conversation isolée', async () => {
    render(<AssistantWidget />);

    const dialog = await openWidget();
    await userEvent.type(within(dialog).getByRole('textbox'), 'Bonjour');
    await userEvent.click(within(dialog).getByRole('button', { name: /Envoyer/i }));
    await within(dialog).findByText(REPLY);

    await userEvent.click(within(dialog).getByRole('button', { name: /Nouvelle conversation/i }));

    expect(mockedApi.startConversation).toHaveBeenCalled();
    expect(within(dialog).queryByText(REPLY)).not.toBeInTheDocument();
    expect(within(dialog).getByText(/Bonjour !/)).toBeInTheDocument();
  });
});
