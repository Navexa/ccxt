#!/usr/bin/env node

// Simple test script for Swyftx integration
import ccxt from './js/ccxt.js';

// Create Swyftx exchange instance
const exchange = new ccxt.swyftx({
    'apiKey': '71K_tfF3lIt_0hlLJH9kup_CXCtI7-6S1A_WSbW-HyX5D',     // Replace with your API key
    'secret': 'eyJhbGciOiJSUzI1NiIsInR5cCI6IkpXVCIsImtpZCI6IlJrVTRRelF6TlRaQk5rTkNORGsyTnpnME9EYzNOVEZGTWpaRE9USTRNalV6UXpVNE1UUkROUSJ9.eyJodHRwczovL3N3eWZ0eC5jb20uYXUvLWp0aSI6IjhkY2JmNjI2LTMwMDMtNDYyMy04YTc3LWIyNjM1NmViYWZmZSIsImh0dHBzOi8vc3d5ZnR4LmNvbS5hdS8tbWZhX2VuYWJsZWQiOmZhbHNlLCJodHRwczovL3N3eWZ0eC5jb20uYXUvLXVzZXJVdWlkIjoidXNyX0JWS3pEN3VWU3V6V1gydjhaTGdjeG8iLCJpc3MiOiJodHRwczovL3N3eWZ0eC5hdS5hdXRoMC5jb20vIiwic3ViIjoiYXV0aDB8NjdlMjA3MzI3Mzc3MzA0MWM2NGQ1ZTI5IiwiYXVkIjoiaHR0cHM6Ly9hcGkuc3d5ZnR4LmNvbS5hdS8iLCJpYXQiOjE3NTM0MjA5NTEsImV4cCI6MTc1NDAyNTc1MSwic2NvcGUiOiJhcHAuYWNjb3VudC50YXgtcmVwb3J0IGFwcC5hY2NvdW50LmJhbGFuY2UgYXBwLmFjY291bnQucmVhZCBhcHAucmVjdXJyaW5nLW9yZGVycy5yZWFkIGFwcC5hZGRyZXNzLnJlYWQgYXBwLmZ1bmRzLnJlYWQgYXBwLm9yZGVycy5yZWFkIGFwcC5hcGkucmVhZCBvZmZsaW5lX2FjY2VzcyIsImd0eSI6InBhc3N3b3JkIiwiYXpwIjoiRVF3M2ZhQXhPVGhSWVRaeXkxdWxaRGk4REhSQVlkRU8ifQ.AmTMHZw1M6AhL-nqkXrlOgZ3HIQxirzgp_7R1t9G1WOtjdpDYzy8VWn4mvS4VV2cgAloIdOairYZBV_udjidX81vhahnWq5iT6I6VRJ_kcNPIRjdW1RRsBtg5pQ9Z4u_IWxf2R6FitCz18yFKgsZuwPZ4xBsL_iLPzNgZxQBtIn-sNsMQwjBxmaReQ0oH_7-uUfha4vVRSkdSk28LcNjbHI56SYri3ZaSCPPzn3ACj2kOt5pKFQh3w9Kx1utQ8OOdEh8iWW3dQKN6KSZy9efOUcs9OUMu935YxjQnJXjBwgxsj3g_cSyJimetUGBULiKimxo7J-hTjlAXeJQJzAl5A',   // Replace with your JWT token
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