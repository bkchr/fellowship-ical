# Fellowship Calendar

A calendar for [Polkadot Fellowship](https://github.com/polkadot-fellows/) members based on their on-chain state. The calendar is provided as ICAL calendar. The calendar will show the following type of events:

- Salary registration: The period in which the member should register for a salary in the current cycle.
- Salary claim: The period in which the member can claim their salary in the current cycle.
- Offboarding/Demotion approaching: One month before the member could be demoted/offboarded. So, the member is able to apply for retention.

## Subscribing

You can use the following url to subscribe to the calendar:
```
webcal://fellowship-calendar.kchr.de/?account=13fvj4bNfrTo8oW6U8525soRp6vhjAFLum6XBdtqq9yP22E7
```

`account=` needs to be changed to be changed to YOUR account. If the account is not part of the fellowship, it will fail.

## Development

First install dependencies:
```sh
pnpm install
```

Building:
```sh
pnpm build
```

Updating metadata:
```sh
pnpm update-metadata
```

Running a dev server:
```sh
vercel dev
```
