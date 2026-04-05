const accessToken = "sbp_68b38f4446c9c8f950b7cfc165bc317ec27c98e4";

async function listProjects() {
  const response = await fetch(`https://api.supabase.com/v1/projects`, {
    headers: { 'Authorization': `Bearer ${accessToken}` }
  });
  const data = await response.json();
  console.log(JSON.stringify(data, null, 2));
}

listProjects();
