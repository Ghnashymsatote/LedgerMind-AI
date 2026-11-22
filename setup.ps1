# Run after starting Docker Desktop in Linux container mode.
param(
    [string]$AdminEmail
)

$ErrorActionPreference = "Stop"
if (-not (Get-Command docker -ErrorAction SilentlyContinue)) {
    throw "Install and start Docker Desktop, then run this script again."
}

function Invoke-Docker {
    docker @args
    if ($LASTEXITCODE -ne 0) {
        throw "Docker command failed with exit code $LASTEXITCODE."
    }
}

Push-Location -LiteralPath $PSScriptRoot
try {
    $engine = Invoke-Docker info --format '{{.OSType}}'
    if ($engine -ne "linux") {
        throw "Switch Docker Desktop to Linux containers and run this script again."
    }

    if (-not (Test-Path -LiteralPath .env)) {
        Copy-Item -LiteralPath .env.example -Destination .env
        Write-Host "Created .env from .env.example."
    }

    $compose = @("compose", "--env-file", ".env", "-f", "infra/docker-compose.yml")
    Invoke-Docker @compose up --build --wait --wait-timeout 180
    Invoke-Docker @compose ps -a

    if ($AdminEmail) {
        $oldEncoding = $OutputEncoding
        try {
            $OutputEncoding = [Text.UTF8Encoding]::new($false)
            $password = Read-Host "Password for $AdminEmail (at least 12 characters)" -AsSecureString
            [Net.NetworkCredential]::new("", $password).Password |
                docker @compose exec -T api pnpm --filter @ledgermind/api user:create $AdminEmail ADMIN
            if ($LASTEXITCODE -ne 0) {
                throw "The stack is running. Account creation failed."
            }
        } finally {
            $OutputEncoding = $oldEncoding
        }
    }

    $address = Invoke-Docker @compose port web 3000
    Write-Host "Open http://$address/login"
    if (-not $AdminEmail) {
        Write-Host "For a new database, see 'Sign in and manage suppliers' in README.md to create an account."
    }
} finally {
    Pop-Location
}
