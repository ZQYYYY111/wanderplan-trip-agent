---
name: research-destination
description: Research current destination facts for itinerary planning, including weather, opening hours, neighborhoods, transit, closures, entry requirements, and practical risks. Use when a trip depends on facts that may change or when validating a proposed activity.
---

# Research Destination

Read `references/source-policy.md` before retrieving current facts. Prefer structured provider results, record the retrieval time, and distinguish verified facts, estimates, and search-entry links.

Use Open-Meteo for near-term forecast data. Generate transparent Baidu and Amap search-entry links for facts that still need user verification. A search result URL is not evidence: label it as a search entry and never claim it proves opening hours, price, availability, or policy.

Use FlyAI and Amap Skills for normalized place candidates and route data. Mark unavailable data as unknown instead of guessing.

This Skill is query-only. It may explain whether advance registration is required, but it must never book, place an order, reserve a seat, or collect payment.
