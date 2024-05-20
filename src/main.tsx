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
        return new Date(
            new Date(
                Number(finalizedTimestamp) +
                    (block - finalizedBlock.number) * 12 * 1000,
            ).toDateString(),
        );
    } else {
        return new Date(
            new Date(
                Number(finalizedTimestamp) -
                    (finalizedBlock.number - block) * 12 * 1000,
            ).toDateString(),
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
    const salaryStatus =
        await fellowshipApi.query.FellowshipSalary.Status.getValue();
    let currentCycleStart = salaryStatus.cycle_start;
    const registrationPeriod =
        await fellowshipApi.constants.FellowshipSalary.RegistrationPeriod();
    const payoutPeriod =
        await fellowshipApi.constants.FellowshipSalary.PayoutPeriod();

    for (let cycle = 0; cycle < 12; cycle++) {
        calendar.createEvent({
            allDay: true,
            start: blockToDate(currentCycleStart),
            end: blockToDate(currentCycleStart + registrationPeriod),
            summary: "Salary Registration",
        });

        calendar.createEvent({
            allDay: true,
            start: blockToDate(currentCycleStart + registrationPeriod),
            end: blockToDate(
                currentCycleStart + registrationPeriod + payoutPeriod,
            ),
            summary: "Payout Registration",
        });

        currentCycleStart += registrationPeriod + payoutPeriod;
    }

    const [coreParams, memberStatus, memberRank] = await Promise.all([
        fellowshipApi.query.FellowshipCore.Params.getValue(),
        fellowshipApi.query.FellowshipCore.Member.getValue(
            "13fvj4bNfrTo8oW6U8525soRp6vhjAFLum6XBdtqq9yP22E7",
        ),
        fellowshipApi.query.FellowshipCollective.Members.getValue(
            "13fvj4bNfrTo8oW6U8525soRp6vhjAFLum6XBdtqq9yP22E7",
        ),
    ]);

    let timeout;
    let approachSummary;
    let happenedSummary;

    if (memberRank == 0) {
        timeout = coreParams.offboard_timeout;
        approachSummary = "Offboarding approaching";
        happenedSummary = "Offboarded?";
    } else {
        timeout = coreParams.demotion_period[memberRank - 1];
        approachSummary = "Demotion approaching";
        happenedSummary = "Demoted?";
    }

    let offboardDate = blockToDate(memberStatus.last_proof + timeout);
    offboardDate.setDate(offboardDate.getDate() + 1);
    console.log("offboard " + offboardDate.toISOString());

    let offboardEventStart = new Date(offboardDate);
    offboardEventStart.setDate(offboardEventStart.getDate() - 7 * 4);

    calendar.createEvent({
        allDay: true,
        start: offboardEventStart,
        end: offboardDate,
        summary: approachSummary,
    });

    let oneDayAfter = new Date(offboardDate);
    oneDayAfter.setDate(offboardDate.getDate() + 1);
    console.log("one day after " + oneDayAfter.toISOString());

    calendar.createEvent({
        allDay: true,
        start: offboardDate,
        end: oneDayAfter,
        summary: happenedSummary,
    });

    res.end(calendar.toString());
}).listen(3000, "127.0.0.1", () => {
    console.log("Server running at http://127.0.0.1:3000/");
});
