# Source policy

Prefer official attraction, transport, weather, tourism-board, and venue sources. Use established booking or map providers as secondary evidence. Attach `retrieved_at` and `valid_until` when practical. Treat price, availability, weather, transit schedules, closures, and opening hours as dynamic. Never describe cached data as live.

Accept evidence URLs only when a retrieval API returned them. Deterministically generated search URLs may be shown only as `search entry` links and must not be presented as evidence. Never convert model-authored prose into a source URL. When official evidence is unavailable, tell the user to recheck before departure.
