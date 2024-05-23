import ical from "ical-generator";
import { fellowship } from "@polkadot-api/descriptors";
import { createClient } from "polkadot-api";
import { getSmProvider } from "polkadot-api/sm-provider";
import { chainSpec } from "polkadot-api/chains/polkadot_collectives";
import SmWorker from "polkadot-api/smoldot/worker?worker";
import { startFromWorker } from "polkadot-api/smoldot/from-worker";

document.body.textContent = "Syncying...";

// Running smoldot in a web-worker has many advantages: the bundler
// will create a separate "chunk" with the smoldot binaries (which are very heavy),
// and the compilation of smoldot won't block the main process...
// ie: faster loading times, plus smoldot will have a dedicated process.
const smoldot = startFromWorker(new SmWorker());

// this will make the bundler create a separate chunk for the polkadot
// chainSpec (which is quite heavy) and it will load the chain without
// blocking the rest of the tasks that can be ran in parallel
const relayChainPromise = import("polkadot-api/chains/polkadot").then(
  ({ chainSpec }) =>
    smoldot.addChain({
      chainSpec,
      disableJsonRpc: true,
    }),
);

// likewise: there is no need to "await" in here because the `getSmProvider`
// accepts a `Promise<Chain>` so that the loading can happen in the background
const chain = relayChainPromise.then((relayChain) =>
  smoldot.addChain({
    chainSpec,
    potentialRelayChains: [relayChain],
  }),
);

// Connect to the parachain
const client = createClient(getSmProvider(chain));
const fellowshipApi = client.getTypedApi(fellowship);

const runtime = await fellowshipApi.runtime.latest();
document.body.textContent = "Ready!";

const finalizedBlock = await client.getFinalizedBlock();
const finalizedTimestamp = await fellowshipApi.query.Timestamp.Now.getValue({
  at: finalizedBlock.hash,
});

function blockToDate(block: number): Date {
  const diff =
    block >= finalizedBlock.number
      ? block - finalizedBlock.number
      : finalizedBlock.number - block;

  return new Date(
    new Date(Number(finalizedTimestamp) + diff * 12 * 1000).toDateString(),
  );
}

const calendar = ical({ name: "Fellowship Calendar" });

// get the value for an account
let currentCycleStart =
  (await fellowshipApi.query.FellowshipSalary.Status.getValue())!.cycle_start;

document.body.textContent = "Calendar data received";

const registrationPeriod =
  fellowshipApi.constants.FellowshipSalary.RegistrationPeriod(runtime);
const payoutPeriod =
  fellowshipApi.constants.FellowshipSalary.PayoutPeriod(runtime);

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
    end: blockToDate(currentCycleStart + registrationPeriod + payoutPeriod),
    summary: "Payout Registration",
  });

  currentCycleStart += registrationPeriod + payoutPeriod;
}

const ADDRESS = "13fvj4bNfrTo8oW6U8525soRp6vhjAFLum6XBdtqq9yP22E7";
const [coreParams, memberStatus, memberRank] = await Promise.all([
  fellowshipApi.query.FellowshipCore.Params.getValue(),
  fellowshipApi.query.FellowshipCore.Member.getValue(ADDRESS),
  fellowshipApi.query.FellowshipCollective.Members.getValue(ADDRESS),
]);

if (!memberRank || !memberStatus)
  throw new Error(`Member ${ADDRESS} not found`);

document.body.textContent = "User data loaded";

let timeout: number;
let approachSummary: string;
let happenedSummary: string;

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

calendar.createEvent({
  allDay: true,
  start: offboardDate,
  end: oneDayAfter,
  summary: happenedSummary,
});

(globalThis as any).loadCal = () => {
  window.open("data:text/calendar;charset=utf8," + calendar.toString());
};

document.body.innerHTML = `<a href="javascript:loadCal();">Open Calendar file</a>`;
