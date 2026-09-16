export type SiteId = 'COCIFLASH' | 'OFIGOOD';

export interface SiteConfig {
  id: SiteId;
  name: string;
  domain: string;
  description: string;
  public: boolean;
}

export const SITE_CONFIGS: Record<SiteId, SiteConfig> = {
  COCIFLASH: {
    id: 'COCIFLASH',
    name: 'CociFlash',
    domain: 'www.cociflash.com',
    description: 'Videos de cocina, pastelería, panadería y gastronomía.',
    public: true,
  },
  OFIGOOD: {
    id: 'OFIGOOD',
    name: 'Ofigood',
    domain: 'www.ofigood.com',
    description: 'Videos y cursos prácticos de oficios, habilidades y aprendizaje.',
    public: false,
  },
};

const rawSiteId = String(import.meta.env.VITE_SITE_ID || 'COCIFLASH').trim().toUpperCase();

export const CURRENT_SITE_ID: SiteId = rawSiteId === 'OFIGOOD' ? 'OFIGOOD' : 'COCIFLASH';
export const CURRENT_SITE_CONFIG = SITE_CONFIGS[CURRENT_SITE_ID];
