#!/usr/bin/env node

// Simple test script for Swyftx integration
import ccxt from './js/ccxt.js';

// Create Swyftx exchange instance
const exchange = new ccxt.swyftx({
    'apiKey': process.env.SWYFTX_API_KEY,     // Replace with your API key
    'secret': process.env.SWYFTX_ACCESS_TOKEN,   // Replace with your JWT token
    'sandbox': false,                   // Set to true for testing if Swyftx has sandbox
    'enableRateLimit': true,
});

async function testSwyftx() {
    try {
        console.log('Testing Swyftx exchange...');
        console.log('Exchange ID:', exchange.id);
        console.log('Exchange Name:', exchange.name);

        // Test 1: Check exchange capabilities
        console.log('\n--- Exchange Capabilities ---');
        console.log('fetchMyTrades:', exchange.has.fetchMyTrades);
        console.log('fetchTransactions:', exchange.has.fetchTransactions);
        console.log('fetchBalance:', exchange.has.fetchBalance);

        // Test 2: Load markets (should work without auth)
        console.log('\n--- Loading Markets ---');
        try {
            const markets = await exchange.loadMarkets();
            console.log('Markets loaded:', Object.keys(markets).length);
            console.log('Sample markets:', Object.keys(markets).slice(0, 5));
        } catch (error) {
            console.error('Error loading markets:', error.message);
        }

        // Test 3: Fetch balance (requires auth)
        if (exchange.secret && exchange.secret !== 'your-jwt-token-here') {
            console.log('\n--- Testing Balance ---');
            try {
                const balance = await exchange.fetchBalance();
                console.log('Balance fetched successfully');
                console.log('Available currencies:', Object.keys(balance).filter(k => k !== 'info'));
            } catch (error) {
                console.error('Error fetching balance:', error.message);
            }

            // Test 4: Fetch trades (requires auth)
            console.log('\n--- Testing My Trades ---');
            try {
                const trades = await exchange.fetchMyTrades(undefined, undefined, 10);
                console.log('Trades fetched:', trades.length);
                if (trades.length > 0) {
                    console.log('Sample trade:', {
                        id: trades[0].id,
                        symbol: trades[0].symbol,
                        side: trades[0].side,
                        amount: trades[0].amount
                    });
                }
            } catch (error) {
                console.error('Error fetching trades:', error.message);
            }

            // Test 5: Fetch transactions (requires auth)
            console.log('\n--- Testing Transactions ---');
            try {
                const transactions = await exchange.fetchTransactions(undefined, undefined, 10);
                console.log('Transactions fetched:', transactions.length);
                if (transactions.length > 0) {
                    console.log('Sample transaction:', {
                        id: transactions[0].id,
                        currency: transactions[0].currency,
                        type: transactions[0].type,
                        amount: transactions[0].amount
                    });
                }
            } catch (error) {
                console.error('Error fetching transactions:', error.message);
            }
        } else {
            console.log('\n--- Skipping authenticated tests ---');
            console.log('Please set your API credentials to test authenticated endpoints');
        }

    } catch (error) {
        console.error('Test failed:', error);
    }
}

// Run the test
testSwyftx();