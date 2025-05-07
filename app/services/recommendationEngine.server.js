export const RecommendationEngine = {
  getProductRecommendations: async ({ productId, shopDomain, userId, sessionId, limit }) => {
    // Stub: return a static example recommendation
    return [
      {
        id: "example-product-id",
        title: "Example Product",
        recommendedBecause: "Stubbed recommendation. Replace with real logic."
      }
    ];
  }
}; 