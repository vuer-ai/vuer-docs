import { useId, useState } from 'react';
import './catalog.css';

export type CatalogEntry = {
  title: string;
  href: string;
  category: string;
  description: string;
};

/** Category buttons filter one catalog; entering a query searches every category. */
export function Catalog({ label, categories, entries }: {
  label: string;
  categories: string[];
  entries: CatalogEntry[];
}) {
  const id = useId();
  const [category, setCategory] = useState('All');
  const [query, setQuery] = useState('');
  const terms = query.trim().toLocaleLowerCase().split(/\s+/).filter(Boolean);
  const searching = terms.length > 0;
  const shown = entries.filter((entry) => searching
    ? terms.every((term) => `${entry.title} ${entry.description} ${entry.category}`.toLocaleLowerCase().includes(term))
    : category === 'All' || entry.category === category);

  return <section className="doc-catalog" aria-label={label}>
    <label className="doc-catalog-search-label" htmlFor={`${id}-search`}>Search {label.toLowerCase()}</label>
    <input id={`${id}-search`} className="doc-catalog-search" type="search"
      placeholder={`Search all ${label.toLowerCase()}…`} value={query}
      onChange={(event) => setQuery(event.target.value)} aria-controls={`${id}-results`} />
    <div className="doc-catalog-filters" role="group" aria-label={`${label} categories`}>
      {['All', ...categories].map((item) => <button type="button" key={item}
        aria-pressed={searching ? item === 'All' : category === item}
        aria-controls={`${id}-results`}
        onClick={() => { setCategory(item); setQuery(''); }}>
        {item}<span aria-hidden="true">{item === 'All' ? entries.length : entries.filter((entry) => entry.category === item).length}</span>
      </button>)}
    </div>
    <p className="doc-catalog-count" role="status" aria-live="polite">
      {shown.length} {shown.length === 1 ? 'result' : 'results'}{searching ? ' across all categories' : category !== 'All' ? ` in ${category}` : ''}
    </p>
    <ul className="doc-catalog-grid" id={`${id}-results`}>
      {shown.map((entry) => <li key={entry.href}>
        <a className="doc-catalog-card" href={entry.href}>
          <span className="doc-catalog-category">{entry.category}</span>
          <strong>{entry.title}<span aria-hidden="true"> ↗</span></strong>
          <span className="doc-catalog-description">{entry.description}</span>
        </a>
      </li>)}
    </ul>
    {shown.length === 0 && <p>No matches. Try a component name or a topic such as “camera”.</p>}
  </section>;
}
