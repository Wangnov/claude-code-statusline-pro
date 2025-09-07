import https from 'https';

// 从环境变量获取API密钥
const apiKey = process.env.ANTHROPIC_AUTH_TOKEN;
const baseUrl = process.env.ANTHROPIC_BASE_URL;

if (!apiKey) {
  console.error('Error: ANTHROPIC_AUTH_TOKEN environment variable not set');
  process.exit(1);
}

console.log('Base URL:', baseUrl);
console.log('API Key:', apiKey ? `${apiKey.substring(0, 10)}...` : 'Not set');

// 测试获取使用情况
function testUsageAPI() {
  console.log('\n=== Testing Usage API ===');
  
  const options = {
    hostname: 'co.yes.vg',
    path: '/team/stats/usage?period=month&limit=10',
    method: 'GET',
    headers: {
      'X-API-Key': apiKey,
      'Content-Type': 'application/json'
    }
  };

  const req = https.request(options, (res) => {
    let data = '';
    
    res.on('data', (chunk) => {
      data += chunk;
    });
    
    res.on('end', () => {
      console.log('Status Code:', res.statusCode);
      console.log('Response Headers:', res.headers);
      try {
        const json = JSON.parse(data);
        console.log('Usage Data:', JSON.stringify(json, null, 2));
      } catch (e) {
        console.log('Raw Response:', data);
      }
      
      // 测试第二个API
      testSpendingAPI();
    });
  });
  
  req.on('error', (error) => {
    console.error('Error:', error);
  });
  
  req.end();
}

// 测试获取消费情况
function testSpendingAPI() {
  console.log('\n=== Testing Spending API ===');
  
  const options = {
    hostname: 'co.yes.vg',
    path: '/team/stats/spending',
    method: 'GET',
    headers: {
      'X-API-Key': apiKey,
      'Content-Type': 'application/json'
    }
  };

  const req = https.request(options, (res) => {
    let data = '';
    
    res.on('data', (chunk) => {
      data += chunk;
    });
    
    res.on('end', () => {
      console.log('Status Code:', res.statusCode);
      console.log('Response Headers:', res.headers);
      try {
        const json = JSON.parse(data);
        console.log('Spending Data:', JSON.stringify(json, null, 2));
      } catch (e) {
        console.log('Raw Response:', data);
      }
    });
  });
  
  req.on('error', (error) => {
    console.error('Error:', error);
  });
  
  req.end();
}

// 开始测试
testUsageAPI();