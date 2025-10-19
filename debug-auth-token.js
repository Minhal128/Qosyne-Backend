const jwt = require('jsonwebtoken');

function debugAuthToken() {
  console.log('🔍 Debug: How to check your current user ID\n');
  
  console.log('To debug which user you\'re authenticated as:');
  console.log('1. Open browser developer tools (F12)');
  console.log('2. Go to Application/Storage tab');
  console.log('3. Look for localStorage or sessionStorage');
  console.log('4. Find the JWT token (usually stored as "token" or "authToken")');
  console.log('5. Copy the token and paste it below:\n');
  
  // Example of how to decode a token
  console.log('Example token decoding:');
  console.log('const jwt = require("jsonwebtoken");');
  console.log('const decoded = jwt.decode("YOUR_TOKEN_HERE");');
  console.log('console.log("User ID:", decoded.userId);\n');
  
  // If you have a token, you can test it here
  const exampleToken = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJ1c2VySWQiOjQsInJvbGUiOiJVU0VSIiwiaWF0IjoxNzU5Njk0Mzk3LCJleHAiOjE3NjAyOTkxOTd9._S8NwlyRKsGzWHBI96IdF0rom4ZNQ4tuZYD7CRSdqG0';
  
  try {
    const decoded = jwt.decode(exampleToken);
    console.log('📋 Example token from your error log decodes to:');
    console.log('   User ID:', decoded.userId);
    console.log('   Role:', decoded.role);
    console.log('   Issued at:', new Date(decoded.iat * 1000));
    console.log('   Expires at:', new Date(decoded.exp * 1000));
  } catch (error) {
    console.log('Could not decode example token');
  }
}

debugAuthToken();
