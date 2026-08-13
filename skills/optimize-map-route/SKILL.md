---
name: optimize-map-route
description: Enrich a generated or revised itinerary with map POIs, coordinates, and route durations. Use after itinerary composition when daily stops need geographic validation, walking/transit estimates, or actionable map links.
---

# Optimize Map Route

Run after the model has produced a structured TripPlan and before final validation.

1. Resolve each activity with Amap POI text search using the destination as the city limit.
2. Keep the model's order unless the user asks to reorder; enrich adjacent stops with Routes 2.0 walking or transit data.
3. Store coordinates, distance, duration, source, and a precise map link in the activity.
4. If the Amap Web Service Key is missing or an API request fails, keep search links and label distance information as estimated or unknown.

Keep `AMAP_WEB_SERVICE_KEY` server-side. Never expose it in browser code, share data, logs, or generated URLs.
