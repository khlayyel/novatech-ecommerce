import type { ReactNode } from 'react';

export type IconButtonName = 'edit' | 'delete';

const ICONS: Record<IconButtonName, ReactNode> = {
  edit: (
    <>
      <path d="M4 20h4L18.5 9.5a2.1 2.1 0 0 0-3-3L5 17z" />
      <path d="M13.5 6.5l4 4" />
    </>
  ),
  delete: (
    <>
      <path d="M4 7h16" />
      <path d="M9 7V5h6v2" />
      <path d="M6 7l1 13h10l1-13" />
      <path d="M10 11v6M14 11v6" />
    </>
  )
};

interface IconButtonProps {
  icon: IconButtonName;
  label: string;
  onClick: () => void;
  tone?: 'default' | 'danger';
  disabled?: boolean;
}

/** Bouton d'action compact à icône, avec libellé accessible et infobulle. */
const IconButton = ({ icon, label, onClick, tone = 'default', disabled = false }: IconButtonProps) => (
  <button
    type="button"
    className={`icon-btn${tone === 'danger' ? ' icon-btn--danger' : ''}`}
    onClick={onClick}
    aria-label={label}
    title={label}
    disabled={disabled}
  >
    <svg
      viewBox="0 0 24 24"
      width="17"
      height="17"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.8"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
    >
      {ICONS[icon]}
    </svg>
  </button>
);

export default IconButton;
