from ccxt.base.types import Entry


class ImplicitAPI:
    public_get_markets_detail = publicGetMarketsDetail = Entry('markets/detail', 'public', 'GET', {})
    private_get_user_transactionreport = privateGetUserTransactionReport = Entry('user/transactionReport', 'private', 'GET', {})
    private_get_user_balance = privateGetUserBalance = Entry('user/balance', 'private', 'GET', {})
