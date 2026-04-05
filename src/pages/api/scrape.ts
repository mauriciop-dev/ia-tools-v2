import type { APIRoute } from 'astro';
import { runScraper } from '../../lib/scraper_core';

export const GET: APIRoute = async ({ request }) => {
  // Simple auth with a secret header
  const authHeader = request.headers.get('Authorization');
  if (authHeader !== `Bearer ${import.meta.env.SCRAPER_SECRET}`) {
    return new Response('Unauthorized', { status: 401 });
  }

  try {
    const results = await runScraper();
    return new Response(JSON.stringify({
      success: true,
      timestamp: new Date().toISOString(),
      results
    }), {
      status: 200,
      headers: { 'Content-Type': 'application/json' }
    });
  } catch (error: any) {
    return new Response(JSON.stringify({ error: error.message }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' }
    });
  }
};
