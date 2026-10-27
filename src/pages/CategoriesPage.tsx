import React, { useEffect, useState } from 'react';
import { Category, ContentVerticalId } from '../types';
import { CategoryCard } from '../components/CategoryCard';
import { AdSlot } from '../components/ads/AdSlot';
import { api } from '../services/api';
import { Utensils } from 'lucide-react';

interface CategoriesPageProps {
  onCategorySelect: (categoryId: string) => void;
}

export const CategoriesPage: React.FC<CategoriesPageProps> = ({ onCategorySelect }) => {
  const [categories, setCategories] = useState<Category[]>([]);
  const [verticalId, setVerticalId] = useState<ContentVerticalId>('COCINA');
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    api.getCategories(verticalId)
      .then(setCategories)
      .catch((err) => console.error('Error al cargar categorías:', err))
      .finally(() => setLoading(false));
  }, [verticalId]);

  return (
    <div className="space-y-6 pb-12">
      <div className="space-y-2">
        <div className="flex items-center space-x-3">
          <div className="p-2.5 bg-amber-100 text-amber-800 rounded-xl">
            <Utensils className="w-6 h-6" />
          </div>
          <h1 className="text-3xl font-extrabold font-serif text-stone-900">
            Categorías para aprender
          </h1>
        </div>
        <p className="text-stone-600 text-sm">Elegí un área y explorá videos prácticos para aprender a tu ritmo.</p>
        <div className="inline-flex flex-wrap gap-2 rounded-xl bg-stone-100 p-1">
          <button type="button" onClick={() => setVerticalId('COCINA')} aria-pressed={verticalId === 'COCINA'} className={`rounded-lg px-4 py-2 text-sm font-semibold ${verticalId === 'COCINA' ? 'bg-amber-700 text-white shadow-sm' : 'text-stone-700 hover:bg-white'}`}>Cocina y pastelería</button>
          <button type="button" onClick={() => setVerticalId('OFICIOS')} aria-pressed={verticalId === 'OFICIOS'} className={`rounded-lg px-4 py-2 text-sm font-semibold ${verticalId === 'OFICIOS' ? 'bg-amber-700 text-white shadow-sm' : 'text-stone-700 hover:bg-white'}`}>Otros oficios y habilidades</button>
        </div>
      </div>

      {/* Category AdSlot Placement (Inert when ads.enabled === false) */}
      <AdSlot placement="CATEGORY_TOP" />

      {loading ? (
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4 animate-pulse">
          {[...Array(12)].map((_, i) => (
            <div key={i} className="bg-stone-200 rounded-2xl h-32 w-full"></div>
          ))}
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
          {categories.map((cat) => (
            <CategoryCard
              key={cat.id}
              category={cat}
              onClick={() => onCategorySelect(cat.id)}
            />
          ))}
        </div>
      )}
    </div>
  );
};
