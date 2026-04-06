import { supabase } from './supabase';

const BRAVE_API_KEY = import.meta.env.BRAVE_API_KEY;

export async function runScraper() {
  const { data: sources } = await supabase
    .from('sources')
    .select('*')
    .eq('is_active', true);

  if (!sources) return [];

  const results = [];
  const now = new Date();

  for (const source of sources) {
    const sourceName = source.name;
    const lastProcessed = source.last_processed_at ? new Date(source.last_processed_at) : null;
    
    const hoursSinceLast = lastProcessed ? (now.getTime() - lastProcessed.getTime()) / (1000 * 60 * 60) : 999;
    
    if (hoursSinceLast < 12) {
      results.push({ source: sourceName, status: 'up_to_date' });
      continue;
    }

    try {
      const searchQuery = `${sourceName} últimas noticias IA`;
      const response = await fetch(
        `https://api.search.brave.com/res/v1/web/search?q=${encodeURIComponent(searchQuery)}&count=5&country=CO&locale=es-ES`,
        {
          headers: {
            'X-Subscription-Token': BRAVE_API_KEY,
            'Accept': 'application/json'
          }
        }
      );

      if (!response.ok) {
        results.push({ source: sourceName, status: 'api_error', error: response.statusText });
        continue;
      }

      const data = await response.json();
      const webResults = data.web?.results || [];

      if (webResults.length > 0) {
        const latest = webResults[0];
        
        const { error: newsError } = await supabase
          .from('news')
          .upsert({
            source_id: source.id,
            title: latest.title || `${sourceName} actualizaciones`,
            summary: latest.description || `Últimas actualizaciones de ${sourceName}`,
            technology: sourceName.includes('Google') ? 'Google AI' : 'IA de Código Abierto',
            use_cases: ['Investigación de IA', 'Desarrollo tecnológico'],
            platform: source.platform,
            is_new: true,
            published_at: new Date().toISOString()
          }, { onConflict: 'title' });

        if (newsError) {
          results.push({ source: sourceName, status: 'db_error', error: newsError.message });
        } else {
          await supabase
            .from('sources')
            .update({ last_processed_at: now.toISOString() })
            .eq('id', source.id);
          
          results.push({ source: sourceName, status: 'new_content', title: latest.title });
        }
      } else {
        results.push({ source: sourceName, status: 'no_results' });
      }
    } catch (err: any) {
      results.push({ source: sourceName, status: 'error', error: err.message });
    }
  }

  return results;
}