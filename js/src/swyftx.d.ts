import Exchange from './abstract/swyftx.js';
import type { Balances, Dict, Int, Market, Str, Trade, Transaction, Currency } from './base/types.js';
/**
 * @class swyftx
 * @augments Exchange
 */
export default class swyftx extends Exchange {
    describe(): any;
    refreshAccessToken(): Promise<string>;
    ensureAccessToken(): Promise<string>;
    sign(path: string, api?: string, method?: string, params?: any, headers?: any, body?: any): any;
    fetch(url: any, method?: string, headers?: any, body?: any): Promise<any>;
    fetchMyTrades(symbol?: Str, since?: Int, limit?: Int, params?: {}): Promise<Trade[]>;
    fetchBalance(params?: {}): Promise<Balances>;
    parseTrade(trade: Dict, market?: Market): Trade;
    parseSwyftxCsvTrade(trade: Dict, market?: Market): Trade;
    parseTransaction(transaction: Dict, currency?: Currency): Transaction;
    parseSwyftxCsvTransaction(transaction: Dict, currency?: Currency): Transaction;
    parseTransactionStatus(status: Str): string;
    parseSwyftxCsvTransactions(csvText: string): any[];
    parseCsvLine(line: string): string[];
    handleErrors(code: Int, reason: string, url: string, method: string, headers: Dict, body: string, response: any, requestHeaders: any, requestBody: any): any;
}
