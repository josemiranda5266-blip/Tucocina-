import React from 'react';
import { ChefHat, ExternalLink } from 'lucide-react';

export const Footer: React.FC = () => {
  return (
    <footer id="main-footer" className="bg-stone-900 text-stone-400 border-t border-stone-800 py-12 px-4 sm:px-6 lg:px-8 mt-auto">
      <div className="max-w-7xl mx-auto grid grid-cols-1 md:grid-cols-3 gap-8">
        
        {/* Column 1: Brand */}
        <div className="space-y-3">
          <div className="flex items-center space-x-2 text-stone-100 font-serif font-bold text-xl">
            <ChefHat className="w-6 h-6 text-amber-500" />
            <span>CO-Cocina</span>
          </div>
          <p className="text-sm text-stone-400 leading-relaxed">
            Plataforma web para descubrir, buscar y organizar los mejores videos de recetas de cocina alojados en plataformas externas como YouTube, Instagram y TikTok.
          </p>
        </div>

        {/* Column 2: Legal & External Notice */}
        <div className="space-y-2">
          <h4 className="text-stone-200 font-semibold text-sm tracking-wide">Aviso de Plataforma</h4>
          <p className="text-xs text-stone-500 leading-relaxed">
            CO-Cocina no aloja videos de terceros. Todos los contenidos multimedia permanecen alojados y son propiedad exclusiva de los creadores y plataformas originales.
          </p>
        </div>

        {/* Column 3: Navigation Links */}
        <div className="space-y-2 text-sm">
          <h4 className="text-stone-200 font-semibold text-sm tracking-wide">Plataformas Soportadas</h4>
          <ul className="space-y-1 text-xs text-stone-400">
            <li className="flex items-center space-x-1">
              <ExternalLink className="w-3 h-3 text-red-400" />
              <span>YouTube Recipes & Shorts</span>
            </li>
            <li className="flex items-center space-x-1">
              <ExternalLink className="w-3 h-3 text-pink-400" />
              <span>Instagram Reels</span>
            </li>
            <li className="flex items-center space-x-1">
              <ExternalLink className="w-3 h-3 text-teal-400" />
              <span>TikTok Videos</span>
            </li>
          </ul>
        </div>

      </div>

      <div className="max-w-7xl mx-auto mt-8 pt-6 border-t border-stone-800 text-center text-xs text-stone-500">
        <p>© {new Date().getFullYear()} CO-Cocina. Todos los derechos reservados.</p>
      </div>
    </footer>
  );
};
