import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import Panel from '../components/ui/Panel';

beforeEach(() => {
  window.localStorage.clear();
});

describe('Panel', () => {
  it('affiche le contenu par défaut et le replie au clic', async () => {
    render(
      <Panel title="Filtres" storageKey="jest-panel">
        <p>Contenu des filtres</p>
      </Panel>
    );

    expect(screen.getByText('Contenu des filtres')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /Filtres/ })).toHaveAttribute('aria-expanded', 'true');

    await userEvent.click(screen.getByRole('button', { name: /Filtres/ }));

    expect(screen.queryByText('Contenu des filtres')).not.toBeInTheDocument();
    expect(screen.getByRole('button', { name: /Filtres/ })).toHaveAttribute('aria-expanded', 'false');
    expect(window.localStorage.getItem('novatech.panel.jest-panel')).toBe('0');
  });

  it('restaure l\'état replié mémorisé', () => {
    window.localStorage.setItem('novatech.panel.jest-memo', '0');

    render(
      <Panel title="Tableau" storageKey="jest-memo" actions={<span>Action</span>}>
        <p>Lignes</p>
      </Panel>
    );

    expect(screen.queryByText('Lignes')).not.toBeInTheDocument();
    expect(screen.getByText('Action')).toBeInTheDocument();
  });
});
