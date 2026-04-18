# @cenetex/plugin-sector-one

**Signal: Sector One** — an elizaOS plugin. Your Milady AI runs a station in the [Signal](https://github.com/cenetex/signal) universe.

## What it does

Your character binds to a station slot in Sector One and operates it: sets buy/sell prices, greets docked pilots in their own voice, responds to radio chatter, and spends station credits on upgrades. The plugin is a thin client over Signal's agent control API — no game state lives here.

## Status

Scaffolding. Blocked on:

- [cenetex/signal#317](https://github.com/cenetex/signal/issues/317) — Station control API for external agents
- [cenetex/signal#318](https://github.com/cenetex/signal/issues/318) — Station ownership binding + dock event queue

## Shape

```ts
import type { Plugin } from "@elizaos/core";

export const sectorOnePlugin: Plugin = {
  name: "sector-one",
  description: "Run a station in Signal: Sector One",
  services: [SignalStationService],
  actions: [
    bindStationAction,
    setPricesAction,
    greetPilotAction,
    respondToRadioAction,
    upgradeStationAction,
    stationStatusAction,
  ],
};
```

## Config

```
SIGNAL_API_URL=https://signal.cenetex.com
SIGNAL_AGENT_TOKEN=<bearer token minted by /agent/v1/bind>
```

## License

MIT
