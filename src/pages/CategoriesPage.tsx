import React, { useEffect, useState } from 'react';
import { Category } from '../types';
import { CategoryCard } from '../components/CategoryCard';
import { api } from '../services/api';
import { Utensils } from 'lucide-react';

interface CategoriesPageProps {
  onCategorySelect: (categoryId: string) => void;
}

export const CategoriesPage: React.FC<CategoriesPageProps> = ({ onCategorySelect }) => {
  const [categories, setCategories] = useState<Category[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    api.getCategories()
      .then(setCategories)
      .catch((err) => console.error('Error al cargar categorías:', err))
      .finally(() => setLoading(false));
  }, []);

  return (
    <div className="space-y-6 pb-12">
      <div className="space-y-2">
        <div className="flex items-center space-x-3">
          <div className="p-2.5 bg-amber-100 text-amber-800 rounded-xl">
            <Utensils className="w-6 h-6" />
          </div>
          <h1 className="text-3xl font-extrabold font-serif text-stone-900">
            Categorías Gastronómicas
          </h1>
        </div>
        <p className="text-stone-600 text-sm">
          Elegí tu tipo de cocina preferida para filtrar las recetas disponibles.
        </p>
      </div>

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
