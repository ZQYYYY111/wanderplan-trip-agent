---
name: discover-flyai-pois
description: Discover structured attraction and POI candidates for a destination. Use for new itinerary planning or destination questions that benefit from real place names, categories, addresses, descriptions, and coordinates.
---

# Discover FlyAI POIs

Reuse the MIT-licensed `alibaba-flyai/flyai-skill` `search-poi` intent and parameter model. Call its MCP endpoint only with the application owner's `FLYAI_API_KEY`; never copy a CLI trial credential into hosted code.

Normalize only read-only planning fields: name, address, category, description, level, free-status, and coordinates. Discard booking URLs and ticket-order fields because this application supports query and planning only.

If FlyAI is unavailable, continue with the destination research Skill. Never block itinerary generation solely because this optional provider failed.
