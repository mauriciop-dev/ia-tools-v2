import { supabase } from './supabase';

const BRAVE_API_KEY = import.meta.env.BRAVE_API_KEY;

function cleanHtml(text) {
  if (!text) return '';
  return text
    .replace(/<[^>]*>/g, '')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&amp;/g, '&')
    .replace(/&nbsp;/g, ' ')
    .replace(/&#x27;/g, "'")
    .replace(/&quot;/g, '"')
    .replace(/\s+/g, ' ')
    .trim();
}

function truncateSpanish(text, maxLength = 400) {
  if (!text) return '';
  const cleaned = cleanHtml(text);
  if (cleaned.length <= maxLength) return cleaned;
  return cleaned.substring(0, maxLength).lastIndexOf(' ') > 0 
    ? cleaned.substring(0, maxLength).lastIndexOf(' ') + '...'
    : cleaned.substring(0, maxLength) + '...';
}

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
      const searchQuery = `${sourceName} inteligencia artificial últimas noticias`;
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
        
        const cleanTitle = cleanHtml(latest.title);
        const cleanSummary = truncateSpanish(latest.description);

        const technology = sourceName.includes('Google') 
          ? 'Ecosistema Google AI' 
          : sourceName.includes('Cloudflare')
            ? 'Infraestructura Cloud'
            : sourceName.includes('OpenRouter')
              ? 'Modelos Abiertos'
              : 'IA de Código Abierto';
        
        const { error: newsError } = await supabase
          .from('news')
          .upsert({
            source_id: source.id,
            title: cleanTitle,
            summary: cleanSummary || `Últimas actualizaciones de ${sourceName} en inteligencia artificial.`,
            technology: technology,
            use_cases: ['Investigación de IA', 'Desarrollo tecnológico', 'Innovación digital'],
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
          
          results.push({ source: sourceName, status: 'new_content', title: cleanTitle });
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