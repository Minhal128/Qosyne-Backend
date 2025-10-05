const axios = require('axios');
const crypto = require('crypto');
const { HttpsProxyAgent } = require('https-proxy-agent');
require('dotenv').config();

// Extended proxy list
const PROXY_LIST = [
  'http://140.174.52.105:8888',
  'http://162.238.123.152:8888',
  'http://34.94.98.68:8080',
  'http://159.65.221.25:80',
  'http://138.68.60.8:80',
  'http://50.122.86.118:80',
  'http://209.97.150.167:8080'
];

class MinimalRapydTest {
  constructor() {
    this.accessKey = process.env.RAPYD_ACCESS_KEY;
    this.secretKey = process.env.RAPYD_SECRET_KEY;
    this.walletId = process.env.RAPYD_WALLET_ID;
    this.baseUrl = process.env.RAPYD_BASE_URL;
  }

  async findWorkingProxy() {
    console.log('🔍 Finding working proxy...');
    
    for (const proxy of PROXY_LIST) {
      try {
        console.log(`Testing ${proxy}...`);
        const agent = new HttpsProxyAgent(proxy);
        
        await axios.get('https://httpbin.org/ip', {
          httpsAgent: agent,
          timeout: 5000
        });
        
        console.log(`✅ Found working proxy: ${proxy}`);
        return agent;
        
      } catch (error) {
        console.log(`❌ ${proxy} failed`);
      }
    }
    
    throw new Error('No working proxies found');
  }

  generateSignature(method, path, salt, timestamp, body = '') {
    // Exact Rapyd signature generation
    const toSign = method + path + salt + timestamp + this.accessKey + this.secretKey + body;
    return crypto.createHmac('sha256', this.secretKey)
                 .update(toSign, 'utf8')
                 .digest('base64');
  }

  async testAPI() {
    console.log('🧪 MINIMAL RAPYD API TEST');
    console.log('==========================');
    
    // Find a working proxy
    const proxyAgent = await this.findWorkingProxy();
    
    const method = 'GET';
    const path = `/v1/user/${this.walletId}`;
    const salt = crypto.randomBytes(8).toString('hex');
    const timestamp = Math.floor(Date.now() / 1000).toString();
    const body = '';

    const signature = this.generateSignature(method, path, salt, timestamp, body);

    console.log('Request Details:');
    console.log('- Method:', method);
    console.log('- Path:', path);
    console.log('- Salt:', salt);
    console.log('- Timestamp:', timestamp);
    console.log('- Access Key:', this.accessKey);
    console.log('- Signature:', signature);
    console.log('');

    // Headers exactly as documented
    const headers = {
      'Content-Type': 'application/json',
      'access_key': this.accessKey,
      'salt': salt,
      'timestamp': timestamp,
      'signature': signature
    };

    console.log('Headers:');
    Object.entries(headers).forEach(([key, value]) => {
      console.log(`- ${key}: ${value}`);
    });

    const url = this.baseUrl + path;
    console.log('\\nURL:', url);
    
    try {
      const response = await axios.get(url, {
        headers,
        httpsAgent: proxyAgent,
        timeout: 10000
      });
      
      console.log('\\n✅ SUCCESS!');
      console.log('Status:', response.status);
      console.log('Response:', JSON.stringify(response.data, null, 2));
      return response.data;
      
    } catch (error) {
      console.log('\\n❌ ERROR:');
      console.log('Message:', error.message);
      
      if (error.response) {
        console.log('Status:', error.response.status);
        console.log('Response:', JSON.stringify(error.response.data, null, 2));
        
        // Let's try a different signature approach if it's a 401
        if (error.response.status === 401) {
          console.log('\\n🔄 Trying alternative signature format...');
          
          // Try with hex-encoded signature instead
          const hexSignature = crypto.createHmac('sha256', this.secretKey)
                                    .update(method + path + salt + timestamp + this.accessKey + this.secretKey + body)
                                    .digest('hex');
          
          console.log('Hex signature:', hexSignature);
          
          const altHeaders = {
            ...headers,
            'signature': hexSignature
          };
          
          try {
            const altResponse = await axios.get(url, {
              headers: altHeaders,
              httpsAgent: proxyAgent,
              timeout: 10000
            });
            
            console.log('✅ Alternative signature worked!');
            console.log('Response:', JSON.stringify(altResponse.data, null, 2));
            return altResponse.data;
            
          } catch (altError) {
            console.log('❌ Alternative signature also failed');
          }
        }
      }
      
      throw error;
    }
  }
}

async function test() {
  const tester = new MinimalRapydTest();
  await tester.testAPI();
}

test().catch(console.error);
