// Long-lived connection to a Signal: Sector One server.
// Subscribes to /agent/v1/events (WS) and exposes REST helpers for actions.
// Implementation blocked on cenetex/signal#317 + #318.

export class SignalStationService {
  static serviceType = "sector-one-station";

  apiUrl: string;
  token: string;

  constructor(apiUrl: string, token: string) {
    this.apiUrl = apiUrl;
    this.token = token;
  }

  // TODO: connect WS, fan events out to the runtime, expose typed REST calls.
}
