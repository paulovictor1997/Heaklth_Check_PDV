<#
.SYNOPSIS
    Health Check PDV: coleta o estado do caixa e envia para a API central.

.DESCRIPTION
    Executado pelo Agendador de Tarefas do Windows a cada 5 minutos.
    Apenas LÊ informações da máquina: não abre, fecha nem altera nada no PDV.
    Formato do envio: backend/docs/contrato-api.md, seção 1.

    Compatível com o Windows PowerShell 5.1, que já vem no Windows 10/11.
    Este arquivo precisa ficar salvo em UTF-8 com BOM; sem o BOM o PowerShell 5.1
    lê os acentos errado.

.PARAMETER ConfigPath
    Caminho do config.json. Padrão: config.json na mesma pasta do script.

.PARAMETER Hostname
    SOMENTE PARA TESTE: usa este nome no lugar do nome real do computador,
    para testar de uma máquina que não é PDV (ex.: -Hostname L001-CX01).

.EXAMPLE
    powershell -ExecutionPolicy Bypass -File .\health-check.ps1 -Hostname L001-CX01
#>
[CmdletBinding()]
param(
    [string]$ConfigPath,
    [string]$Hostname
)

Set-StrictMode -Version Latest
$ErrorActionPreference = "Stop"

# O padrão fica aqui e não no param(): no PowerShell 5.1 o $PSScriptRoot ainda está vazio lá
if (-not $ConfigPath) {
    $ConfigPath = Join-Path $PSScriptRoot "config.json"
}

# "L001-CX01": o mesmo formato que a API valida (HOSTNAME_REGEX no backend)
$HOSTNAME_PATTERN = '^L\d{3}-CX\d{2}$'

# "hcpdv_" + 32 bytes em base64url (43 caracteres), gerada por scripts/generate-api-key.js no backend
$API_KEY_PATTERN = '^hcpdv_[A-Za-z0-9_-]{43}$'

$logDirectory = Join-Path $PSScriptRoot "logs"

# Uma linha por evento, um arquivo por dia: logs\health-check-2026-10-28.log
# Nunca registrar a chave da API no log.
function Write-Log {
    param(
        [Parameter(Mandatory)] [string]$Message,
        [ValidateSet("INFO", "AVISO", "ERRO")] [string]$Level = "INFO"
    )

    $line = "{0} [{1}] {2}" -f (Get-Date -Format "yyyy-MM-dd HH:mm:ss"), $Level, $Message
    Write-Host $line

    try {
        if (-not (Test-Path $logDirectory)) {
            New-Item -ItemType Directory -Path $logDirectory | Out-Null
        }
        $logFile = Join-Path $logDirectory ("health-check-{0}.log" -f (Get-Date -Format "yyyy-MM-dd"))
        Add-Content -Path $logFile -Value $line -Encoding UTF8
    } catch {
        # Sem log em disco o script segue: o envio para a API é o que importa
        Write-Host "Não foi possível gravar o log: $($_.Exception.Message)"
    }
}

# Lê o config.json e confere cada campo; qualquer problema interrompe a execução com uma mensagem clara
function Read-Config {
    param([Parameter(Mandatory)] [string]$Path)

    if (-not (Test-Path $Path)) {
        throw "Configuração não encontrada em '$Path'. Copie o config.example.json para config.json e preencha."
    }

    try {
        # -Encoding UTF8: sem isso o PowerShell 5.1 lê acentos e caracteres especiais errado
        $config = Get-Content -Path $Path -Raw -Encoding UTF8 | ConvertFrom-Json
    } catch {
        throw "config.json inválido (JSON mal formado): $($_.Exception.Message)"
    }

    $requiredFields = @("urlApi", "chaveApi", "caminhoSistemaVendas", "padroesImpressora", "timeoutSegundos")
    $missingFields = @($requiredFields | Where-Object { -not $config.PSObject.Properties[$_] -or -not $config.$_ })
    if ($missingFields.Count -gt 0) {
        throw "config.json sem os campos: $($missingFields -join ', ')"
    }

    $uri = $null
    if (-not [Uri]::TryCreate($config.urlApi, [UriKind]::Absolute, [ref]$uri) -or $uri.Scheme -notin @("http", "https")) {
        throw "urlApi inválida: '$($config.urlApi)' (ex.: https://healthcheck.empresa.com.br)"
    }
    # Fora do teste local o tráfego precisa ser HTTPS (README, seção 4.4)
    if ($uri.Scheme -eq "http" -and $uri.Host -notin @("localhost", "127.0.0.1")) {
        Write-Log "urlApi usa http:// fora do teste local; em produção use https://" -Level AVISO
    }
    # Sem a barra final, para montar "$urlApi/api/health-checks" sem barra dupla
    $config.urlApi = $config.urlApi.TrimEnd("/")

    if ($config.chaveApi -cnotmatch $API_KEY_PATTERN) {
        throw "chaveApi inválida: cole a chave da loja gerada pelo backend (começa com hcpdv_)"
    }

    if ($config.caminhoSistemaVendas -notlike "*.exe") {
        throw "caminhoSistemaVendas deve apontar para o .exe do sistema de vendas (ex.: C:\SETA\sistema.exe)"
    }

    # Vira lista mesmo que o JSON traga um texto só
    $config.padroesImpressora = @($config.padroesImpressora | Where-Object { $_ })
    if ($config.padroesImpressora.Count -eq 0) {
        throw "padroesImpressora precisa de pelo menos um padrão de nome (ex.: *TM-T20*)"
    }

    $timeout = 0
    if (-not [int]::TryParse([string]$config.timeoutSegundos, [ref]$timeout) -or $timeout -lt 1 -or $timeout -gt 120) {
        throw "timeoutSegundos deve ser um número inteiro de 1 a 120"
    }
    $config.timeoutSegundos = $timeout

    return $config
}

# Nome real do computador, ou o informado em -Hostname no modo de teste
function Resolve-MachineName {
    param([string]$Override)

    if ($Override) {
        Write-Log "MODO DE TESTE: usando '$Override' no lugar do nome real '$env:COMPUTERNAME'" -Level AVISO
        $name = $Override
    } else {
        $name = $env:COMPUTERNAME
    }

    $name = $name.Trim().ToUpper()
    if ($name -notmatch $HOSTNAME_PATTERN) {
        throw "Nome '$name' fora do padrão L000-CX00 (ex.: L001-CX01). Renomeie a máquina ou, para teste, use -Hostname."
    }
    return $name
}

# Execução principal. Código de saída: 0 = sucesso, 1 = erro (aparece no Agendador de Tarefas)
$exitCode = 0
try {
    Write-Log "Início da execução"

    $config = Read-Config -Path $ConfigPath
    $machineName = Resolve-MachineName -Override $Hostname
    Write-Log "Configuração OK: máquina $machineName, API $($config.urlApi)"

    # Próximas partes da Etapa 5:
    #   Parte 2: IP, disco C:, CPU e memória
    #   Parte 3: sistema de vendas e impressora fiscal
    #   Parte 4: envio para a API (POST /api/health-checks)
    Write-Log "Coleta e envio ainda não implementados (Etapa 5, partes 2 a 4)" -Level AVISO
} catch {
    Write-Log $_.Exception.Message -Level ERRO
    $exitCode = 1
}

exit $exitCode
