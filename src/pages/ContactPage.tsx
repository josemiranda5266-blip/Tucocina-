import React from 'react';
import { Mail, ShieldCheck, Copyright, HelpCircle } from 'lucide-react';

interface ContactPageProps {
  onNavigate: (view: string, param?: string) => void;
}

const CONTACT_EMAIL = 'contacto@cociflash.com';

export const ContactPage: React.FC<ContactPageProps> = ({ onNavigate }) => (
  <section className="max-w-3xl mx-auto">
    <div className="rounded-2xl bg-white border border-stone-200 shadow-sm p-6 sm:p-8">
      <div className="flex items-start gap-4">
        <div className="rounded-xl bg-amber-100 p-3 text-amber-800"><Mail className="w-6 h-6" /></div>
        <div>
          <p className="text-xs font-bold uppercase tracking-wider text-amber-700">CociFlash</p>
          <h1 className="mt-1 text-2xl sm:text-3xl font-bold text-stone-900">Contacto y reclamos</h1>
          <p className="mt-2 text-stone-600 leading-relaxed">Este canal sirve para consultas generales, privacidad, solicitudes de eliminación de datos y reclamos relacionados con contenido o derechos de propiedad intelectual.</p>
        </div>
      </div>

      <a href={`mailto:${CONTACT_EMAIL}`} className="mt-7 flex items-center justify-between gap-4 rounded-xl border border-amber-200 bg-amber-50 p-4 text-amber-900 hover:bg-amber-100 transition-colors">
        <div>
          <p className="text-xs font-semibold uppercase tracking-wide text-amber-700">Canal oficial</p>
          <p className="mt-1 font-bold break-all">{CONTACT_EMAIL}</p>
        </div>
        <Mail className="w-5 h-5 shrink-0" />
      </a>

      <div className="mt-7 grid gap-4 sm:grid-cols-3">
        <div className="rounded-xl border border-stone-200 p-4"><ShieldCheck className="w-5 h-5 text-amber-700" /><h2 className="mt-2 font-semibold text-stone-900">Privacidad</h2><p className="mt-1 text-xs text-stone-600">Acceso, rectificación, actualización o supresión de datos personales.</p></div>
        <div className="rounded-xl border border-stone-200 p-4"><Copyright className="w-5 h-5 text-amber-700" /><h2 className="mt-2 font-semibold text-stone-900">Contenido</h2><p className="mt-1 text-xs text-stone-600">Avisos de titulares sobre videos, marcas o derechos de propiedad intelectual.</p></div>
        <div className="rounded-xl border border-stone-200 p-4"><HelpCircle className="w-5 h-5 text-amber-700" /><h2 className="mt-2 font-semibold text-stone-900">Consulta</h2><p className="mt-1 text-xs text-stone-600">Problemas de cuenta, favoritos, reportes o funcionamiento del sitio.</p></div>
      </div>

      <div className="mt-7 flex flex-wrap gap-3 text-sm">
        <button type="button" onClick={() => onNavigate('legal', 'privacy')} className="font-semibold text-amber-800 underline underline-offset-2">Política de Privacidad</button>
        <button type="button" onClick={() => onNavigate('legal', 'terms')} className="font-semibold text-amber-800 underline underline-offset-2">Términos de Uso</button>
        <button type="button" onClick={() => onNavigate('legal', 'content')} className="font-semibold text-amber-800 underline underline-offset-2">Contenido y Propiedad Intelectual</button>
      </div>
    </div>
  </section>
);
