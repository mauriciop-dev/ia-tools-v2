import fs from 'fs';
// Using global fetch from Node 18+

const accessToken = "sbp_68b38f4446c9c8f950b7cfc165bc317ec27c98e4";
const projectId = "ockohhdrwrtnvqowrrqh";

async function fetchKeys() {
  const response = await fetch(`https://api.supabase.com/v1/projects/${projectId}/api-keys`, {
    headers: { 'Authorization': `Bearer ${accessToken}` }
  });
  const data = await response.json();
  fs.writeFileSync('supabase_keys.json', JSON.stringify(data, null, 2));
  console.log("Keys saved to supabase_keys.json");
}

fetchKeys();
