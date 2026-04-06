import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
dotenv.config();

const supabaseUrl = process.env.PUBLIC_SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
const OPENROUTER_API_KEY = process.env.OPENROUTER_API_KEY;

const supabase = createClient(supabaseUrl, supabaseKey);

async function translateAllNews() {
  console.log('🔄 Traduciendo todas las noticias a español...');
  
  const { data: news } = await supabase.from('news').select('id,title,summary');
  
  for (const item of news) {
    let title = item.title;
    let summary = item.summary;
    
    const isEnglish = !title.includes('á') && !title.includes('é') && !title.includes('í') &&
                      !title.includes('ó') && !title.includes('ú') && !title.includes('ñ');
    
    if (isEnglish && OPENROUTER_API_KEY && title.length > 10) {
      try {
        console.log(`  Traduciendo: ${title.substring(0, 40)}...`);
        
        const res = await fetch('https://openrouter.ai/api/v1/chat/completions', {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${OPENROUTER_API_KEY}`,
            'Content-Type': 'application/json'
          },
          body: JSON.stringify({
            model: 'google/gemma-2-9b-it',
            messages: [{ role: 'user', content: `Traduce al español: "${title.substring(0, 200)}"` }],
            max_tokens: 300
          })
        });
        
        const data = await res.json();
        const translated = data.choices?.[0]?.message?.content?.trim();
        
        if (translated) {
          title = translated;
          console.log(`  ✓ Traducido: ${title.substring(0, 40)}...`);
        }
      } catch (e) {
        console.log(`  ⚠ Error: ${e.message}`);
      }
    }
    
    await supabase.from('news').update({ title, summary }).eq('id', item.id);
  }
  
  console.log('✅ Todas las noticias actualizadas');
}

translateAllNews();