'use strict';

var swyftx$1 = require('./abstract/swyftx.js');
var errors = require('./base/errors.js');
var number = require('./base/functions/number.js');

// ----------------------------------------------------------------------------
//  ---------------------------------------------------------------------------
/**
 * @class swyftx
 * @augments Exchange
 */
class swyftx extends swyftx$1 {
    describe() {
        return this.deepExtend(super.describe(), {
            'id': 'swyftx',
            'name': 'Swyftx',
            'countries': ['AU'],
            'rateLimit': 1000,
            'pro': false,
            'has': {
                'CORS': undefined,
                'spot': true,
                'margin': false,
                'swap': false,
                'future': false,
                'option': false,
                'addMargin': false,
                'cancelOrder': false,
                'closeAllPositions': false,
                'closePosition': false,
                'createMarketOrder': false,
                'createOrder': false,
                'createReduceOnlyOrder': false,
                'createStopLimitOrder': false,
                'createStopMarketOrder': false,
                'createStopOrder': false,
                'fetchBalance': true,
                'fetchBorrowRateHistories': false,
                'fetchBorrowRateHistory': false,
                'fetchCrossBorrowRate': false,
                'fetchCrossBorrowRates': false,
                'fetchFundingHistory': false,
                'fetchFundingRate': false,
                'fetchFundingRateHistory': false,
                'fetchFundingRates': false,
                'fetchIndexOHLCV': false,
                'fetchIsolatedBorrowRate': false,
                'fetchIsolatedBorrowRates': false,
                'fetchLeverage': false,
                'fetchLeverageTiers': false,
                'fetchMarginMode': false,
                'fetchMarkOHLCV': false,
                'fetchMyTrades': true,
                'fetchOpenInterestHistory': false,
                'fetchOrderBook': false,
                'fetchPosition': false,
                'fetchPositionHistory': false,
                'fetchPositionMode': false,
                'fetchPositions': false,
                'fetchPositionsForSymbol': false,
                'fetchPositionsHistory': false,
                'fetchPositionsRisk': false,
                'fetchPremiumIndexOHLCV': false,
                'fetchTicker': false,
                'fetchTickers': false,
                'fetchTrades': false,
                'fetchTradingFee': false,
                'fetchTradingFees': false,
                'fetchTransactions': false,
                'reduceMargin': false,
                'setLeverage': false,
                'setMarginMode': false,
                'setPositionMode': false,
                'ws': false,
            },
            'urls': {
                'logo': 'https://swyftx.com.au/wp-content/uploads/2021/03/swyftx-logo.png',
                'api': {
                    'public': 'https://api.swyftx.com.au',
                    'private': 'https://api.swyftx.com.au',
                },
                'www': 'https://swyftx.com.au',
                'doc': 'https://docs.swyftx.com.au',
            },
            'api': {
                'public': {
                    'get': [
                        'markets/detail',
                    ],
                },
                'private': {
                    'get': [
                        'user/transactionReport',
                        'user/balance',
                    ],
                },
            },
            'fees': {
                'trading': {
                    'tierBased': false,
                    'percentage': true,
                    'maker': this.parseNumber('0.006'),
                    'taker': this.parseNumber('0.006'), // 0.6%
                },
            },
            'precisionMode': number.TICK_SIZE,
            'exceptions': {
                'exact': {},
                'broad': {},
            },
        });
    }
    sign(path, api = 'public', method = 'GET', params = {}, headers = undefined, body = undefined) {
        let url = this.urls['api'][api] + '/' + path;
        if (api === 'public') {
            if (Object.keys(params).length) {
                url += '?' + this.urlencode(params);
            }
        }
        else if (api === 'private') {
            this.checkRequiredCredentials();
            headers = {
                'Authorization': 'Bearer ' + this.secret,
                'Content-Type': 'application/json',
            };
            if (Object.keys(params).length) {
                if (method === 'GET') {
                    url += '?' + this.urlencode(params);
                }
                else {
                    body = this.json(params);
                }
            }
        }
        return { 'url': url, 'method': method, 'body': body, 'headers': headers };
    }
    async fetchMyTrades(symbol = undefined, since = undefined, limit = undefined, params = {}) {
        const request = {};
        // 'from' parameter is required by the API
        if (since !== undefined) {
            request['from'] = since;
        }
        else {
            // Default to 1 year ago if not specified
            request['from'] = Date.now() - (365 * 24 * 60 * 60 * 1000);
        }
        // 'to' parameter is required by the API
        const to = this.safeInteger(params, 'to');
        request['to'] = (to !== undefined) ? to : Date.now();
        // Add 'offset' parameter for timezone offset
        request['offset'] = this.safeInteger(params, 'offset', 36000000); // Default to Australian timezone
        // Add 'type' parameter (csv or pdf - API doesn't support json)
        request['type'] = this.safeString(params, 'type', 'csv');
        const response = await this.privateGetUserTransactionReport(this.extend(request, params));
        // Parse CSV response
        if (typeof response === 'string' && response.includes('Crypto Transactions')) {
            const csvTransactions = this.parseSwyftxCsvTransactions(response);
            // Return ALL transactions (both crypto trades and fiat deposits) as trades
            return this.parseTrades(csvTransactions, undefined, since, limit);
        }
        // Fallback for other response formats
        const transactions = this.safeValue(response, 'data', []);
        return this.parseTrades(transactions, undefined, since, limit);
    }
    async fetchBalance(params = {}) {
        await this.loadMarkets();
        const response = await this.privateGetUserBalance(params);
        const balances = this.safeValue(response, 'data', []);
        const result = { 'info': response };
        for (let i = 0; i < balances.length; i++) {
            const balance = balances[i];
            const currencyId = this.safeString(balance, 'asset');
            const code = this.safeCurrencyCode(currencyId);
            const account = this.account();
            account['free'] = this.safeString(balance, 'availableAmount');
            account['used'] = this.safeString(balance, 'lockedAmount');
            account['total'] = this.safeString(balance, 'totalAmount');
            result[code] = account;
        }
        return this.safeBalance(result);
    }
    parseTrade(trade, market = undefined) {
        // Handle CSV format from transaction report
        if (this.safeString(trade, '_section')) {
            return this.parseSwyftxCsvTrade(trade, market);
        }
        // Handle standard API format
        const id = this.safeString(trade, 'id');
        const orderId = this.safeString(trade, 'orderId');
        const timestamp = this.parse8601(this.safeString(trade, 'executedTime'));
        const marketId = this.safeString(trade, 'primary');
        const symbol = this.safeSymbol(marketId, market);
        const side = this.safeStringLower(trade, 'side');
        const amount = this.safeString(trade, 'amount');
        const price = this.safeString(trade, 'rate');
        const cost = this.safeString(trade, 'total');
        const fee = {
            'cost': this.safeString(trade, 'fee'),
            'currency': this.safeString(trade, 'feeCurrency'),
        };
        return this.safeTrade({
            'id': id,
            'info': trade,
            'timestamp': timestamp,
            'datetime': this.iso8601(timestamp),
            'symbol': symbol,
            'order': orderId,
            'type': undefined,
            'side': side,
            'amount': amount,
            'price': price,
            'cost': cost,
            'fee': fee,
        }, market);
    }
    parseSwyftxCsvTrade(trade, market = undefined) {
        // Parse Swyftx CSV format for both trades and deposits/withdrawals
        const dateStr = this.safeString(trade, 'Date');
        const timeStr = this.safeString(trade, 'Time');
        const event = this.safeString(trade, 'Event');
        const asset = this.safeString(trade, 'Asset');
        const amount = this.safeString(trade, 'Amount');
        const paidCurrency = this.safeString(trade, 'Currency');
        const paidValue = this.safeString(trade, 'Value');
        const rate = this.safeString(trade, 'Rate');
        const uuid = this.safeString(trade, 'UUID');
        const txId = this.safeString(trade, 'Transaction ID');
        const feeAmount = this.safeString(trade, 'Fee Amount');
        const feeAsset = this.safeString(trade, 'Fee Asset');
        const section = this.safeString(trade, '_section');
        // Parse datetime from DD/MM/YYYY HH:MM:SS format
        let timestamp = undefined;
        if (dateStr && timeStr) {
            const [day, month, year] = dateStr.split('/');
            const datetime = `${year}-${month.padStart(2, '0')}-${day.padStart(2, '0')}T${timeStr}`;
            timestamp = this.parse8601(datetime);
        }
        // Handle different transaction types
        let symbol = undefined;
        let side = undefined;
        let type = undefined;
        let price = undefined;
        let cost = undefined;
        if (section === 'Crypto Transactions') {
            // Crypto trading transactions
            if (paidCurrency === 'AUD') {
                symbol = asset + '/AUD';
            }
            else if (paidCurrency && paidCurrency !== asset) {
                symbol = asset + '/' + paidCurrency;
            }
            if (event === 'buy') {
                side = 'buy';
            }
            else if (event === 'sell') {
                side = 'sell';
            }
            type = 'market';
            price = this.parseNumber(rate);
            cost = this.parseNumber(paidValue);
        }
        else if (section === 'Fiat Transactions') {
            // Fiat deposits/withdrawals - represent as trades for consistency
            symbol = asset + '/AUD'; // AUD deposits/withdrawals
            if (event === 'deposit') {
                side = 'buy';
            }
            else if (event === 'withdrawal') {
                side = 'sell';
            }
            type = event; // 'deposit' or 'withdrawal'
            price = 1; // 1:1 for fiat
            cost = this.parseNumber(amount); // Amount is the cost for fiat
        }
        return this.safeTrade({
            'id': uuid || txId,
            'info': trade,
            'timestamp': timestamp,
            'datetime': this.iso8601(timestamp),
            'symbol': symbol,
            'order': undefined,
            'type': type,
            'side': side,
            'amount': this.parseNumber(amount),
            'price': price,
            'cost': cost,
            'fee': {
                'cost': this.parseNumber(feeAmount),
                'currency': feeAsset || asset,
            },
        }, market);
    }
    parseTransaction(transaction, currency = undefined) {
        // Handle CSV format from transaction report
        if (this.safeString(transaction, '_section')) {
            return this.parseSwyftxCsvTransaction(transaction, currency);
        }
        // Handle standard API format
        const id = this.safeString(transaction, 'id');
        const timestamp = this.parse8601(this.safeString(transaction, 'createdTime'));
        const currencyId = this.safeString(transaction, 'asset');
        const code = this.safeCurrencyCode(currencyId, currency);
        const amount = this.safeString(transaction, 'amount');
        const type = this.safeStringLower(transaction, 'type');
        const status = this.parseTransactionStatus(this.safeString(transaction, 'status'));
        return {
            'info': transaction,
            'id': id,
            'currency': code,
            'amount': this.parseNumber(amount),
            'network': undefined,
            'address': undefined,
            'addressTo': undefined,
            'addressFrom': undefined,
            'tag': undefined,
            'tagTo': undefined,
            'tagFrom': undefined,
            'status': status,
            'type': type,
            'updated': undefined,
            'txid': this.safeString(transaction, 'txid'),
            'timestamp': timestamp,
            'datetime': this.iso8601(timestamp),
            'fee': {
                'currency': code,
                'cost': this.parseNumber(this.safeString(transaction, 'fee')),
            },
            'comment': undefined,
            'internal': false,
        };
    }
    parseSwyftxCsvTransaction(transaction, currency = undefined) {
        // Parse Swyftx CSV format: Date,Time,Event,Asset,Amount,Currency,Value,Rate,AUD Value Fee,AUD Value,Fee Amount,Fee Asset...
        const dateStr = this.safeString(transaction, 'Date');
        const timeStr = this.safeString(transaction, 'Time');
        const event = this.safeString(transaction, 'Event');
        const asset = this.safeString(transaction, 'Asset');
        const amount = this.safeString(transaction, 'Amount');
        const paidCurrency = this.safeString(transaction, 'Currency'); // What was paid (BTC in ETH/BTC trade)
        const paidValue = this.safeString(transaction, 'Value'); // How much was paid
        const txId = this.safeString(transaction, 'Transaction ID');
        const uuid = this.safeString(transaction, 'UUID');
        const feeAmount = this.safeString(transaction, 'Fee Amount');
        const feeAsset = this.safeString(transaction, 'Fee Asset');
        // Parse datetime from DD/MM/YYYY HH:MM:SS format
        let timestamp = undefined;
        if (dateStr && timeStr) {
            const [day, month, year] = dateStr.split('/');
            const datetime = `${year}-${month.padStart(2, '0')}-${day.padStart(2, '0')}T${timeStr}`;
            timestamp = this.parse8601(datetime);
        }
        const code = this.safeCurrencyCode(asset, currency);
        // Map Swyftx events to CCXT transaction types
        let type = event;
        if (event === 'buy' || event === 'sell') {
            type = 'trade';
        }
        else if (event === 'deposit') {
            type = 'deposit';
        }
        else if (event === 'withdrawal') {
            type = 'withdrawal';
        }
        // Add trading pair information for crypto-to-crypto trades
        let comment = undefined;
        if (paidCurrency && paidCurrency !== 'AUD' && paidCurrency !== asset) {
            comment = `${event} ${asset} with ${paidValue} ${paidCurrency}`;
        }
        return {
            'info': transaction,
            'id': uuid || txId,
            'currency': code,
            'amount': this.parseNumber(amount),
            'network': undefined,
            'address': undefined,
            'addressTo': undefined,
            'addressFrom': undefined,
            'tag': undefined,
            'tagTo': undefined,
            'tagFrom': undefined,
            'status': 'ok',
            'type': type,
            'updated': undefined,
            'txid': txId,
            'timestamp': timestamp,
            'datetime': this.iso8601(timestamp),
            'fee': {
                'currency': feeAsset || code,
                'cost': this.parseNumber(feeAmount),
            },
            'comment': comment,
            'internal': false,
        };
    }
    parseTransactionStatus(status) {
        const statuses = {
            'completed': 'ok',
            'pending': 'pending',
            'failed': 'failed',
            'cancelled': 'canceled',
        };
        return this.safeString(statuses, status, status);
    }
    parseSwyftxCsvTransactions(csvText) {
        const transactions = [];
        const lines = csvText.split('\n');
        let currentSection = '';
        let headers = [];
        for (let i = 0; i < lines.length; i++) {
            const line = lines[i].trim();
            if (line === 'Crypto Transactions' || line === 'Fiat Transactions') {
                currentSection = line;
                // Next line should be headers
                if (i + 1 < lines.length) {
                    headers = lines[i + 1].split(',');
                }
                i++; // Skip the header line
                continue;
            }
            // Skip empty lines, section headers, and subtotals
            if (!line || line.includes('sub total') || line.includes('Summary') || line.includes('no positions')) {
                continue;
            }
            // Parse transaction data
            if (currentSection && headers.length > 0 && line.includes(',')) {
                const values = this.parseCsvLine(line); // Use proper CSV parsing
                if (values.length >= 3 && values[0] && values[1] && values[2]) { // Must have date, time, and event
                    const transaction = {};
                    for (let j = 0; j < Math.min(headers.length, values.length); j++) {
                        const header = headers[j].trim();
                        const value = values[j].trim();
                        if (header) {
                            transaction[header] = value;
                        }
                    }
                    transaction['_section'] = currentSection;
                    transactions.push(transaction);
                }
            }
        }
        return transactions;
    }
    parseCsvLine(line) {
        // Simple CSV parser that handles basic comma-separated values
        // This can be improved for more complex CSV with quoted fields if needed
        return line.split(',').map((field) => field.trim());
    }
    handleErrors(code, reason, url, method, headers, body, response, requestHeaders, requestBody) {
        if (response === undefined) {
            return undefined;
        }
        const success = this.safeValue(response, 'success');
        if (success === false) {
            const message = this.safeString(response, 'message', body);
            const errorCode = this.safeString(response, 'error');
            if (errorCode === 'UNAUTHORIZED') {
                throw new errors.AuthenticationError(this.id + ' ' + message);
            }
            throw new errors.ExchangeError(this.id + ' ' + message);
        }
        return undefined;
    }
}

module.exports = swyftx;
