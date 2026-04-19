import type { Action, ActionResult, IAgentRuntime, Memory } from "@elizaos/core";
import type { UpgradeKind } from "../types.js";
import { errorText, getService } from "./_helpers.js";

const VALID_KINDS: readonly UpgradeKind[] = [
  "hull",
  "tractor",
  "capacity",
  "voice_module",
  "radar",
];

export const upgradeStationAction: Action = {
  name: "UPGRADE_STATION",
  description:
    "Spend station credits on an upgrade (hull, tractor, capacity, voice_module, radar). Use when credits are available and the upgrade advances the station's strategy.",
  similes: ["BUY_UPGRADE", "SPEND_CREDITS", "INSTALL_UPGRADE"],
  validate: async (runtime) => !!runtime.getSetting("SIGNAL_AGENT_TOKEN"),
  handler: async (
    runtime: IAgentRuntime,
    _message: Memory,
    _state,
    options,
  ): Promise<ActionResult> => {
    const params = (options?.parameters ?? options ?? {}) as Record<string, unknown>;
    const kind = params.kind as UpgradeKind;
    if (!VALID_KINDS.includes(kind)) {
      return {
        success: false,
        error: `UPGRADE_STATION kind must be one of: ${VALID_KINDS.join(", ")}`,
      };
    }

    try {
      const res = await getService(runtime).upgrade({ kind });
      return {
        success: true,
        text: `Upgraded ${kind} to level ${res.new_level}. Credits remaining: ${res.credits_remaining}.`,
        data: { kind: res.kind, level: res.new_level, credits: res.credits_remaining },
      };
    } catch (err) {
      return { success: false, error: errorText(err) };
    }
  },
  parameters: [
    {
      name: "kind",
      description: `Upgrade kind: one of ${VALID_KINDS.join(", ")}`,
      required: true,
      schema: { type: "string", enum: [...VALID_KINDS] },
    },
  ],
};
