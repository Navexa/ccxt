import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import swyftx from '../../js/src/swyftx.js';
import { RateLimitExceeded, ExchangeError } from '../../js/src/base/errors.js';

const report = readFileSync (new URL ('./fixtures/transactionReport.csv', import.meta.url), 'utf8');

const respond = (status, body) => ({
    'status': status,
    'statusText': '',
    'headers': new Headers (),
    'text': async () => body,
});

const makeExchange = (status, body) => {
    const exchange = new swyftx ({ 'apiKey': 'test-key' });
    exchange.accessToken = 'test-token';
    exchange.tokenExpiry = Date.now () + 3600000;
    exchange.requests = [];
    exchange.fetchImplementation = async (url) => {
        exchange.requests.push (url);
        return respond (status, body);
    };
    return exchange;
};

const queryOf = (url) => Object.fromEntries (new URL (url).searchParams);

const tradeById = async (id) => {
    const trades = await makeExchange (200, report).fetchMyTrades ();
    return trades.find ((t) => t.id === id);
};

test ('parses a buy with single-digit day, month and hour', async () => {
    const buy = await tradeById ('uuid-a');
    assert.equal (buy.symbol, 'BTC/AUD');
    assert.equal (buy.side, 'buy');
    assert.equal (buy.amount, 0.001);
    assert.equal (buy.price, 100000);
    assert.equal (buy.cost, 100);
    assert.deepEqual ({ 'cost': buy.fee.cost, 'currency': buy.fee.currency }, { 'cost': 0.000006, 'currency': 'BTC' });
    assert.equal (buy.timestamp, Date.UTC (2024, 2, 4, 23, 12, 0));
});

test ('parses an otc buy with an empty rate', async () => {
    const otc = await tradeById ('uuid-b');
    assert.equal (otc.symbol, 'ETH/AUD');
    assert.equal (otc.side, 'buy');
    assert.equal (otc.amount, 0.5);
    assert.equal (otc.price, 2500);
    assert.equal (otc.cost, 1250);
    assert.deepEqual ({ 'cost': otc.fee.cost, 'currency': otc.fee.currency }, { 'cost': 7.5, 'currency': 'AUD' });
    assert.equal (otc.timestamp, Date.UTC (2023, 10, 15, 4, 30, 45));
});

test ('parses a sell at midnight local time', async () => {
    const sell = await tradeById ('uuid-c');
    assert.equal (sell.symbol, 'BTC/AUD');
    assert.equal (sell.side, 'sell');
    assert.equal (sell.amount, 0.002);
    assert.equal (sell.price, 90000);
    assert.equal (sell.cost, 180);
    assert.deepEqual ({ 'cost': sell.fee.cost, 'currency': sell.fee.currency }, { 'cost': 1.08, 'currency': 'AUD' });
    assert.equal (sell.timestamp, Date.UTC (2023, 11, 19, 14, 5, 9));
});

test ('parses a crypto deposit', async () => {
    const deposit = await tradeById ('uuid-d');
    assert.equal (deposit.type, 'deposit');
    assert.equal (deposit.amount, 3);
    assert.equal (deposit.timestamp, Date.UTC (2024, 1, 1, 13, 59, 59));
});

test ('parses a crypto withdraw event as a withdrawal', async () => {
    const withdraw = await tradeById ('uuid-e');
    assert.equal (withdraw.type, 'withdrawal');
    assert.equal (withdraw.amount, 1);
    assert.equal (withdraw.timestamp, Date.UTC (2024, 1, 1, 22, 0, 0));
});

test ('parses fiat deposit and withdraw rows', async () => {
    const deposit = await tradeById ('uuid-f');
    assert.equal (deposit.side, 'buy');
    assert.equal (deposit.amount, 500);
    assert.equal (deposit.cost, 500);
    assert.equal (deposit.timestamp, Date.UTC (2024, 3, 3, 0, 0, 0));
    const withdraw = await tradeById ('uuid-g');
    assert.equal (withdraw.side, 'sell');
    assert.equal (withdraw.amount, 200);
    assert.equal (withdraw.cost, 200);
    assert.equal (withdraw.timestamp, Date.UTC (2024, 3, 4, 5, 20, 10));
});

test ('summary sections never become trades', async () => {
    const exchange = makeExchange (200, report);
    const trades = await exchange.fetchMyTrades ();
    assert.deepEqual (trades.map ((t) => t.id).sort (), [ 'uuid-a', 'uuid-b', 'uuid-c', 'uuid-d', 'uuid-e', 'uuid-f', 'uuid-g' ]);
});

test ('requests from 2018-07-01 +10:00 by default', async () => {
    const exchange = makeExchange (200, report);
    await exchange.fetchMyTrades ();
    const query = queryOf (exchange.requests[0]);
    assert.equal (query.from, String (Date.UTC (2018, 5, 30, 14, 0, 0)));
    assert.equal (query.offset, '36000000');
    assert.equal (query.type, 'csv');
});

test ('clamps since earlier than the floor', async () => {
    const exchange = makeExchange (200, report);
    await exchange.fetchMyTrades (undefined, Date.UTC (2015, 0, 1));
    assert.equal (queryOf (exchange.requests[0]).from, String (Date.UTC (2018, 5, 30, 14, 0, 0)));
});

test ('passes since later than the floor through', async () => {
    const exchange = makeExchange (200, report);
    const since = Date.UTC (2023, 0, 1);
    await exchange.fetchMyTrades (undefined, since);
    assert.equal (queryOf (exchange.requests[0]).from, String (since));
});

test ('a 200 body that is not the report throws with the body text', async () => {
    const exchange = makeExchange (200, '<html>maintenance page</html>');
    await assert.rejects (() => exchange.fetchMyTrades (), (e) => e instanceof ExchangeError && e.message.includes ('maintenance page'));
});

test ('a valid report with no rows returns an empty list', async () => {
    const empty = 'Opening Crypto Summary\nno positions held\n,,sub total,,,,,,0\nClosing Crypto Summary\nno positions held\n,,sub total,,,,,,0\n';
    const exchange = makeExchange (200, empty);
    assert.deepEqual (await exchange.fetchMyTrades (), []);
});

test ('HTTP 429 raises RateLimitExceeded', async () => {
    const exchange = makeExchange (429, '{"error":{"error":"TooManyRequests","message":"Too many requests"}}');
    await assert.rejects (() => exchange.fetchMyTrades (), (e) => e instanceof RateLimitExceeded && e.message.includes ('rate limit'));
});

test ('a wait N minutes body raises RateLimitExceeded', async () => {
    const exchange = makeExchange (200, 'Too many requests, please wait 10 minutes');
    await assert.rejects (() => exchange.fetchMyTrades (), (e) => e instanceof RateLimitExceeded);
});
