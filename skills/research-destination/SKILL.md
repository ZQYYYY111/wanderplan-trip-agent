---
name: research-destination
description: Research current destination facts for itinerary planning, including weather, opening hours, neighborhoods, transit, closures, entry requirements, and practical risks. Use when a trip depends on facts that may change or when validating a proposed activity.
---

# Research Destination

Read `references/source-policy.md` before retrieving current facts. Search authoritative sources first, record the source URL and retrieval time, and distinguish facts from estimates.

Reuse the Alibaba Cloud Model Studio web-search workflow: call the Responses API with `web_search`, extract URLs only from returned `web_search_call.action.sources`, and pass both the research summary and source list to the planning Skill. This is an application adapter of the mature `aliyun-model-studio-cli` search workflow; do not invoke a local CLI from the hosted request path.

Return normalized place candidates with coordinates, duration, cost range, hours, reservation need, evidence, and freshness. Mark unavailable data as unknown instead of guessing.

This Skill is query-only. It may explain whether advance registration is required, but it must never book, place an order, reserve a seat, or collect payment.
