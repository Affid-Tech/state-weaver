const KROKI_BASE_URL = 'https://kroki.io';

// Simple hash function for cache keys
function simpleHash(str: string): string {
  let hash = 0;
  for (let i = 0; i < str.length; i++) {
    const char = str.charCodeAt(i);
    hash = ((hash << 5) - hash) + char;
    hash = hash & hash;
  }
  return Math.abs(hash).toString(36);
}

// In-memory cache
const svgCache = new Map<string, string>();

export interface RenderResult {
  svg: string;
  fromCache: boolean;
}

export interface RenderError {
  message: string;
  details?: string;
}

export async function renderPumlToSvg(pumlText: string): Promise<RenderResult> {
  const cacheKey = simpleHash(pumlText);
  
  if (svgCache.has(cacheKey)) {
    return { svg: svgCache.get(cacheKey)!, fromCache: true };
  }

  try {
    const response = await fetch(`${KROKI_BASE_URL}/plantuml/svg`, {
      method: 'POST',
      headers: {
        'Content-Type': 'text/plain',
      },
      body: pumlText,
    });

    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(`Kroki error: ${response.status} - ${errorText}`);
    }

    const svg = await response.text();
    svgCache.set(cacheKey, svg);

    return { svg, fromCache: false };
  } catch (error) {
    if (error instanceof Error) {
      throw error;
    }
    throw new Error('Unknown error rendering PlantUML');
  }
}

export function clearCache(): void {
  svgCache.clear();
}
