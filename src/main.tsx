import ical, { ICalCalendarMethod } from "ical-generator";
import * as http from "http";
import { fellowship } from "@polkadot-api/descriptors";
import { createClient } from "polkadot-api";
import { getSmProvider } from "polkadot-api/sm-provider";
import { chainSpec } from "polkadot-api/chains/polkadot_collectives";
import { chainSpec as relayChainSpec } from "polkadot-api/chains/polkadot";
import { start } from "polkadot-api/smoldot";
import { timeStamp } from "console";

const smoldot = start();
const relayChain = await smoldot.addChain({ chainSpec: relayChainSpec });
const chain = await smoldot.addChain({
    chainSpec,
    potentialRelayChains: [relayChain],
});
// Connect to the parachain
const client = createClient(getSmProvider(chain));
const finalizedBlock = await client.getFinalizedBlock();
const fellowshipApi = client.getTypedApi(fellowship);
const finalizedTimestamp = await fellowshipApi.query.Timestamp.Now.getValue({
    at: finalizedBlock.hash,
});

function blockToDate(block: number): Date {
    if (block >= finalizedBlock.number) {
        console.log((block - finalizedBlock.number) * 12 * 1000);
        return new Date(
            Number(finalizedTimestamp) +
                (block - finalizedBlock.number) * 12 * 1000,
        );
    } else {
        console.log("finalized" + finalizedBlock.number);
        console.log("block" + block);

        return new Date(
            Number(finalizedTimestamp) -
                (finalizedBlock.number - block) * 12 * 1000,
        );
    }
}

http.createServer(async (req, res) => {
    res.writeHead(200, {
        "Content-Type": "text/calendar; charset=utf-8",
        "Content-Disposition": 'attachment; filename="calendar.ics"',
    });

    const calendar = ical({ name: "Fellowship Calendar" });

    // get the value for an account
    const accountInfo = await Promise.all([
        fellowshipApi.query.FellowshipSalary.Claimant.getValue(
            "13fvj4bNfrTo8oW6U8525soRp6vhjAFLum6XBdtqq9yP22E7",
        ),
        fellowshipApi.query.FellowshipSalary.Status.getValue(),
    ]);

    const sinceCycleStart = finalizedBlock.number - accountInfo[1].cycle_start;

    console.log(accountInfo);
    console.log(sinceCycleStart);
    console.log(blockToDate(accountInfo[1].cycle_start));

    const end = blockToDate(
        accountInfo[1].cycle_start +
            Number(fellowshipApi.constants.FellowshipSalary.RegistrationPeriod),
    );

    console.log(end);

    calendar.createEvent({
        allDay: true,
        start: blockToDate(accountInfo[1].cycle_start),
        end: blockToDate(
            accountInfo[1].cycle_start +
                (await fellowshipApi.constants.FellowshipSalary.RegistrationPeriod()),
        ),
    });

    res.end(calendar.toString());
}).listen(3000, "127.0.0.1", () => {
    console.log("Server running at http://127.0.0.1:3000/");
});
