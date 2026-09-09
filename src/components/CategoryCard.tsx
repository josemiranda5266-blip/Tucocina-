import React from 'react';
import { Category } from '../types';
import {
  Beef,
  Drumstick,
  Utensils,
  CookingPot,
  Cake,
  Croissant,
  Coffee,
  Salad,
  Soup,
  Pizza,
  Apple,
  Flame,
  Globe,
} from 'lucide-react';

interface CategoryCardProps {
  category: Category;
  onClick: (category: Category) => void;
}

const ICON_MAP: Record<string, React.ReactNode> = {
  Beef: <Beef className="w-6 h-6" />,
  Drumstick: <Drumstick className="w-6 h-6" />,
  Utensils: <Utensils className="w-6 h-6" />,
  CookingPot: <CookingPot className="w-6 h-6" />,
  Cake: <Cake className="w-6 h-6" />,
  Croissant: <Croissant className="w-6 h-6" />,
  Coffee: <Coffee className="w-6 h-6" />,
  Salad: <Salad className="w-6 h-6" />,
  Soup: <Soup className="w-6 h-6" />,
  Pizza: <Pizza className="w-6 h-6" />,
  Apple: <Apple className="w-6 h-6" />,
  Flame: <Flame className="w-6 h-6" />,
  Globe: <Globe className="w-6 h-6" />,
};

export const CategoryCard: React.FC<CategoryCardProps> = ({ category, onClick }) => {
  return (
    <div
      id={`cat-card-${category.id}`}
      onClick={() => onClick(category)}
      className="group bg-white p-5 rounded-2xl border border-stone-200/80 shadow-sm hover:shadow-lg hover:border-amber-400 hover:-translate-y-1 transition-all cursor-pointer flex flex-col justify-between"
    >
      <div className="flex items-center space-x-3 mb-3">
        <div className="p-3 rounded-xl bg-amber-100 text-amber-800 group-hover:bg-amber-600 group-hover:text-white transition-colors">
          {ICON_MAP[category.icon || 'Utensils'] || <Utensils className="w-6 h-6" />}
        </div>
        <h3 className="font-bold text-stone-900 text-base font-serif group-hover:text-amber-800 transition-colors">
          {category.name}
        </h3>
      </div>
      {category.description && (
        <p className="text-xs text-stone-500 line-clamp-2 leading-relaxed">
          {category.description}
        </p>
      )}
    </div>
  );
};
