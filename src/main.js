"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
var ical_generator_1 = require("ical-generator");
var http = require("http");
var polkadot_api_1 = require("polkadot-api");
var sm_provider_1 = require("polkadot-api/sm-provider");
var polkadot_1 = require("polkadot-api/chains/polkadot");
var smoldot_1 = require("polkadot-api/smoldot");
var calendar = (0, ical_generator_1.default)({ name: 'my first iCal' });
var smoldot = (0, smoldot_1.start)();
var chain = await smoldot.addChain({ chainSpec: polkadot_1.chainSpec });
// Connect to the polkadot relay chain.
var client = (0, polkadot_api_1.createClient)((0, sm_provider_1.getSmProvider)(chain));
// A method is required for outlook to display event as an invitation
calendar.method(ical_generator_1.ICalCalendarMethod.REQUEST);
var startTime = new Date();
var endTime = new Date();
endTime.setHours(startTime.getHours() + 1);
calendar.createEvent({
    start: startTime,
    end: endTime,
    summary: 'Example Event',
    description: 'It works ;)',
    location: 'my room',
    url: 'http://sebbo.net/'
});
http.createServer(function (req, res) {
    res.writeHead(200, {
        'Content-Type': 'text/calendar; charset=utf-8',
        'Content-Disposition': 'attachment; filename="calendar.ics"'
    });
    // With the `client`, you can get information such as subscribing to the last
    // block to get the latest hash:
    client.finalized$.subscribe(function (finalizedBlock) {
        return console.log(finalizedBlock.number, finalizedBlock.hash);
    });
    // To interact with the chain, you need to get the `TypedApi`, which includes
    // all the types for every call in that chain:
    var dotApi = client.getTypedApi(dot);
    // get the value for an account
    var accountInfo = yield dotApi.query.System.Account.getValue("16JGzEsi8gcySKjpmxHVrkLTHdFHodRepEz8n244gNZpr9J");
    res.end(calendar.toString());
}).listen(3000, '127.0.0.1', function () {
    console.log('Server running at http://127.0.0.1:3000/');
});
