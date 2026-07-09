import { API_URL } from '../api/client';
import '../styles/crud-page.css';

export function urlImagen(imagenUrl: string | null | undefined): string | null {
  return imagenUrl ? `${API_URL}${imagenUrl}` : null;
}

export function ImagenPicker({
  previewUrl,
  onSelect,
}: {
  previewUrl: string | null;
  onSelect: (file: File) => void;
}) {
  return (
    <label className="imagen-picker">
      {previewUrl ? (
        <img src={previewUrl} alt="" className="imagen-picker-preview" />
      ) : (
        <span className="imagen-picker-placeholder">Sin imagen</span>
      )}
      <input
        type="file"
        accept="image/jpeg,image/png,image/webp"
        style={{ display: 'none' }}
        onChange={(e) => {
          const file = e.target.files?.[0];
          if (file) onSelect(file);
        }}
      />
      <span className="imagen-picker-label">{previewUrl ? 'Cambiar imagen' : 'Añadir imagen'}</span>
    </label>
  );
}
