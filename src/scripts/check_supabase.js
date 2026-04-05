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

async function check() {
  const { data, error } = await supabase
    .from('sources')
    .select('*')
    .limit(10);

  if (error) {
    console.error('Error fetching sources:', error.code, error.message);
  } else {
    console.log('Sources found in DB:', data.length);
    console.log(data);
  }
}

check();
