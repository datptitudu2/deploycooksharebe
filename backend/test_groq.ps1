# Test Groq API directly
# Usage: .\test_groq.ps1

Write-Host "🧪 Testing Groq API" -ForegroundColor Cyan
Write-Host ""

# Read .env file
$envFile = Join-Path $PSScriptRoot ".env"
if (-not (Test-Path $envFile)) {
    Write-Host "❌ .env file not found!" -ForegroundColor Red
    exit 1
}

# Get GROQ_API_KEY from .env
$envContent = Get-Content $envFile -Raw
$groqKeyMatch = $envContent -match "GROQ_API_KEY=(.+)"
if (-not $groqKeyMatch) {
    Write-Host "❌ GROQ_API_KEY not found in .env!" -ForegroundColor Red
    exit 1
}

$groqKey = ($envContent -split "GROQ_API_KEY=")[1] -split "`n" | Select-Object -First 1 | ForEach-Object { $_.Trim() }
$groqModel = ($envContent -split "GROQ_MODEL=")[1] -split "`n" | Select-Object -First 1 | ForEach-Object { $_.Trim() }

if (-not $groqKey) {
    Write-Host "❌ GROQ_API_KEY is empty!" -ForegroundColor Red
    exit 1
}

Write-Host "✅ Found GROQ_API_KEY: $($groqKey.Substring(0, 10))..." -ForegroundColor Green
Write-Host "✅ Model: $groqModel" -ForegroundColor Green
Write-Host ""

# Test Groq API
Write-Host "Testing Groq API call..." -ForegroundColor Yellow
$body = @{
    model = $groqModel
    messages = @(
        @{
            role = "system"
            content = "Bạn là CookBot - AI tư vấn món ăn."
        },
        @{
            role = "user"
            content = "Xin chào"
        }
    )
    temperature = 0.7
    max_tokens = 100
} | ConvertTo-Json -Depth 10

try {
    $response = Invoke-RestMethod -Uri "https://api.groq.com/openai/v1/chat/completions" -Method POST -Headers @{
        "Content-Type" = "application/json"
        "Authorization" = "Bearer $groqKey"
    } -Body $body -TimeoutSec 30
    
    Write-Host "✅ SUCCESS!" -ForegroundColor Green
    Write-Host ""
    Write-Host "Response:" -ForegroundColor Cyan
    Write-Host $response.choices[0].message.content -ForegroundColor White
} catch {
    Write-Host "❌ ERROR: $($_.Exception.Message)" -ForegroundColor Red
    if ($_.Exception.Response) {
        $reader = New-Object System.IO.StreamReader($_.Exception.Response.GetResponseStream())
        $responseBody = $reader.ReadToEnd()
        Write-Host "Response body: $responseBody" -ForegroundColor Yellow
    }
}


