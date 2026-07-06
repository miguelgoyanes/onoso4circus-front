import { Link } from 'react-router-dom';
import './Breadcrumbs.css';

export interface Crumb {
  label: string;
  to?: string;
}

export function Breadcrumbs({ items }: { items: Crumb[] }) {
  return (
    <nav className="breadcrumbs" aria-label="Ruta de navegación">
      {items.map((item, index) => {
        const isLast = index === items.length - 1;
        return (
          <span key={index} className="breadcrumbs-item">
            {item.to && !isLast ? (
              <Link to={item.to} className="breadcrumbs-link">
                {item.label}
              </Link>
            ) : (
              <span className="breadcrumbs-current">{item.label}</span>
            )}
            {!isLast && <span className="breadcrumbs-separator">/</span>}
          </span>
        );
      })}
    </nav>
  );
}
