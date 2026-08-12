---
name: revise-itinerary
description: Apply conversational, reversible local edits to an existing structured itinerary while preserving unaffected days and activities. Use for adding, deleting, replacing, moving, slowing down, repricing, or weather-proofing part of a trip.
---

# Revise Itinerary

Read `references/edit-policy.md`. Resolve the target by stable ID, date, day number, time, or place. Compute the smallest affected region, retrieve fresh candidates when needed, and produce a patch rather than rewriting the trip.

Run `$validate-itinerary` on the patch. Show the meaningful before/after difference, increment the version, and preserve a reversible revision record.
