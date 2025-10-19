@echo off
echo ========================================
echo   BRAINTREE CREDENTIAL UPDATE HELPER
echo ========================================
echo.
echo Current credentials are INVALID and need to be replaced.
echo.
echo STEP 1: Get your real credentials
echo   Go to: https://sandbox.braintreegateway.com/
echo   Login, then go to Settings -^> API Keys
echo.
echo STEP 2: Open your .env file
echo   Location: src\backend\.env
echo.
echo STEP 3: Find these lines and replace them:
echo.
echo   BT_MERCHANT_ID=j54z5ccv9gndbfh9
echo   BT_PUBLIC_KEY=ttkchmphjhdc6nc5
echo   BT_PRIVATE_KEY=044a1637665820acef343f02deb9f118
echo.
echo STEP 4: Test your credentials
echo   Run: node test-real-braintree-credentials.js
echo.
echo STEP 5: Restart your server
echo.
echo ========================================
echo.
pause
start https://sandbox.braintreegateway.com/
echo.
echo Opening Braintree Sandbox Dashboard in your browser...
echo.
echo After getting credentials, edit: src\backend\.env
echo.
pause