# Explicit provenance interrogation

The dedicated Netlify function serves authenticated HTTPS at `/api/provenance`
and Streamable HTTP MCP at `/mcp/provenance`. Public trust material is available
at `/api/provenance/trust`. No catalog page, narration, ingestion script or
ordinary search handler imports this producer or its crypto runtime.

On interrogation the producer performs the same catalog retrieval as semantic
search, validates the selected text's stored SHA-256, then constructs a graph
using the frozen Codexproof core. Typed binary canonicalization produces BLAKE3
content identifiers. A distinct `/algonow` Ed25519 producer leaf signs the graph;
its certificate and fresh, anchor-scoped signed revocation list accompany it.
The root signing seed remains in protected central operator custody.

The graph binds the request, query vector, filters, 50-candidate selection,
rerank outcome, returned point bytes, source-file digest declarations, catalog
generation, application commit, capture time, and ordered results. It contains
catalog index records, not the complete lesson corpus. A signed generation name
identifies a retained Qdrant collection; it does not prove that the producer
executed the declared retrieval faithfully or that an algorithm description is
correct. Original topic-file hashes are ingestion declarations; the exact
selected Qdrant point JSON is retained at interrogation time.

Netlify Blobs stores each capture before returning it, with exact byte readback.
Authenticated `/api/provenance/captures/<uuid>` restores it with current public
revocation material and unchanged node CIDs. This is retained object storage,
not WORM storage or a distributed compare-and-swap primitive. Retirement requires
an explicit owner decision. Keep empirical campaign captures and their catalog
generations while allowing new catalog generations to be activated separately.

Producer access uses a preconfigured random service bearer. This private service
does not expose public OAuth discovery. HTTP and MCP inputs are bounded; foreign
browser origins and unauthenticated capture requests are rejected. A stale
revocation list fails closed for interrogation while ordinary search continues.

Run `node --test netlify/provenance/*.test.mjs` for source-binding, authentication,
public-trust and capture/archive checks. Bundle isolation must show the frozen
WASM and provenance markers only in the dedicated function. Central live pilots
record deployment binding, both transports, archive restoration and rejection
checks before admission to an empirical campaign.
