import React from 'react';
import { ChefHat, ExternalLink, ShieldCheck, FileText, Cookie, Copyright, Mail } from 'lucide-react';

interface FooterProps {
  onNavigate?: (view: string, param?: string) => void;
}

export const Footer: React.FC<FooterProps> = ({ onNavigate }) => {
  const legalLink = (section: string) => { if (onNavigate) onNavigate('legal', section); };

  return (
    <footer id="main-footer" className="bg-stone-900 text-stone-400 border-t border-stone-800 py-12 px-4 sm:px-6 lg:px-8 mt-auto">
      <div className="max-w-7xl mx-auto grid grid-cols-1 md:grid-cols-3 gap-8">
        <div className="space-y-3">
          <div className="flex items-center space-x-2 text-stone-100 font-serif font-bold text-xl"><ChefHat className="w-6 h-6 text-amber-500" /><span>CociFlash</span></div>
          <p className="text-sm text-stone-400 leading-relaxed">Plataforma web para descubrir, buscar y organizar videos de recetas publicados en plataformas externas.</p>
        </div>
        <div className="space-y-2">
          <h4 className="text-stone-200 font-semibold text-sm tracking-wide">Contenido de terceros</h4>
          <p className="text-xs text-stone-500 leading-relaxed">CociFlash no reclama la propiedad de los videos de terceros. Las obras, marcas y contenidos pertenecen a sus respectivos titulares.</p>
        </div>
        <div className="space-y-2 text-sm">
          <h4 className="text-stone-200 font-semibold text-sm tracking-wide">Información legal</h4>
          <ul className="space-y-2 text-xs text-stone-400">
            <li><button type="button" onClick={() => onNavigate?.('contact')} className="inline-flex items-center gap-2 hover:text-white transition-colors"><Mail className="w-3.5 h-3.5" /> Contacto y reclamos</button></li>
            <li><button type="button" onClick={() => legalLink('privacy')} className="inline-flex items-center gap-2 hover:text-white transition-colors"><ShieldCheck className="w-3.5 h-3.5" /> Política de Privacidad</button></li>
            <li><button type="button" onClick={() => legalLink('terms')} className="inline-flex items-center gap-2 hover:text-white transition-colors"><FileText className="w-3.5 h-3.5" /> Términos de Uso</button></li>
            <li><button type="button" onClick={() => legalLink('cookies')} className="inline-flex items-center gap-2 hover:text-white transition-colors"><Cookie className="w-3.5 h-3.5" /> Cookies y Analítica</button></li>
            <li><button type="button" onClick={() => legalLink('content')} className="inline-flex items-center gap-2 hover:text-white transition-colors"><Copyright className="w-3.5 h-3.5" /> Contenido y Propiedad Intelectual</button></li>
          </ul>
        </div>
      </div>
      <div className="max-w-7xl mx-auto mt-8 pt-6 border-t border-stone-800 text-center text-xs text-stone-500">
        <p>© {new Date().getFullYear()} CociFlash. Todos los derechos reservados.</p>
        <p className="mt-2 inline-flex items-center gap-1 justify-center"><ExternalLink className="w-3 h-3" /> Los contenidos externos permanecen bajo las condiciones de sus plataformas de origen.</p>
      </div>
    </footer>
  );
};
