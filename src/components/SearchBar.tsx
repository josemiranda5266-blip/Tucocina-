import React, { useState } from 'react';
import { Search, X } from 'lucide-react';

interface SearchBarProps {
  initialValue?: string;
  placeholder?: string;
  onSearch: (query: string) => void;
  className?: string;
}

export const SearchBar: React.FC<SearchBarProps> = ({
  initialValue = '',
  placeholder = '¿Qué querés cocinar hoy? (ej. pasta, milanesa, guiso)...',
  onSearch,
  className = '',
}) => {
  const [query, setQuery] = useState(initialValue);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onSearch(query.trim());
  };

  const handleClear = () => {
    setQuery('');
    onSearch('');
  };

  return (
    <form id="search-bar-form" onSubmit={handleSubmit} className={`relative w-full ${className}`}>
      <div className="relative flex items-center">
        <Search className="absolute left-4 w-5 h-5 text-stone-400 pointer-events-none" />
        <input
          id="search-input-field"
          type="text"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder={placeholder}
          className="w-full pl-12 pr-24 py-3.5 bg-white text-stone-900 placeholder-stone-400 border border-stone-300 rounded-2xl shadow-sm focus:outline-none focus:ring-2 focus:ring-amber-600 focus:border-amber-600 transition-all text-base"
        />
        {query && (
          <button
            type="button"
            onClick={handleClear}
            className="absolute right-20 text-stone-400 hover:text-stone-600 p-1"
          >
            <X className="w-4 h-4" />
          </button>
        )}
        <button
          id="search-submit-btn"
          type="submit"
          className="absolute right-2 bg-amber-600 hover:bg-amber-700 text-white font-medium px-4 py-2 rounded-xl text-sm transition-colors"
        >
          Buscar
        </button>
      </div>
    </form>
  );
};
