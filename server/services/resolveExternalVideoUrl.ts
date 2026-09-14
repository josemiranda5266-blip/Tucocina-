import { validateExternalUrl } from '../security/ssrf';

const MAX_REDIRECTS = 5;

/**
 * Resolves platform short-links without following redirects automatically.
 * Every redirect target is validated against the SSRF allowlist before it is requested.
 */
export async function resolveExternalVideoUrl(urlString: string): Promise<string> {
  let current = urlString.trim();

  for (let hop = 0; hop <= MAX_REDIRECTS; hop += 1) {
    const validation = validateExternalUrl(current);
    if (!validation.valid || !validation.url) {
      throw new Error(validation.reason || 'URL no permitida por seguridad');
    }

    const response = await fetch(validation.url.href, {
      method: 'HEAD',
      redirect: 'manual',
      headers: { 'User-Agent': 'Tucocina-Importer/1.0' },
      signal: AbortSignal.timeout(4000),
    });

    if (response.status < 300 || response.status >= 400) return validation.url.href;

    const location = response.headers.get('location');
    if (!location) return validation.url.href;

    let nextUrl: URL;
    try {
      nextUrl = new URL(location, validation.url.href);
    } catch {
      throw new Error('La plataforma devolvió una redirección inválida');
    }

    const nextValidation = validateExternalUrl(nextUrl.href);
    if (!nextValidation.valid || !nextValidation.url) {
      throw new Error('La redirección apunta a un dominio no permitido por seguridad');
    }

    current = nextValidation.url.href;
  }

  throw new Error('Se excedió el límite de redirecciones permitidas');
}
