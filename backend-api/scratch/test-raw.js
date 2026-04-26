const mysql = require('mysql2/promise');

async function test() {
  try {
    console.log('🔍 Testing raw mysql2 connection to 47.115.217.110...');
    const connection = await mysql.createConnection({
      host: '47.115.217.110',
      user: 'ai_interview_db',
      password: '6BiFhGL7tG4r46Dz',
      database: 'ai_interview_db',
      connectTimeout: 10000
    });
    
    console.log('✅ Connection established!');
    const [rows] = await connection.execute('SELECT 1 as result');
    console.log('Result:', rows);
    await connection.end();
  } catch (err) {
    console.log('❌ Raw Error Code:', err.code);
    console.log('❌ Raw Error Message:', err.message);
    console.log('❌ Raw Error Stack:', err.stack);
  }
}

test();
