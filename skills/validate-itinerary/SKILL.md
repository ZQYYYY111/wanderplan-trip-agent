---
name: validate-itinerary
description: Validate a structured itinerary or proposed patch for schema integrity, time overlap, insufficient transfer time, closed venues, excessive daily load, budget overflow, missing evidence, and booking risk. Use before presenting or committing any itinerary version.
---

# Validate Itinerary

Read `references/validation-rules.md`. Run `scripts/validate_trip.mjs <trip.json>` for deterministic structural, timing, and budget checks. Add evidence-based checks for dynamic facts.

Return blocking errors, warnings, and suggested repairs. Do not silently accept a blocking conflict. If a tool is unavailable, preserve the last stable version and label the affected fact as needing verification.
