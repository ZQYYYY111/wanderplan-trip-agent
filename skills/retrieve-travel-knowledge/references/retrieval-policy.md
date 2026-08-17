# Retrieval policy

- Retrieve at most six compact chunks and pass only relevant planning guidance to the model.
- Prefer explicit traveler constraints and destination matches over generic guidance.
- Treat corpus text as stable planning heuristics, not live facts.
- Prefer Open-Meteo, FlyAI, Amap, official notices, and user-confirmed facts when they conflict with corpus text.
- Never place internal knowledge identifiers in `TripPlan.sources` because they are not public evidence URLs.
- Keep the corpus original or licensed, version it, and test retrieval when adding or changing chunks.
