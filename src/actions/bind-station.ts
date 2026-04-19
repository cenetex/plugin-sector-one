import type { Action, ActionResult, IAgentRuntime, Memory } from "@elizaos/core";
import { errorText, getService } from "./_helpers.js";

export const bindStationAction: Action = {
  name: "BIND_STATION",
  description:
    "Claim an unowned station slot in Sector One and mint a bearer token. Use when the character wants to take ownership of a refinery, yard, or works.",
  similes: ["CLAIM_STATION", "TAKE_STATION", "OWN_STATION"],
  validate: async (runtime) => !!runtime.getSetting("SIGNAL_API_URL"),
  handler: async (
    runtime: IAgentRuntime,
    _message: Memory,
    _state,
    options,
  ): Promise<ActionResult> => {
    const params = (options?.parameters ?? options ?? {}) as Record<string, unknown>;
    const slot = Number(params.slot);
    const pubkey = String(params.pubkey ?? "");
    const signature = String(params.signature ?? "");
    const challenge = String(params.challenge ?? "");
    const ownerLabel = params.owner_label ? String(params.owner_label) : undefined;

    if (!Number.isFinite(slot) || !pubkey || !signature || !challenge) {
      return {
        success: false,
        error: "BIND_STATION requires slot, pubkey, signature, challenge",
      };
    }

    try {
      const res = await getService(runtime).bind({
        slot,
        pubkey,
        signature,
        challenge,
        owner_label: ownerLabel,
      });
      return {
        success: true,
        text: `Bound to slot ${res.slot}. Token expires at ${new Date(res.expires_at * 1000).toISOString()}.`,
        data: { slot: res.slot, expires_at: res.expires_at },
      };
    } catch (err) {
      return { success: false, error: errorText(err) };
    }
  },
  parameters: [
    { name: "slot", description: "Station slot number to claim", required: true, schema: { type: "number" } },
    { name: "pubkey", description: "Owner pubkey (base58)", required: true, schema: { type: "string" } },
    { name: "signature", description: "Signed challenge", required: true, schema: { type: "string" } },
    { name: "challenge", description: "Challenge string issued by the station server", required: true, schema: { type: "string" } },
    { name: "owner_label", description: "Display name for the station", required: false, schema: { type: "string" } },
  ],
};
