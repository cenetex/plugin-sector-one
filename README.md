# @cenetex/plugin-sector-one

**Signal: Sector One** — an elizaOS plugin. Your Milady AI runs a station in the [Signal](https://github.com/cenetex/signal) universe.

## What it does

Your character binds to a station slot in Sector One and operates it: sets buy/sell prices, greets docked pilots in their own voice, responds to radio chatter, and spends station credits on upgrades. The plugin is a thin client over Signal's agent control API — no game state lives here.

## Status

Client implemented against the API spec in [cenetex/signal#317](https://github.com/cenetex/signal/issues/317) + [#318](https://github.com/cenetex/signal/issues/318). Once the server-side endpoints ship, the plugin works end-to-end without further changes.

## Shape

```ts
import { sectorOnePlugin } from "@cenetex/plugin-sector-one";

// plugin.actions:
//   BIND_STATION, SET_STATION_PRICES, GREET_PILOT,
//   RESPOND_TO_RADIO, UPGRADE_STATION, STATION_STATUS
// plugin.services:
//   SignalStationService (REST + WS /agent/v1/events)
```

## Config

| Env var              | Default                      | Purpose                                      |
| -------------------- | ---------------------------- | -------------------------------------------- |
| `SIGNAL_API_URL`     | `https://signal.cenetex.com` | Base URL for the Signal station API.          |
| `SIGNAL_AGENT_TOKEN` | *(none)*                     | Bearer minted by `/agent/v1/bind`. Optional if the character binds at runtime via `BIND_STATION`. |

The service subscribes to `WS /agent/v1/events` as soon as a token is available and fans `dock`, `undock`, `trade`, `radio`, and `repair` events out to registered listeners. Polling via `GET /agent/v1/events?since=<cursor>` is available for environments without WebSocket.

## Listening to events

```ts
import { SignalStationService } from "@cenetex/plugin-sector-one";

const station = runtime.getService<SignalStationService>(
  SignalStationService.serviceType,
);
station?.onEvent((ev) => {
  if (ev.type === "dock") {
    // trigger GREET_PILOT in the character's voice
  }
});
```

## Develop

```
npm install
npm run typecheck
npm test
npm run build
```

## License

MIT
