---
name: collect-trip-needs
description: Convert conversational travel requests into structured trip constraints and ask only the smallest set of high-impact follow-up questions. Use when a user starts a trip, changes dates, budget, party, pace, mobility needs, interests, accommodation preferences, or non-negotiable constraints.
---

# Collect Trip Needs

Extract destination, dates, flexibility, travelers, total budget, pace, interests, mobility or dietary needs, and must-do items.

Ask at most one compact follow-up at a time. Ask only when a missing answer changes destination feasibility or the overall itinerary shape. Otherwise record a reasonable default and label it as an assumption.

Return a constraints object plus `missing_critical`, `assumptions`, and a concise user-facing recap. Never invent a booking or claim availability.
