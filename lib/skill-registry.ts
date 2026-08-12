import type { AgentIntent, RuntimeSkill, SkillContext } from "../skills/runtime-types";
import { collectTripNeeds } from "../skills/collect-trip-needs/runtime";
import { researchDestination } from "../skills/research-destination/runtime";
import { composeItinerary } from "../skills/compose-itinerary/runtime";
import { reviseItinerary } from "../skills/revise-itinerary/runtime";
import { validateItinerary } from "../skills/validate-itinerary/runtime";
import { shareTrip } from "../skills/share-trip/runtime";

export const skillRegistry:RuntimeSkill[]=[collectTripNeeds,researchDestination,composeItinerary,reviseItinerary,validateItinerary,shareTrip];
export function selectSkills(intent:AgentIntent){return skillRegistry.filter(skill=>skill.supports(intent))}
export async function runSkillPhase(skills:RuntimeSkill[],phase:"prepare"|"validate",initial:SkillContext){let context=initial;const trace=[];for(const skill of skills.filter(s=>s.phase===phase)){const result=await skill.run(context);context={...context,...result.context,toolResults:{...context.toolResults,...result.context?.toolResults}};trace.push(result.trace)}return {context,trace}}
export function skillPrompt(skills:RuntimeSkill[]){return skills.map(s=>`[${s.name} / ${s.label}]${s.provenance?`\n复用来源：${s.provenance.source}；模式：${s.provenance.pattern}`:""}\n${s.instructions}`).join("\n\n")}
