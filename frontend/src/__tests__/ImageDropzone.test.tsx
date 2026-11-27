import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import ImageDropzone from '../components/ui/ImageDropzone';
import * as adminApi from '../api/admin';

jest.mock('../api/admin');

const mockedAdmin = jest.mocked(adminApi);

const makeFile = (name = 'photo.png') =>
  new File([new Uint8Array([1, 2, 3, 4])], name, { type: 'image/png' });

beforeEach(() => {
  jest.clearAllMocks();
  mockedAdmin.uploadImage.mockResolvedValue('/api/media/1');
});

describe('ImageDropzone', () => {
  it('envoie un fichier déposé et remonte son URL', async () => {
    const onChange = jest.fn();
    const { container } = render(<ImageDropzone value={[]} onChange={onChange} max={5} />);

    const input = container.querySelector('input[type="file"]') as HTMLInputElement;
    fireEvent.change(input, { target: { files: [makeFile()] } });

    await waitFor(() => {
      expect(onChange).toHaveBeenCalledWith(['/api/media/1']);
    });
    expect(mockedAdmin.uploadImage).toHaveBeenCalledTimes(1);
  });

  it('refuse au-delà du maximum autorisé', async () => {
    const onChange = jest.fn();
    const { container } = render(
      <ImageDropzone value={['/api/media/1', '/api/media/2']} onChange={onChange} max={2} />
    );

    const input = container.querySelector('input[type="file"]') as HTMLInputElement;
    fireEvent.change(input, { target: { files: [makeFile()] } });

    expect(await screen.findByRole('alert')).toHaveTextContent('Maximum 2 image(s).');
    expect(onChange).not.toHaveBeenCalled();
  });

  it('retire une image de la liste', async () => {
    const onChange = jest.fn();
    render(<ImageDropzone value={['/api/media/1', '/api/media/2']} onChange={onChange} max={5} />);

    await userEvent.click(screen.getByRole('button', { name: /Retirer l.image 1/i }));

    expect(onChange).toHaveBeenCalledWith(['/api/media/2']);
  });

  it('affiche le compteur et le badge de visuel principal', () => {
    render(<ImageDropzone value={['/api/media/1']} onChange={jest.fn()} max={5} />);

    expect(screen.getByText('1/5 image(s)')).toBeInTheDocument();
    expect(screen.getByText('Principale')).toBeInTheDocument();
  });
});
