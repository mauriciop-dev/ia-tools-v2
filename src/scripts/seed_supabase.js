import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
dotenv.config();

const supabaseUrl = process.env.PUBLIC_SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !supabaseKey) {
  console.error('Missing Supabase variables');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey);

console.log('Active Supabase Project URL:', supabaseUrl);

async function seed() {
  const sources = [
    { name: 'Google AI Blog', url: 'https://ai.googleblog.com', is_active: true, status: 'online' },
    { name: 'Gemini News', url: 'https://blog.google/technology/ai/', is_active: true, status: 'online' },
    { name: 'OpenAI Blog', url: 'https://openai.com/blog', is_active: true, status: 'online' },
    { name: 'Brave Search', url: 'https://brave.com/search', is_active: true, status: 'online' },
    { name: 'IA Tools Bot', url: 'https://example.com/bot', is_active: false, status: 'offline' }
  ];

  console.log('Seeding sources...');
  const { data, error } = await supabase
    .from('sources')
    .upsert(sources, { onConflict: 'url' });

  if (error) {
    if (error.code === '42P01') {
      console.error('Table "sources" does not exist. Please run the SQL schema first.');
    } else {
      console.error('Error seeding sources:', error.code, error.message);
    }
  } else {
    console.log('Sources seeded successfully');
    
    // Fetch seeded sources to get IDs
    const { data: dbSources } = await supabase.from('sources').select('id, name');
    const gemmaSource = dbSources.find(s => s.name === 'Google Gemma');
    const cloudSource = dbSources.find(s => s.name === 'Google Cloud');

    if (gemmaSource && cloudSource) {
      console.log('Seeding news...');
      const news = [
        {
          source_id: gemmaSource.id,
          title: 'Gemma 4 en iPhone: IA Local Avanzada',
          summary: 'Google ha habilitado la ejecución de modelos Gemma 4 directamente en dispositivos iOS mediante la app AI Edge Gallery, permitiendo inferencia privada y offline.',
          technology: 'Gemma 4 / Mobile AI',
          use_cases: ['Asistentes privados con datos sensibles.', 'IA funcional en zonas sin conectividad.'],
          platform: 'X',
          is_new: true
        },
        {
          source_id: cloudSource.id,
          title: 'Gemini Enterprise: IA para Corporativos',
          summary: 'Google Cloud presenta nuevas capacidades de Gemini enfocadas en privacidad de datos empresariales e integración profunda con Google Workspace.',
          technology: 'Gemini / Enterprise',
          use_cases: ['Generación automatizada de reportes internos.', 'Búsqueda segura corporativa.'],
          platform: 'YouTube',
          is_new: false
        }
      ];

      const { error: newsError } = await supabase.from('news').upsert(news, { onConflict: 'title' });
      if (newsError) console.error('Error seeding news:', newsError.message);
      else console.log('News seeded successfully');
    }
  }
}

seed();
