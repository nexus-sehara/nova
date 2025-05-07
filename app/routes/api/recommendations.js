import prisma from '../db.server.js';
import { RecommendationEngine } from '~/services/recommendationEngine.server';

export const loader = async ({ request }) => {
  const url = new URL(request.url);
  const productId = url.searchParams.get('productId');
  const shopDomain = url.searchParams.get('shop');
  const userId = url.searchParams.get('userId');
  const sessionId = url.searchParams.get('sessionId');
  const limit = parseInt(url.searchParams.get('limit') || '5');

  if (!productId || !shopDomain) {
    return new Response(JSON.stringify({ error: 'Missing productId or shop' }), { status: 400 });
  }

  const recommendations = await RecommendationEngine.getProductRecommendations({
    productId,
    shopDomain,
    userId,
    sessionId,
    limit,
  });

  return new Response(JSON.stringify({ recommendations }), {
    headers: { 'Content-Type': 'application/json' }
  });
}; 