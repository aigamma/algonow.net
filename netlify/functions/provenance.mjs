// Deliberately separate from ordinary chat, search, pages and ingestion.
export default async function provenance(request, context) {
  const { serve } = await import('../provenance/server.mjs');
  return serve(request, context);
}

export const config = {
  path: ['/api/provenance', '/api/provenance/*', '/mcp/provenance'],
};
