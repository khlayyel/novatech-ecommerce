import { useRef, useState } from 'react';
import { uploadImage } from '../../api/admin';
import { getErrorMessage } from '../../utils/request';

interface ImageDropzoneProps {
  value: string[];
  onChange: (urls: string[]) => void;
  max?: number;
  label?: string;
  hint?: string;
}

const ACCEPT = 'image/png,image/jpeg,image/webp,image/gif';
const MAX_BYTES = 2 * 1024 * 1024;

/**
 * Zone de glisser-déposer réutilisable (produits, familles, sous-familles).
 * Upload réel vers l'API, aperçus, suppression et réordonnancement par glisser.
 */
const ImageDropzone = ({ value, onChange, max = 1, label = 'Images', hint }: ImageDropzoneProps) => {
  const inputRef = useRef<HTMLInputElement>(null);
  const [dragging, setDragging] = useState(false);
  const [uploading, setUploading] = useState(0);
  const [error, setError] = useState<string | null>(null);

  const addFiles = async (files: FileList | File[]) => {
    const list = Array.from(files);
    let remaining = max - value.length;

    if (remaining <= 0) {
      setError(`Maximum ${max} image(s).`);
      return;
    }

    setError(null);
    const accepted: File[] = [];

    for (const file of list) {
      if (remaining <= 0) break;
      if (!file.type.startsWith('image/')) {
        setError('Seules les images sont acceptées.');
        continue;
      }
      if (file.size > MAX_BYTES) {
        setError('Chaque image doit faire moins de 2 Mo.');
        continue;
      }
      accepted.push(file);
      remaining -= 1;
    }

    if (accepted.length === 0) return;

    setUploading(accepted.length);
    try {
      const urls: string[] = [];
      for (const file of accepted) {
        urls.push(await uploadImage(file));
      }
      onChange([...value, ...urls]);
    } catch (err) {
      setError(getErrorMessage(err, 'Envoi de l’image impossible.'));
    } finally {
      setUploading(0);
    }
  };

  const removeAt = (index: number) => onChange(value.filter((_, position) => position !== index));

  const move = (from: number, to: number) => {
    if (to < 0 || to >= value.length || from === to) return;
    const next = [...value];
    const [item] = next.splice(from, 1);
    next.splice(to, 0, item);
    onChange(next);
  };

  return (
    <div className="dropzone-field">
      <span className="field__label">{label}</span>

      <div
        className={`dropzone${dragging ? ' dropzone--over' : ''}`}
        role="button"
        tabIndex={0}
        onClick={() => inputRef.current?.click()}
        onKeyDown={(event) => {
          if (event.key === 'Enter' || event.key === ' ') inputRef.current?.click();
        }}
        onDragOver={(event) => {
          event.preventDefault();
          setDragging(true);
        }}
        onDragLeave={() => setDragging(false)}
        onDrop={(event) => {
          event.preventDefault();
          setDragging(false);
          addFiles(event.dataTransfer.files);
        }}
      >
        <input
          ref={inputRef}
          type="file"
          accept={ACCEPT}
          multiple={max > 1}
          hidden
          onChange={(event) => {
            if (event.target.files) addFiles(event.target.files);
            event.target.value = '';
          }}
        />

        <svg viewBox="0 0 24 24" width="22" height="22" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
          <rect x="3" y="4" width="18" height="16" rx="2" />
          <circle cx="8.5" cy="9" r="1.5" />
          <path d="M21 15l-5-5L5 20" />
        </svg>
        <strong>Glissez vos images ici</strong>
        <small>ou cliquez pour parcourir · PNG, JPEG, WebP, GIF · 2 Mo max</small>
        <small>{value.length}/{max} image(s)</small>
      </div>

      {uploading > 0 && <p className="muted small">Envoi de {uploading} image(s)…</p>}
      {error && <p className="form-error" role="alert">{error}</p>}

      {value.length > 0 && (
        <ul className="dropzone-grid">
          {value.map((url, index) => (
            <li
              key={`${url}-${index}`}
              className="dropzone-item"
              draggable={max > 1}
              onDragStart={(event) => event.dataTransfer.setData('text/plain', String(index))}
              onDragOver={(event) => event.preventDefault()}
              onDrop={(event) => {
                event.preventDefault();
                const from = Number(event.dataTransfer.getData('text/plain'));
                if (Number.isInteger(from)) move(from, index);
              }}
            >
              <img src={url} alt="" />
              {index === 0 && <span className="dropzone-item__badge">Principale</span>}
              <button
                type="button"
                className="dropzone-item__remove"
                aria-label={`Retirer l’image ${index + 1}`}
                title="Retirer"
                onClick={(event) => {
                  event.stopPropagation();
                  removeAt(index);
                }}
              >
                ×
              </button>
            </li>
          ))}
        </ul>
      )}

      {hint && <p className="muted small">{hint}</p>}
    </div>
  );
};

export default ImageDropzone;
