// Respond to pilot radio chatter. Calls POST /agent/v1/voice with a radio channel.
// Blocked on cenetex/signal#317.

export const respondToRadioAction = {
  name: "RESPOND_TO_RADIO",
  description: "Answer a pilot's radio message in the station's voice.",
  handler: async () => {
    throw new Error("Not implemented — blocked on cenetex/signal#317");
  },
};
