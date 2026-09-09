import React from 'react';
import { Category, VideoPlatform } from '../types';
import { Filter, SlidersHorizontal } from 'lucide-react';

interface FilterBarProps {
  categories: Category[];
  selectedCategory: string;
  selectedPlatform: VideoPlatform | '';
  selectedSort: 'recent' | 'views';
  onCategoryChange: (catId: string) => void;
  onPlatformChange: (platform: VideoPlatform | '') => void;
  onSortChange: (sort: 'recent' | 'views') => void;
  onReset: () => void;
}

export const FilterBar: React.FC<FilterBarProps> = ({
  categories,
  selectedCategory,
  selectedPlatform,
  selectedSort,
  onCategoryChange,
  onPlatformChange,
  onSortChange,
  onReset,
}) => {
  const hasActiveFilters = selectedCategory || selectedPlatform || selectedSort !== 'recent';

  return (
    <div id="filter-bar" className="bg-white p-4 rounded-2xl border border-stone-200/80 shadow-sm space-y-4 mb-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        
        <div className="flex items-center space-x-2 text-stone-800 font-bold text-sm">
          <SlidersHorizontal className="w-4 h-4 text-amber-600" />
          <span>Filtrar Recetas</span>
        </div>

        {hasActiveFilters && (
          <button
            onClick={onReset}
            className="text-xs text-amber-700 hover:text-amber-900 font-semibold underline"
          >
            Limpiar filtros
          </button>
        )}

      </div>

      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 pt-2 border-t border-stone-100">
        
        {/* Category Filter */}
        <div>
          <label className="block text-xs font-semibold text-stone-600 mb-1">Categoría</label>
          <select
            value={selectedCategory}
            onChange={(e) => onCategoryChange(e.target.value)}
            className="w-full bg-stone-50 border border-stone-300 rounded-xl px-3 py-2 text-sm text-stone-800 focus:outline-none focus:ring-2 focus:ring-amber-600"
          >
            <option value="">Todas las categorías</option>
            {categories.map((cat) => (
              <option key={cat.id} value={cat.id}>
                {cat.name}
              </option>
            ))}
          </select>
        </div>

        {/* Platform Filter */}
        <div>
          <label className="block text-xs font-semibold text-stone-600 mb-1">Plataforma</label>
          <select
            value={selectedPlatform}
            onChange={(e) => onPlatformChange(e.target.value as VideoPlatform | '')}
            className="w-full bg-stone-50 border border-stone-300 rounded-xl px-3 py-2 text-sm text-stone-800 focus:outline-none focus:ring-2 focus:ring-amber-600"
          >
            <option value="">Todas las plataformas</option>
            <option value="YOUTUBE">YouTube</option>
            <option value="INSTAGRAM">Instagram</option>
            <option value="TIKTOK">TikTok</option>
          </select>
        </div>

        {/* Sort Filter */}
        <div>
          <label className="block text-xs font-semibold text-stone-600 mb-1">Ordenar por</label>
          <select
            value={selectedSort}
            onChange={(e) => onSortChange(e.target.value as 'recent' | 'views')}
            className="w-full bg-stone-50 border border-stone-300 rounded-xl px-3 py-2 text-sm text-stone-800 focus:outline-none focus:ring-2 focus:ring-amber-600"
          >
            <option value="recent">Más recientes</option>
            <option value="views">Más vistos</option>
          </select>
        </div>

      </div>
    </div>
  );
};
