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

# Logs mais antigos que isso são apagados a cada execução
$LOG_RETENTION_DAYS = 30

# Leituras de CPU (1 por segundo) para tirar a média e não pegar só um pico
$CPU_SAMPLES = 3

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

# Apaga os arquivos de log antigos para não encher o disco da PDV
function Remove-OldLogs {
    if (-not (Test-Path $logDirectory)) {
        return
    }

    try {
        $limit = (Get-Date).AddDays(-$LOG_RETENTION_DAYS)
        Get-ChildItem -Path $logDirectory -Filter "health-check-*.log" |
            Where-Object { $_.LastWriteTime -lt $limit } |
            Remove-Item -Force
    } catch {
        Write-Log "Não foi possível apagar logs antigos: $($_.Exception.Message)" -Level AVISO
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

# IPv4 da placa de rede que tem gateway (a que sai para a rede da loja).
# O IP é opcional na API: se não achar, o envio segue sem ele.
function Get-MachineIp {
    try {
        $adapters = Get-CimInstance -ClassName Win32_NetworkAdapterConfiguration -Filter "IPEnabled = TRUE" |
            Where-Object { $_.DefaultIPGateway }

        foreach ($adapter in $adapters) {
            # 169.254.x.x = endereço automático do Windows quando não há DHCP; não serve
            $ipv4 = $adapter.IPAddress | Where-Object { $_ -match '^\d{1,3}(\.\d{1,3}){3}$' -and $_ -notlike "169.254.*" } |
                Select-Object -First 1
            if ($ipv4) {
                return $ipv4
            }
        }
    } catch {
        Write-Log "Não foi possível ler o IP: $($_.Exception.Message)" -Level AVISO
    }

    Write-Log "IP não encontrado; enviando sem o IP" -Level AVISO
    return $null
}

# Tamanho total e espaço livre do drive C:, em GB (só o C:, conforme o contrato)
function Get-DiskInfo {
    $disk = Get-CimInstance -ClassName Win32_LogicalDisk -Filter "DeviceID = 'C:'"
    if (-not $disk -or -not $disk.Size) {
        throw "Não foi possível ler o disco C:"
    }

    return @{
        totalGb = [Math]::Round($disk.Size / 1GB, 1)
        freeGb  = [Math]::Round($disk.FreeSpace / 1GB, 1)
    }
}

# Uso de CPU em %: média de algumas leituras de 1 em 1 segundo.
# Usa WMI e não Get-Counter porque os nomes dos contadores mudam no Windows em português.
function Get-CpuUsage {
    $readings = @()
    for ($i = 1; $i -le $CPU_SAMPLES; $i++) {
        # Em máquinas com mais de um processador físico vem um valor por processador
        $load = Get-CimInstance -ClassName Win32_Processor |
            Measure-Object -Property LoadPercentage -Average
        if ($null -ne $load.Average) {
            $readings += $load.Average
        }
        if ($i -lt $CPU_SAMPLES) {
            Start-Sleep -Seconds 1
        }
    }

    if ($readings.Count -eq 0) {
        throw "Não foi possível ler o uso de CPU"
    }

    $average = ($readings | Measure-Object -Average).Average
    return [Math]::Round([Math]::Min([Math]::Max($average, 0), 100), 1)
}

# Uso de memória RAM em % (o Windows informa os valores em KB)
function Get-MemoryUsage {
    $os = Get-CimInstance -ClassName Win32_OperatingSystem
    if (-not $os.TotalVisibleMemorySize) {
        throw "Não foi possível ler a memória"
    }

    $used = $os.TotalVisibleMemorySize - $os.FreePhysicalMemory
    return [Math]::Round(($used / $os.TotalVisibleMemorySize) * 100, 1)
}

# Situação do sistema de vendas, que é um .exe (não um serviço do Windows):
#   NAO_ENCONTRADO = o .exe não existe no caminho configurado
#   RODANDO        = o programa está aberto
#   PARADO         = o .exe existe, mas o programa está fechado
# Só consulta a lista de processos: não abre nem fecha o programa.
function Get-SalesSystemStatus {
    param([Parameter(Mandatory)] [string]$ExePath)

    if (-not (Test-Path -Path $ExePath -PathType Leaf)) {
        return "NAO_ENCONTRADO"
    }

    # O nome do processo é o nome do arquivo sem o ".exe" (C:\SETA\vendas.exe → vendas)
    $processName = [IO.Path]::GetFileNameWithoutExtension($ExePath)
    if (Get-Process -Name $processName -ErrorAction SilentlyContinue) {
        return "RODANDO"
    }
    return "PARADO"
}

# Situação de uma impressora do Windows (Win32_Printer):
#   WorkOffline / PrinterStatus 7 / DetectedErrorState 9 = OFFLINE
#   PrinterStatus 6 (parou de imprimir) ou erros de hardware = ERRO
#   Pouco papel (DetectedErrorState 3) ainda imprime, então conta como OK
function Get-SinglePrinterStatus {
    param([Parameter(Mandatory)] $Printer)

    if ($Printer.WorkOffline -or $Printer.PrinterStatus -eq 7 -or $Printer.DetectedErrorState -eq 9) {
        return "OFFLINE"
    }

    # 4 sem papel, 6 sem toner, 7 tampa aberta, 8 papel enroscado, 10 precisa de manutenção, 11 bandeja cheia
    $hardwareErrors = @(4, 6, 7, 8, 10, 11)
    if ($Printer.PrinterStatus -eq 6 -or $hardwareErrors -contains $Printer.DetectedErrorState) {
        return "ERRO"
    }

    return "OK"
}

# Situação da impressora fiscal: procura as impressoras cujo nome bate com algum padrão
# do config (ex.: *TM-T20*). Se houver mais de uma, vale a melhor situação, porque o
# Windows às vezes mantém cópias antigas da mesma impressora que ficam sempre offline.
function Get-FiscalPrinterStatus {
    param([Parameter(Mandatory)] [string[]]$NamePatterns)

    $printers = @(Get-CimInstance -ClassName Win32_Printer | Where-Object {
        $printerName = $_.Name
        @($NamePatterns | Where-Object { $printerName -like $_ }).Count -gt 0
    })

    if ($printers.Count -eq 0) {
        return "NAO_ENCONTRADA"
    }

    $statuses = @($printers | ForEach-Object {
        $status = Get-SinglePrinterStatus -Printer $_
        Write-Log "Impressora '$($_.Name)': $status (PrinterStatus=$($_.PrinterStatus), DetectedErrorState=$($_.DetectedErrorState), WorkOffline=$($_.WorkOffline))"
        $status
    })

    foreach ($best in @("OK", "ERRO", "OFFLINE")) {
        if ($statuses -contains $best) {
            return $best
        }
    }
}

# Monta o corpo do envio no formato do contrato (seção 1)
function Get-HealthCheckData {
    param(
        [Parameter(Mandatory)] [string]$MachineName,
        [Parameter(Mandatory)] $Config
    )

    $disk = Get-DiskInfo

    # Data/hora da PDV com o fuso, ex.: 2026-10-29T14:30:00-03:00 (a API exige o fuso)
    $collectedAt = (Get-Date).ToString("yyyy-MM-dd'T'HH:mm:sszzz", [Globalization.CultureInfo]::InvariantCulture)

    $data = [ordered]@{
        hostname         = $MachineName
        coletadoEm       = $collectedAt
        discoTotalGb     = $disk.totalGb
        discoLivreGb     = $disk.freeGb
        cpuUso           = Get-CpuUsage
        memoriaUso       = Get-MemoryUsage
        servicoVendas    = Get-SalesSystemStatus -ExePath $Config.caminhoSistemaVendas
        impressoraFiscal = Get-FiscalPrinterStatus -NamePatterns $Config.padroesImpressora
    }

    $ip = Get-MachineIp
    if ($ip) {
        $data.ip = $ip
    }

    return $data
}

# Envia para POST /api/health-checks e devolve a resposta da API ({ id, status, motivos })
function Send-HealthCheck {
    param(
        [Parameter(Mandatory)] $Data,
        [Parameter(Mandatory)] $Config
    )

    # O PowerShell 5.1 não liga o TLS 1.2 sozinho; sem isso o HTTPS de produção falha
    [Net.ServicePointManager]::SecurityProtocol = [Net.ServicePointManager]::SecurityProtocol -bor [Net.SecurityProtocolType]::Tls12

    $json = $Data | ConvertTo-Json -Compress
    $request = @{
        Uri         = "$($Config.urlApi)/api/health-checks"
        Method      = "Post"
        Headers     = @{ "X-API-Key" = $Config.chaveApi }
        ContentType = "application/json; charset=utf-8"
        Body        = [Text.Encoding]::UTF8.GetBytes($json)
        TimeoutSec  = $Config.timeoutSegundos
    }

    try {
        return Invoke-RestMethod @request
    } catch {
        # Erro com resposta da API (400, 401, 403, 500): mostra o código e a mensagem dela
        $response = $_.Exception.Response
        if ($response) {
            $statusCode = [int]$response.StatusCode
            $apiMessage = $_.ErrorDetails.Message
            if (-not $apiMessage) {
                $apiMessage = $_.Exception.Message
            }
            throw "API respondeu $statusCode : $apiMessage"
        }
        # Sem resposta: API fora do ar, sem rede ou tempo esgotado
        throw "Não foi possível falar com a API em $($Config.urlApi): $($_.Exception.Message)"
    }
}

# Execução principal. Código de saída: 0 = sucesso, 1 = erro (aparece no Agendador de Tarefas)
$exitCode = 0
try {
    Write-Log "Início da execução"
    Remove-OldLogs

    $config = Read-Config -Path $ConfigPath
    $machineName = Resolve-MachineName -Override $Hostname

    $data = Get-HealthCheckData -MachineName $machineName -Config $config
    Write-Log ("Coletado: disco C: {0} de {1} GB livres, CPU {2}%, memória {3}%, sistema de vendas {4}, impressora {5}, IP {6}" -f `
        $data.discoLivreGb, $data.discoTotalGb, $data.cpuUso, $data.memoriaUso, $data.servicoVendas, $data.impressoraFiscal, $(if ($data.Contains("ip")) { $data.ip } else { "-" }))

    $result = Send-HealthCheck -Data $data -Config $config
    $reasons = @($result.motivos)
    if ($reasons.Count -gt 0) {
        Write-Log "Enviado (registro $($result.id)): status $($result.status) - $($reasons -join '; ')"
    } else {
        Write-Log "Enviado (registro $($result.id)): status $($result.status)"
    }
} catch {
    Write-Log $_.Exception.Message -Level ERRO
    $exitCode = 1
}

exit $exitCode
