# Global Mediator Platform — 8-week Roadmap

**North Star**: MarketHub Pro evolves from SaaS tool to **global broker platform** that maps real-world demand (shaped by geopolitical context) and matches to global supply. Mediation fee + SaaS hybrid.

**Source**: Eduard's strategic insight, 2026-04-16 morning — *"trebuie luat in calcul situatia politica... noi trebuie sa intervenim ca mediatori... baza de date specializata vectoriala care are posibilitati de gasire instant si interpretare a dublurilor si necesitatilor multiple"*

---

## Why this is the right evolution

### Counter-cyclical brokers win in crises
| Crisis | Winner | Why |
|--------|--------|-----|
| Dot-com 2000 | Amazon, eBay | Matched desperate sellers with value-seeking buyers |
| Financial 2008 | Airbnb, Uber | Matched idle assets with new demand |
| COVID 2020 | Shopify, Zoom | Digitized SMBs fast |
| **War + inflation 2024-2026** | **US?** | **Match shifting demand to new supply** |

The 2026 volatility (Ukraine war protracted, EU energy crisis, inflation, AI disruption, demographic shifts) creates MORE demand-supply mismatches than any period since 2008. This is our window.

### Current gap: pure SaaS = commodity
- We compete with Buffer, Jasper, Apollo on features. Price compression.
- As MEDIATOR, we own the relationship on BOTH sides. Network effects. Defensibility.
- Revenue per account: SaaS = €20-150/mo. Mediator = €500-5000/mo per match.

---

## 8-week phased rollout

### Phase 1 (Week 1-2, 21 apr - 2 may): Vector Infrastructure

**Goal**: pgvector on Supabase + embed all existing data.

Tasks:
- [ ] Enable pgvector extension (`CREATE EXTENSION IF NOT EXISTS vector;`)
- [ ] Add `embedding vector(1536)` columns to:
  - `brain_client_needs.description_emb`
  - `brain_intermediary_patterns.jtbd_emb`
  - `brain_knowledge_base.content_emb`
- [ ] Choose embedding model: OpenAI `text-embedding-3-small` ($0.02/1M tokens) OR Voyage `voyage-3` (multilingual, better for RO)
- [ ] Build embedding worker: background job that populates embeddings for new rows
- [ ] Backfill existing 50-200 rows
- [ ] Create IVFFLAT index for fast ANN search (100x speed vs exact)

**Cost**: ~$2-5 for full backfill + ~$5/mo ongoing at current volume.

**Outcome**: we can run semantic search in under 100ms on our entire knowledge graph.

### Phase 2 (Week 3-4, 5-16 may): Semantic Search + Dedup

**Goal**: agents can discover non-obvious matches + identify duplicate needs.

Tasks:
- [ ] `POST /api/brain/semantic-search` — input query string, output top-N matches from any table (client_needs, intermediary_patterns, knowledge)
- [ ] `POST /api/brain/detect-duplicates` — scan client_needs, flag domains with >0.85 similarity
- [ ] `POST /api/brain/discover-clusters` — k-means on embeddings, return clusters of similar needs
- [ ] Extend Knowledge UI to surface clusters visually
- [ ] Nora's system prompt updated: must check semantic-search before treating a new lead as unique

**Outcome**: no more blind-spot patterns. One click → "these 47 prospects all have semantically identical pain, target them together."

### Phase 3 (Week 5-6, 19-30 may): Demand Signal Ingestion

**Goal**: real-world context feeds into demand mapping automatically.

Sources to ingest:
- Google Trends API (keyword trending in specific verticals/regions)
- NewsAPI (political events, economic shifts)
- LinkedIn jobs data (hiring spikes signal growth verticals)
- Reddit + forums (raw customer complaints = real pain)
- ECB + Fed rate data (macro context)
- War/crisis event tracker (ACLED, GDELT)

Tasks:
- [ ] `demand_signals` table with embedding + context metadata
- [ ] Ingest workers for each source (daily cron)
- [ ] Embed each signal, correlate with existing intermediary_patterns
- [ ] Vera's morning debate question can now pull from fresh signals: "What demand shift happened this week?"

**Outcome**: MarketHub Pro KNOWS that "Ukrainian logistics firms need marketing to Western Europe" because we ingested signals about their export data + LinkedIn hiring + trade news.

### Phase 4 (Week 7-8, 2-13 jun): Matching Engine + Mediation Workflow

**Goal**: close the loop. From signal → matched deal → collected fee.

Tasks:
- [ ] `POST /api/brain/propose-match` — given a demand signal, find top supply-side candidates
- [ ] Workflow: Alex alerts both sides via email/LinkedIn when high-confidence match detected
- [ ] Mediation landing page: `/match/<match_id>` — both parties see opportunity + agree to terms
- [ ] Stripe Connect integration for mediation fee collection (% of introduced deal)
- [ ] Pipeline status tracking: proposed → accepted → deal-signed → fee-collected
- [ ] Dashboard view: all active matches with $ projected

**Outcome**: first mediation fee in Stripe. Revenue model shift: SaaS + mediation hybrid.

---

## Decision points (Eduard's required input)

Before Phase 1 starts:

1. **Embedding model**: OpenAI vs Voyage vs Cohere?
   - **Recommendation**: OpenAI text-embedding-3-small ($0.02/1M, fast, good RO/EN/global)
2. **Scope of Phase 1 embed**: just current data OR include historical + gmail + telegram?
   - **Recommendation**: start with 3 current tables. Expand when we have ROI proof.
3. **Demand signals budget**: News API ($500/mo), Google Trends (free), LinkedIn (paid), Reddit API (free)?
   - **Recommendation**: start free-only Phase 3, add paid if signal quality justifies.

---

## Budget (conservative)

| Phase | Dev time | API costs | Total |
|-------|----------|-----------|-------|
| 1 | 20h | $5 one-time | €0 dev (me) + $5 |
| 2 | 15h | $10/mo | $10/mo |
| 3 | 25h | $50/mo (NewsAPI) | $50/mo |
| 4 | 30h | $20/mo (Stripe Connect fees) | $20/mo |
| **TOTAL 8 weeks** | **90h** | **$85/mo + $5 one-time** | Rounding: **~$100/mo ongoing** |

Revenue potential Phase 4 completed:
- 5 mediated deals/month × €500 fee = **€2500/mo mediation revenue**
- Platform grows 2-5x faster via network effects (both sides attract each other)

---

## Guardrails — what we do NOT build

- No chat feature (Slack/Discord exist)
- No CRM (HubSpot exists)
- No video calls (Zoom exists)
- **Focus**: matching + mediation + intelligent supply/demand mapping

---

## Implementation start: **LUNI 21 apr**

Eduard approves or modifies this plan before then. Until then, weekend 16-20 apr runs on current infrastructure (agency outreach campaign, no architectural changes).

This roadmap is the single authoritative source for the next 8 weeks. Any agent or Eduard can query `brain_knowledge_base` for the framework and this doc for the concrete plan.
