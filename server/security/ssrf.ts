import { URL } from 'url';

export const ALLOWED_VIDEO_DOMAINS = [
  'youtube.com',
  'www.youtube.com',
  'm.youtube.com',
  'youtu.be',
  'instagram.com',
  'www.instagram.com',
  'tiktok.com',
  'www.tiktok.com',
  'm.tiktok.com',
  'vm.tiktok.com',
] as const;

const PRIVATE_IP_PATTERNS = [
  /^127\./,
  /^10\./,
  /^172\.(1[6-9]|2[0-9]|3[0-1])\./,
  /^192\.168\./,
  /^169\.254\./,
  /^0\./,
  /^100\.64\./,
  /^198\.18\./,
  /^198\.19\./,
  /^::1$/,
  /^fc00:/,
  /^fd[0-9a-f]{2}:/i,
  /^fe80:/,
  /^localhost$/i,
];

function isAllowedHostname(hostname: string): boolean {
  return ALLOWED_VIDEO_DOMAINS.some((allowed) => hostname === allowed);
}

export function validateExternalUrl(urlString: string): { valid: boolean; reason?: string; url?: URL } {
  if (!urlString || typeof urlString !== 'string') {
    return { valid: false, reason: 'URL no proporcionada o formato inválido' };
  }

  let parsedUrl: URL;
  try {
    parsedUrl = new URL(urlString.trim());
  } catch {
    return { valid: false, reason: 'Formato de URL inválido' };
  }

  if (parsedUrl.protocol !== 'https:') {
    return { valid: false, reason: 'Solo se permiten URLs HTTPS de plataformas soportadas' };
  }

  const hostname = parsedUrl.hostname.toLowerCase();

  for (const pattern of PRIVATE_IP_PATTERNS) {
    if (pattern.test(hostname)) {
      return { valid: false, reason: 'Acceso a direcciones IP privadas o locales no permitido (SSRF Guard)' };
    }
  }

  if (!isAllowedHostname(hostname)) {
    return {
      valid: false,
      reason: `El dominio '${hostname}' no está en la lista de plataformas permitidas (YouTube, Instagram, TikTok)`,
    };
  }

  return { valid: true, url: parsedUrl };
}
