import WebSocket from 'ws';
import fetch from 'node-fetch';

// Replace this with your Railway app URL
const RAILWAY_URL = process.env.RAILWAY_URL || 'web-production-9ecc.up.railway.app';
const API_URL = `https://${RAILWAY_URL}`;

async function testWebSocket() {
    console.log('\n🔌 Testing WebSocket connection to Railway...');
    return new Promise<void>((resolve) => {
        const ws = new WebSocket(`wss://${RAILWAY_URL}`);

        ws.on('open', () => {
            console.log('✅ WebSocket connected to Railway');
            
            // Test both queries
            const queries = [
                { query: 'pump.fun/coin/', type: 'pumpfun' },
                { query: 'dexscreener.com/solana/', type: 'dexscreener' }
            ];

            let queryIndex = 0;
            
            function sendNextQuery() {
                if (queryIndex < queries.length) {
                    const query = queries[queryIndex];
                    console.log(`\n📤 Testing query: "${query.query}" (${query.type})`);
                    ws.send(JSON.stringify(query));
                    queryIndex++;
                } else {
                    ws.close();
                }
            }

            ws.on('message', (data) => {
                try {
                    const response = JSON.parse(data.toString());
                    console.log('✅ WebSocket response received');
                    console.log(`📊 Tweet count: ${response.data?.length || 0}`);
                    if (response.data?.length > 0) {
                        console.log('📝 Sample tweet:', response.data[0].full_text.substring(0, 100) + '...');
                    }
                    // Send next query after receiving response
                    sendNextQuery();
                } catch (error) {
                    console.error('❌ Error processing response:', error);
                    ws.close();
                }
            });

            // Start with first query
            sendNextQuery();
        });

        ws.on('error', (error) => {
            console.error('❌ WebSocket Test failed:', error);
            resolve();
        });

        ws.on('close', () => {
            console.log('🔌 WebSocket connection closed');
            resolve();
        });
    });
}

async function testRESTAPI() {
    console.log('\n🔍 Testing REST API on Railway...');
    const queries = [
        { query: 'pump.fun/coin/', type: 'pumpfun' },
        { query: 'dexscreener.com/solana/', type: 'dexscreener' }
    ];

    for (const { query, type } of queries) {
        try {
            console.log(`\nTesting query: "${query}" (${type})`);
            const response = await fetch(
                `${API_URL}/api/tweets?query=${encodeURIComponent(query)}&type=${type}`
            );

            if (!response.ok) {
                throw new Error(`HTTP error! status: ${response.status}`);
            }

            const data = await response.json();
            console.log('✅ REST API Response received');
            console.log(`📊 Tweet count: ${data.tweets?.length || 0}`);
            if (data.tweets?.length > 0) {
                console.log('📝 Sample tweet:', data.tweets[0].full_text.substring(0, 100) + '...');
            }
        } catch (error) {
            console.error('❌ REST API Test failed:', error);
        }
    }
}

async function runTests() {
    console.log('🚀 Starting Railway deployment tests...');
    
    // Test health endpoint first
    try {
        const healthResponse = await fetch(`${API_URL}/health`);
        if (healthResponse.ok) {
            const health = await healthResponse.json();
            console.log('✅ Health check passed:', health);
        } else {
            console.error('❌ Health check failed:', healthResponse.status);
            return;
        }
    } catch (error) {
        console.error('❌ Could not connect to Railway deployment:', error);
        return;
    }

    // Run the main tests
    await testRESTAPI();
    await testWebSocket();
    
    console.log('\n✨ All tests completed!');
    process.exit(0);
}

runTests();