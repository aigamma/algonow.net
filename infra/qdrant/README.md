# Qdrant for AlgoNow

This service supports explicit semantic search over the authored atlas. It does
not participate in ordinary page delivery, local filtering or narration.

The pinned image is `qdrant/qdrant:v1.19.1`. One 512 MB shared CPU machine mounts a
3 GB encrypted Fly volume in ord. Automatic volume snapshots remain enabled.
The service may suspend when idle and resume for a search. This is a single-node
availability choice: a failed machine or volume can temporarily disable semantic
search while the static site remains usable. It is not a replicated cluster.

Fly terminates public HTTPS. Separate random administrator and read-only API keys
are staged through private stdin before deployment. The frontend receives no key;
Netlify functions receive only the read-only database key. The administrator key
and recovery copy of the read-only key are held in the central operator's
Windows CurrentUser DPAPI vault. CORS and Qdrant telemetry are disabled.

The owner authorized central deployment and bounded catalog embedding on
September 7, 2026. Central administrative scripts live in the private Codexproof
repository. Do not put secrets in command arguments, source files or logs.

The current alias is `algonow_atlas`; retained collections are named
`algonow_atlas_<generation-prefix>`. They use 1024-dimensional cosine vectors and
keyword payload indexes for category, topic and problem, plus an integer tier
index. See `docs/RETRIEVAL.md` for complete-generation activation and rollback.
To restore an older retained generation, use one atomic Qdrant alias change after
checking its count, model, dimension and receipt. Never delete a collection pinned
by a research campaign without a separate retention decision.

Read-only setup verification checks that anonymous collection access is rejected
and authorized access succeeds. Catalog activation and the live search pilot are
recorded separately from configuration validation. `fly config validate --config
infra/qdrant/fly.toml` passes for this configuration.

Sources: https://github.com/qdrant/qdrant/releases/tag/v1.19.1 and
https://fly.io/docs/reference/configuration/.
