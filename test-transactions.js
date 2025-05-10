// Test script để thực hiện các API call cho TransactionController
const fetch = require('node-fetch');
const BASE_URL = 'http://localhost:3000';
let authToken = '';

// Mock token cho test (cần thay thế bằng token thật từ đăng nhập)
// Token này chỉ để test
authToken = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpZCI6MSwiaG9fdGVuIjoiQWRtaW4iLCJlbWFpbCI6ImFkbWluQHRrZGsuY29tIiwibG9haV90YWlfa2hvYW4iOiJhZG1pbiIsImlhdCI6MTcwMTYwNzQ1MSwiZXhwIjoxNzAxNjEwNzUxfQ.7LuRXQXrGtE9kHaFLYyMuvL5dtOWn1_0x3uHStn5rFE';

async function testAllTransactions() {
    try {
        console.log('Testing getAllTransactions...');
        const response = await fetch(`${BASE_URL}/api/admin/transactions`, {
            method: 'GET',
            headers: {
                'Authorization': `Bearer ${authToken}`,
                'Content-Type': 'application/json'
            }
        });
        
        const data = await response.json();
        console.log('Response status:', response.status);
        console.log('Response data:', JSON.stringify(data, null, 2));
    } catch (error) {
        console.error('Test failed:', error);
    }
}

async function testTransactionStats() {
    try {
        console.log('Testing getTransactionStats...');
        const response = await fetch(`${BASE_URL}/api/admin/transactions/stats`, {
            method: 'GET',
            headers: {
                'Authorization': `Bearer ${authToken}`,
                'Content-Type': 'application/json'
            }
        });
        
        const data = await response.json();
        console.log('Response status:', response.status);
        console.log('Response data:', JSON.stringify(data, null, 2));
    } catch (error) {
        console.error('Test failed:', error);
    }
}

async function testTransactionsByStatus(status = 'pending') {
    try {
        console.log(`Testing getTransactionsByStatus with status=${status}...`);
        const response = await fetch(`${BASE_URL}/api/admin/transactions/status/${status}`, {
            method: 'GET',
            headers: {
                'Authorization': `Bearer ${authToken}`,
                'Content-Type': 'application/json'
            }
        });
        
        const data = await response.json();
        console.log('Response status:', response.status);
        console.log('Response data:', JSON.stringify(data, null, 2));
    } catch (error) {
        console.error('Test failed:', error);
    }
}

async function testTransactionById(id = 1) {
    try {
        console.log(`Testing getTransactionById with id=${id}...`);
        const response = await fetch(`${BASE_URL}/api/admin/transactions/${id}`, {
            method: 'GET',
            headers: {
                'Authorization': `Bearer ${authToken}`,
                'Content-Type': 'application/json'
            }
        });
        
        const data = await response.json();
        console.log('Response status:', response.status);
        console.log('Response data:', JSON.stringify(data, null, 2));
    } catch (error) {
        console.error('Test failed:', error);
    }
}

async function testExportTransactions() {
    try {
        console.log('Testing exportTransactions...');
        const today = new Date();
        const oneMonthAgo = new Date(today.getFullYear(), today.getMonth() - 1, today.getDate());
        
        const startDate = oneMonthAgo.toISOString().split('T')[0];
        const endDate = today.toISOString().split('T')[0];
        
        const response = await fetch(`${BASE_URL}/api/admin/transactions/export?startDate=${startDate}&endDate=${endDate}`, {
            method: 'GET',
            headers: {
                'Authorization': `Bearer ${authToken}`,
                'Content-Type': 'application/json'
            }
        });
        
        const data = await response.json();
        console.log('Response status:', response.status);
        console.log('Response data:', JSON.stringify(data, null, 2));
    } catch (error) {
        console.error('Test failed:', error);
    }
}

// Chạy tất cả các test
async function runAllTests() {
    await testAllTransactions();
    await testTransactionStats();
    await testTransactionsByStatus('pending');
    await testTransactionById(1);
    await testExportTransactions();
}

// Thực hiện test
runAllTests();

// Để chạy test:
// 1. Cài đặt node-fetch: npm install node-fetch
// 2. Chạy script: node test-transactions.js
