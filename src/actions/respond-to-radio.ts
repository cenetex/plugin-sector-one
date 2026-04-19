import type { Action, ActionResult, IAgentRuntime, Memory } from "@elizaos/core";
import { errorText, getService } from "./_helpers.js";

export const respondToRadioAction: Action = {
  name: "RESPOND_TO_RADIO",
  description:
    "Answer a pilot's radio message in the station's voice. Use when a radio event arrives and the character should respond over the open channel.",
  similes: ["RADIO_REPLY", "ANSWER_RADIO", "BROADCAST_REPLY"],
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
    if (!line) return { success: false, error: "RESPOND_TO_RADIO requires a non-empty 'line'" };

    try {
      await getService(runtime).sendVoice({
        channel: "radio",
        pilot_handle: pilotHandle,
        line,
      });
      return {
        success: true,
        text: `Replied to ${pilotHandle ?? "radio"} on open channel.`,
      };
    } catch (err) {
      return { success: false, error: errorText(err) };
    }
  },
  parameters: [
    { name: "pilot_handle", description: "Handle of the pilot being answered (optional — omit for broadcast)", required: false, schema: { type: "string" } },
    { name: "line", description: "The station's radio line (in the character's voice)", required: true, schema: { type: "string" } },
  ],
};
