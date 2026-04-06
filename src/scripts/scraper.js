import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
dotenv.config();

const supabaseUrl = process.env.PUBLIC_SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
const BRAVE_API_KEY = process.env.BRAVE_API_KEY;

if (!supabaseUrl || !supabaseKey) {
  console.error('Missing Supabase variables');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey);

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

async function searchWithBrave(query) {
  try {
    const response = await fetch(
      `https://api.search.brave.com/res/v1/web/search?q=${encodeURIComponent(query)}&count=5&country=CO&locale=es-ES&extra_filter=type:news`,
      {
        headers: {
          'X-Subscription-Token': BRAVE_API_KEY,
          'Accept': 'application/json'
        }
      }
    );
    
    if (!response.ok) {
      console.error('Brave API error:', response.statusText);
      return null;
    }
    
    const data = await response.json();
    const results = data.web?.results || [];
    
    const spanishResult = results.find(r => 
      r.url?.includes('.co') || r.url?.includes('es') || r.language === 'es'
    );
    
    return spanishResult || results[0] || null;
  } catch (err) {
    console.error('Brave search error:', err.message);
    return null;
  }
}

async function runScraper() {
  console.log('--- AI Scraper: Buscando y limpiando contenido en español ---');
  
  const { data: sources, error: sourcesError } = await supabase
    .from('sources')
    .select('*')
    .eq('is_active', true);

  if (sourcesError) {
    console.error('Error fetching sources:', sourcesError.message);
    return;
  }

  console.log(`Found ${sources.length} active sources to track.`);
  const now = new Date();

  for (const source of sources) {
    console.log(`\nChecking: ${source.name}...`);
    
    const lastProcessed = source.last_processed_at ? new Date(source.last_processed_at) : new Date(0);
    const hoursSinceLast = (now - lastProcessed) / (1000 * 60 * 60);

    if (hoursSinceLast < 12) {
      console.log(`  ✓ Already up to date`);
      continue;
    }

    const result = await searchWithBrave(`${source.name} inteligencia artificial últimas noticias`);
    
    if (result) {
      const cleanTitle = cleanHtml(result.title);
      const cleanSummary = truncateSpanish(result.description);
      
      const isEnglish = !cleanTitle.includes('á') && !cleanTitle.includes('é') && !cleanTitle.includes('í') && 
                        !cleanTitle.includes('ó') && !cleanTitle.includes('ú') && !cleanTitle.includes('ñ');
      
      const finalTitle = isEnglish && cleanTitle.length > 0 
        ? `${source.name}: ${cleanTitle.substring(0, 60)}`
        : cleanTitle || `Últimas noticias de ${source.name}`;
      
      const finalSummary = isEnglish && cleanSummary.length > 0
        ? cleanSummary.substring(0, 300) + '...'
        : cleanSummary || `Conoce las últimas actualizaciones en inteligencia artificial de ${source.name}.`;
      
      const technology = source.name.includes('Google') 
        ? 'Ecosistema Google AI' 
        : source.name.includes('Cloudflare')
          ? 'Infraestructura Cloud'
          : source.name.includes('OpenRouter')
            ? 'Modelos Abiertos'
            : 'IA de Código Abierto';

      const discoveredNews = {
        source_id: source.id,
        title: finalTitle,
        summary: finalSummary,
        technology: technology,
        use_cases: ['Investigación de IA', 'Desarrollo tecnológico', 'Innovación digital'],
        platform: source.platform,
        is_new: true,
        published_at: now.toISOString()
      };

      const { error: newsError } = await supabase
        .from('news')
        .insert(discoveredNews);

      if (newsError) {
        if (newsError.code === '23505') {
          console.log(`  ✓ Already exists in DB`);
        } else {
          console.error(`  Error saving news:`, newsError.message);
        }
      } else {
        console.log(`  ✓ Saved: ${cleanTitle.substring(0, 50)}...`);
      }

      await supabase
        .from('sources')
        .update({ last_processed_at: now.toISOString() })
        .eq('id', source.id);
    } else {
      console.log(`  No results from Brave`);
    }
  }

  console.log('\n--- Scraper finished ---');
}

runScraper();