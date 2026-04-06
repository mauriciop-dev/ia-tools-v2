import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
dotenv.config();

const supabaseUrl = process.env.PUBLIC_SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
const BRAVE_API_KEY = process.env.BRAVE_API_KEY;
const OPENROUTER_API_KEY = process.env.OPENROUTER_API_KEY;

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

function isEnglish(text) {
  return !text.includes('á') && !text.includes('é') && !text.includes('í') && 
         !text.includes('ó') && !text.includes('ú') && !text.includes('ñ') &&
         !text.includes('¡') && !text.includes('¿');
}

async function translateToSpanish(text) {
  if (!text || text.length < 10) return text;
  if (!isEnglish(text)) return text;
  
  if (!OPENROUTER_API_KEY) {
    console.log('  ⚠ No OpenRouter API key');
    return text;
  }
  
  try {
    console.log('  🌐 Translating...');
    const response = await fetch('https://openrouter.ai/api/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${OPENROUTER_API_KEY}`,
        'Content-Type': 'application/json',
        'HTTP-Referer': 'https://ia-tools-v2.vercel.app',
        'X-Title': 'IA Tools'
      },
      body: JSON.stringify({
        model: 'google/gemma-2-9b-it',
        messages: [
          { role: 'user', content: `Traduce al español: "${text}"` }
        ],
        max_tokens: 600
      })
    });

    console.log('  🌐 Status:', response.status);
    
    if (!response.ok) {
      console.log('  ⚠ API error, skipping translation');
      return text;
    }

    const data = await response.json();
    const translated = data.choices?.[0]?.message?.content?.trim();
    console.log('  🌐 Translated:', translated?.substring(0, 60));
    return translated || text;
  } catch (err) {
    console.log('  ⚠ Error:', err.message);
    return text;
  }
}

async function searchWithBrave(query) {
  try {
    await new Promise(resolve => setTimeout(resolve, 1000));
    
    const response = await fetch(
      `https://api.search.brave.com/res/v1/web/search?q=${encodeURIComponent(query)}&count=3`,
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
  console.log('--- AI Scraper: Buscando y traduciendo contenido al español ---');
  
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
      let cleanTitle = cleanHtml(result.title);
      let cleanSummary = truncateSpanish(result.description);
      
      console.log(`  📰 Found: ${cleanTitle.substring(0, 50)}...`);
      
      if (isEnglish(cleanTitle) || isEnglish(cleanSummary)) {
        console.log(`  🌐 Translating to Spanish...`);
        cleanTitle = await translateToSpanish(cleanTitle);
        cleanSummary = await translateToSpanish(cleanSummary);
      }
      
      const technology = source.name.includes('Google') 
        ? 'Ecosistema Google AI' 
        : source.name.includes('Cloudflare')
          ? 'Infraestructura Cloud'
          : source.name.includes('OpenRouter')
            ? 'Modelos Abiertos'
            : 'IA de Código Abierto';

      const discoveredNews = {
        source_id: source.id,
        title: cleanTitle,
        summary: cleanSummary || `Últimas actualizaciones de ${source.name} en inteligencia artificial.`,
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