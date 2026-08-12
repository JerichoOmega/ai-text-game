import type { EntityId } from "@/domain/types";
import type { GmContext } from "../context/GmContext";

export const GM_OUTPUT_SCHEMA_VERSION = 1;

// --- Requests (all carry a pre-built context; never a raw WorldState) -------
export interface NarrationRequest { context: GmContext; prompt?: string }
export interface DialogueRequest { context: GmContext; npcId: EntityId; playerLine?: string }
export interface QuestProposalRequest { context: GmContext }
export interface RumorRequest { context: GmContext }
export interface PlayerActionRequest { context: GmContext; actionText: string }

// --- Proposals ---------------------------------------------------------------
// Deliberately COARSE and SAFE. There is intentionally NO proposal kind for
// hp, damage, gold, xp, inventory, RNG, world time, combat outcomes, NPC death,
// or settlement destruction — those stay 100% inside the deterministic systems
// and cannot even be expressed here (Phase 3 spec §3/§4).
export type ProposalMagnitude = "small" | "large";
export type RewardTier = "small" | "medium";

export type GmProposal =
  | { kind: "adjust_relationship"; npcId: EntityId; direction: "up" | "down"; magnitude: ProposalMagnitude; reason: string }
  | { kind: "offer_quest"; templateHint: string; targetSettlementId?: EntityId; targetNpcId?: EntityId; rewardTier: RewardTier; rationale: string }
  | { kind: "spawn_rumor"; text: string }
  | { kind: "advance_quest_objective"; questId: EntityId; objectiveId: EntityId }
  | { kind: "record_memory"; npcId: EntityId; summary: string; sentiment: number };

export const GM_PROPOSAL_KINDS = [
  "adjust_relationship",
  "offer_quest",
  "spawn_rumor",
  "advance_quest_objective",
  "record_memory",
] as const;
export type GmProposalKind = (typeof GM_PROPOSAL_KINDS)[number];

// --- Outputs -----------------------------------------------------------------
export interface NarrationOutput { schemaVersion: number; narrative: string; tone?: "grim" | "hopeful" | "neutral" | "tense" }
export interface DialogueOutput { schemaVersion: number; speakerNpcId: EntityId; line: string; proposals: GmProposal[] }
export interface GmProposalBatch { schemaVersion: number; narrative?: string; proposals: GmProposal[] }

// --- Result wrapper: the GM never throws; callers always get a usable value --
export type GmResult<T> =
  | { ok: true; source: "ai" | "fallback"; value: T }
  | { ok: false; source: "fallback"; reason: string; fallback: T };
