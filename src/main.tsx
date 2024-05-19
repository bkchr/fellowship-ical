import ical, { ICalCalendarMethod } from "ical-generator";
import * as http from "http";
import { fellowship } from "@polkadot-api/descriptors";
import { createClient } from "polkadot-api";
import { getSmProvider } from "polkadot-api/sm-provider";
import { chainSpec } from "polkadot-api/chains/polkadot_collectives";
import { chainSpec as relayChainSpec } from "polkadot-api/chains/polkadot";
import { start } from "polkadot-api/smoldot";

const calendar = ical({ name: "my first iCal" });
const smoldot = start();
const relayChain = await smoldot.addChain({ chainSpec: relayChainSpec });
const chain = await smoldot.addChain({
  chainSpec,
  potentialRelayChains: [relayChain],
});

// Connect to the polkadot relay chain.
const client = createClient(getSmProvider(chain));

// A method is required for outlook to display event as an invitation
calendar.method(ICalCalendarMethod.REQUEST);

const startTime = new Date();
const endTime = new Date();
endTime.setHours(startTime.getHours() + 1);
calendar.createEvent({
  start: startTime,
  end: endTime,
  summary: "Example Event",
  description: "It works ;)",
  location: "my room",
  url: "http://sebbo.net/",
});

// With the `client`, you can get information such as subscribing to the last
// block to get the latest hash:
client.finalizedBlock$.subscribe((finalizedBlock) =>
  console.log(finalizedBlock.number, finalizedBlock.hash),
);

http
  .createServer(async (req, res) => {
    res.writeHead(200, {
      "Content-Type": "text/calendar; charset=utf-8",
      "Content-Disposition": 'attachment; filename="calendar.ics"',
    });

    // To interact with the chain, you need to get the `TypedApi`, which includes
    // all the types for every call in that chain:
    const fellowshipApi = client.getTypedApi(fellowship);

    // get the value for an account
    const accountInfo = await Promise.all([
      fellowshipApi.query.FellowshipSalary.Claimant.getValue(
        "13fvj4bNfrTo8oW6U8525soRp6vhjAFLum6XBdtqq9yP22E7",
      ),
      fellowshipApi.query.FellowshipSalary.Status.getValue(),
    ]);
    const finalizedBlock = await client.getFinalizedBlock();

    const timestamp = await fellowshipApi.query.Timestamp.Now.getValue({
      at: finalizedBlock.hash,
    });

    console.log(accountInfo);
    console.log(new Date(Number(timestamp)));

    res.end(calendar.toString());
  })
  .listen(3000, "127.0.0.1", () => {
    console.log("Server running at http://127.0.0.1:3000/");
  });
