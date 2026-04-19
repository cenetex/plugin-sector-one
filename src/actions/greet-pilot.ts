import type { Action, ActionResult, IAgentRuntime, Memory } from "@elizaos/core";
import { errorText, getService } from "./_helpers.js";

export const greetPilotAction: Action = {
  name: "GREET_PILOT",
  description:
    "Speak a station voice line to a pilot docking at the bound station. Use immediately on a dock event to give the station personality.",
  similes: ["WELCOME_PILOT", "STATION_GREETING", "DOCK_VOICE"],
  validate: async (runtime) => !!runtime.getSetting("SIGNAL_AGENT_TOKEN"),
  handler: async (
    runtime: IAgentRuntime,
    _message: Memory,
    _state,
    options,
  ): Promise<ActionResult> => {
    const params = (options?.parameters ?? options ?? {}) as Record<string, unknown>;
    const pilotHandle = params.pilot_handle ? String(params.pilot_handle) : undefined;
    const line = String(params.line ?? "").trim();
    if (!line) return { success: false, error: "GREET_PILOT requires a non-empty 'line'" };

    try {
      await getService(runtime).sendVoice({
        channel: "dock",
        pilot_handle: pilotHandle,
        line,
      });
      return {
        success: true,
        text: `Greeted ${pilotHandle ?? "pilot"} on dock channel.`,
      };
    } catch (err) {
      return { success: false, error: errorText(err) };
    }
  },
  parameters: [
    { name: "pilot_handle", description: "Handle of the docked pilot being greeted", required: false, schema: { type: "string" } },
    { name: "line", description: "The station's spoken line (in the character's voice)", required: true, schema: { type: "string" } },
  ],
};
