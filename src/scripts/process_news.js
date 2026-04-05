import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
dotenv.config();

const supabase = createClient(process.env.PUBLIC_SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY);

async function main() {
  const { data: sources } = await supabase.from('sources').select('id, name');
  const findId = (name) => sources.find(s => s.name.includes(name))?.id;

  const newsItems = [
    {
      source_id: findId('Gemma'),
      title: 'Gemma 4: SOTA Reasoning for Edge & Mobile',
      summary: 'Google lanza Gemma 4, una familia de modelos abiertos desde 2B hasta 120B (MoE) con razonamiento avanzado para flujos de trabajo agénticos y ejecución local en smartphones.',
      technology: 'Gemma 4 / LLM',
      use_cases: ['Modelos locales en iOS/Android', 'Workflows agénticos privados'],
      platform: 'Blog',
      is_new: true
    },
    {
      source_id: findId('DeepMind'),
      title: 'Atlas Humanoid x Gemini: Alianza Google-Boston Dynamics',
      summary: 'Boston Dynamics integra los modelos Gemini de Google DeepMind en su robot Atlas para habilitar razonamiento lógico y percepción semántica en tiempo real en entornos físicos.',
      technology: 'Robotics / Gemini AI',
      use_cases: ['Robots asistenciales en oficinas', 'Navegación autónoma inteligente'],
      platform: 'Digital Blog',
      is_new: true
    },
    {
      source_id: findId('Cloud'),
      title: 'Google Intrinsic: El "Android" de la Robótica',
      summary: 'Google mueve su subsidiaria Intrinsic al núcleo principal de la compañía para estandarizar el software de robótica industrial, buscando ser el sistema operativo líder del sector.',
      technology: 'Robotics / Software Infrastructure',
      use_cases: ['Automatización industrial escalable', 'Ecosistema de apps robóticas'],
      platform: 'CNBC / Tech News',
      is_new: true
    }
  ];

  console.log('Inserting fresh AI news (April 2026)...');
  
  for (const item of newsItems) {
    if (!item.source_id) {
       console.warn(`Skipping ${item.title}: Source not found`);
       continue;
    }

    // Manual check for existence
    const { data: existing } = await supabase.from('news').select('id').eq('title', item.title).maybeSingle();
    if (existing) {
       console.log(`- Already exists: ${item.title}`);
       continue;
    }

    const { error } = await supabase
      .from('news')
      .insert(item);
    
    if (error) console.error(`Error inserting ${item.title}:`, error.message);
    else console.log(`✓ Inserted: ${item.title}`);
  }
}

main();
