---
name: retrieve-travel-knowledge
description: Retrieve relevant route, pace, budget, food, weather-contingency, family, accessibility, and safety guidance from the application's curated travel corpus. Use before creating, revising, or answering questions about an itinerary when reusable planning knowledge can improve consistency.
---

# Retrieve Travel Knowledge

Read `references/retrieval-policy.md` before changing retrieval or corpus behavior.

1. Build the query from destination plus the current user request.
2. Run the bundled weighted lexical and Chinese-bigram retriever.
3. Return a small set of scored chunks with stable IDs, titles, tags, and content.
4. Pass the hits to the planning model as guidance, never as live evidence.
5. Let current provider data and explicit user constraints override corpus guidance.

The retrieval stage runs no local model. DeepSeek remains the only generative model; deterministic retrieval keeps the hosted path fast and compatible with the Worker runtime.
