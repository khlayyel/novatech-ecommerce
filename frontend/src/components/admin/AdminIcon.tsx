import type { ReactNode } from 'react';

export type AdminIconName =
  | 'dashboard'
  | 'products'
  | 'categories'
  | 'stock'
  | 'orders'
  | 'users'
  | 'security'
  | 'store'
  | 'logout'
  | 'menu'
  | 'close'
  | 'collapse'
  | 'expand';

const ICONS: Record<AdminIconName, ReactNode> = {
  dashboard: (
    <>
      <rect x="3" y="3" width="7" height="8" rx="1.5" />
      <rect x="14" y="3" width="7" height="5" rx="1.5" />
      <rect x="14" y="12" width="7" height="9" rx="1.5" />
      <rect x="3" y="15" width="7" height="6" rx="1.5" />
    </>
  ),
  products: (
    <>
      <path d="M21 8.5 12 3 3 8.5v7L12 21l9-5.5z" />
      <path d="M3 8.5 12 14l9-5.5M12 14v7" />
    </>
  ),
  categories: (
    <>
      <path d="M4 6h6M4 12h10M4 18h7" />
      <path d="M17 3v6M14 6h6" />
      <circle cx="19" cy="18" r="2.5" />
    </>
  ),
  stock: (
    <>
      <path d="M3 7h18v10H3z" />
      <path d="M3 7l3-3h12l3 3M8 12h8" />
    </>
  ),
  orders: (
    <>
      <path d="M6 3h12l1.5 18h-15z" />
      <path d="M9 8h6M9 12h6M9 16h4" />
    </>
  ),
  users: (
    <>
      <circle cx="9" cy="8" r="3.2" />
      <path d="M3.5 20c.6-3.2 2.8-5 5.5-5s4.9 1.8 5.5 5" />
      <path d="M16 6.5a3 3 0 0 1 0 5.6M17 20c-.2-2.2-.9-3.9-2-5" />
    </>
  ),
  security: (
    <>
      <path d="M12 3l7 3v6c0 4.2-2.9 7.5-7 9-4.1-1.5-7-4.8-7-9V6z" />
      <path d="M9 12l2 2 4-4" />
    </>
  ),
  store: (
    <>
      <path d="M3 9l1.5-5h15L21 9" />
      <path d="M4 9v11h16V9" />
      <path d="M9 20v-6h6v6" />
    </>
  ),
  logout: (
    <>
      <path d="M15 4h4v16h-4" />
      <path d="M11 8l-4 4 4 4M3 12h8" />
    </>
  ),
  menu: <path d="M4 7h16M4 12h16M4 17h16" />,
  close: <path d="M6 6l12 12M18 6L6 18" />,
  collapse: (
    <>
      <rect x="3" y="4" width="18" height="16" rx="2" />
      <path d="M9 4v16" />
      <path d="M16 9l-3 3 3 3" />
    </>
  ),
  expand: (
    <>
      <rect x="3" y="4" width="18" height="16" rx="2" />
      <path d="M9 4v16" />
      <path d="M13 9l3 3-3 3" />
    </>
  )
};

const AdminIcon = ({ name, size = 18 }: { name: AdminIconName; size?: number }) => (
  <svg
    viewBox="0 0 24 24"
    width={size}
    height={size}
    fill="none"
    stroke="currentColor"
    strokeWidth="1.7"
    strokeLinecap="round"
    strokeLinejoin="round"
    aria-hidden="true"
    className="admin-icon"
  >
    {ICONS[name]}
  </svg>
);

export default AdminIcon;
