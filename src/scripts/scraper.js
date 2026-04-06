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

async function searchWithBrave(query) {
  try {
    const response = await fetch(
      `https://api.search.brave.com/res/v1/web/search?q=${encodeURIComponent(query)}&count=3&country=CO&locale=es-ES`,
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
    return data.web?.results?.[0] || null;
  } catch (err) {
    console.error('Brave search error:', err.message);
    return null;
  }
}

async function runScraper() {
  console.log('--- Starting Daily AI Scraper with Brave Search ---');
  
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

    const result = await searchWithBrave(`${source.name} AI latest 2026`);
    
    if (result) {
        const discoveredNews = {
          source_id: source.id,
          title: result.title,
          summary: result.description?.substring(0, 500) || `Últimas actualizaciones de ${source.name}`,
          technology: source.name.includes('Google') ? 'Google AI' : 'Open Source AI',
          use_cases: ['Investigación de IA', 'Desarrollo tecnológico'],
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
        console.log(`  ✓ Saved: ${result.title.substring(0, 50)}...`);
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