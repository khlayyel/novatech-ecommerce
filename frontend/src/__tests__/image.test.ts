import { imageSrc } from '../utils/image';
import { API_URL } from '../config';

const ORIGIN = API_URL.replace(/\/api$/, '');

describe('imageSrc', () => {
  it('résout les médias uploadés vers l\'API', () => {
    expect(imageSrc('/api/media/abc123')).toBe(`${ORIGIN}/api/media/abc123`);
  });

  it('laisse intacts les visuels publics et gère les valeurs vides', () => {
    expect(imageSrc('/images/products/novabook-pro-14.svg')).toBe('/images/products/novabook-pro-14.svg');
    expect(imageSrc('')).toBe('');
    expect(imageSrc(undefined)).toBe('');
  });
});
