import type { TripPlan, Trace } from "../app/trip-data";

export type AgentIntent = "new_trip" | "revise_trip" | "answer_trip" | "clarify";
export type SkillPhase = "prepare" | "enrich" | "validate";
export type SkillContext = {
  input: string;
  intent: AgentIntent;
  currentTrip: TripPlan | null;
  destination: string | null;
  startDate: string | null;
  toolResults: Record<string, unknown>;
};
export type SkillRunResult = { context?: Partial<SkillContext>; trace: Trace };
export type RuntimeSkill = {
  name: string;
  label: string;
  description: string;
  phase: SkillPhase;
  instructions: string;
  provenance?: { source: string; pattern: string };
  supports(intent: AgentIntent): boolean;
  run(context: SkillContext): Promise<SkillRunResult>;
};
