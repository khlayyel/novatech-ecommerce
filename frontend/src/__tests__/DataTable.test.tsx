import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import DataTable from '../components/ui/DataTable';
import type { Column } from '../components/ui/DataTable';

interface Row {
  id: string;
  name: string;
  value: number;
}

const rows: Row[] = Array.from({ length: 25 }, (_, index) => ({
  id: `r${index}`,
  name: `Produit ${String(index).padStart(2, '0')}`,
  value: index
}));

const columns: Column<Row>[] = [
  { key: 'name', label: 'Nom' },
  { key: 'value', label: 'Valeur', align: 'right' }
];

const renderTable = (data: Row[] = rows) =>
  render(<DataTable columns={columns} rows={data} rowKey={(row) => row.id} pageSizeKey="jest" />);

beforeEach(() => {
  window.localStorage.clear();
});

describe('DataTable', () => {
  it('affiche 10 lignes par défaut avec le compteur de pagination', () => {
    renderTable();

    // 1 en-tête + 10 lignes
    expect(screen.getAllByRole('row')).toHaveLength(11);
    expect(screen.getByText(/1.10 sur 25/)).toBeInTheDocument();
    expect(screen.getByRole('combobox')).toHaveValue('10');
  });

  it('change de page avec les boutons de pagination', async () => {
    renderTable();

    await userEvent.click(screen.getByRole('button', { name: 'Page suivante' }));

    expect(screen.getByText(/11.20 sur 25/)).toBeInTheDocument();
    expect(screen.getAllByRole('row')[1]).toHaveTextContent('Produit 10');
  });

  it('trie par clic sur l\'en-tête, dans les deux sens', async () => {
    renderTable();

    await userEvent.click(screen.getByRole('button', { name: /Valeur/ }));
    expect(screen.getAllByRole('row')[1]).toHaveTextContent('Produit 00');

    await userEvent.click(screen.getByRole('button', { name: /Valeur/ }));
    expect(screen.getAllByRole('row')[1]).toHaveTextContent('Produit 24');
  });

  it('respecte la taille de page choisie et la mémorise', async () => {
    renderTable();

    await userEvent.selectOptions(screen.getByRole('combobox'), '5');

    expect(screen.getAllByRole('row')).toHaveLength(6);
    expect(screen.getByText(/1.5 sur 25/)).toBeInTheDocument();
    expect(window.localStorage.getItem('novatech.table.jest.size')).toBe('5');
  });

  it('filtre en temps réel via la recherche intégrée au tableau', async () => {
    renderTable();

    const search = screen.getByRole('searchbox');
    await userEvent.type(search, 'Produit 05');

    expect(screen.getAllByRole('row')).toHaveLength(2);
    expect(screen.getByText(/1.1 sur 1/)).toBeInTheDocument();

    await userEvent.clear(search);

    expect(screen.getAllByRole('row')).toHaveLength(11);
  });

  it('affiche le message vide quand aucune ligne ne correspond', () => {
    render(<DataTable columns={columns} rows={[]} rowKey={(row) => row.id} emptyLabel="Rien à afficher." />);

    expect(screen.getByText('Rien à afficher.')).toBeInTheDocument();
  });
});
