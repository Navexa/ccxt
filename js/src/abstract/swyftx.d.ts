import { implicitReturnType } from '../base/types.js';
import { Exchange as _Exchange } from '../base/Exchange.js';
interface Exchange {
    publicGetMarketsDetail(params?: {}): Promise<implicitReturnType>;
    privateGetMarkets(params?: {}): Promise<implicitReturnType>;
    privateGetUserTrades(params?: {}): Promise<implicitReturnType>;
    privateGetUserTransactionReport(params?: {}): Promise<implicitReturnType>;
    privateGetUserBalance(params?: {}): Promise<implicitReturnType>;
}
declare abstract class Exchange extends _Exchange {
}
export default Exchange;
