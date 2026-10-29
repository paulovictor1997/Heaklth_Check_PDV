<#
.SYNOPSIS
    Instala (ou remove) a tarefa do Agendador do Windows que roda o health-check.ps1 a cada 5 minutos.

.DESCRIPTION
    Rodar UMA VEZ em cada PDV, como administrador, a partir da pasta onde estão
    health-check.ps1 e config.json (ex.: C:\HealthCheckPDV).

    A tarefa roda como SYSTEM: funciona mesmo sem ninguém logado no caixa e não abre janela.
    Depois de instalar, a tarefa é executada uma vez na hora e o resultado aparece na tela.

    Rodar de novo é seguro: a tarefa antiga é substituída pela nova.

    Este arquivo precisa ficar salvo em UTF-8 com BOM, como o health-check.ps1.

.PARAMETER Remove
    Remove a tarefa em vez de instalar.

.PARAMETER Hostname
    SOMENTE PARA TESTE fora de uma PDV: a tarefa roda o health-check.ps1 com -Hostname.
    Lembre de remover a tarefa (-Remove) depois do teste.

.EXAMPLE
    powershell -ExecutionPolicy Bypass -File .\install-task.ps1

.EXAMPLE
    powershell -ExecutionPolicy Bypass -File .\install-task.ps1 -Remove
#>
[CmdletBinding()]
param(
    [switch]$Remove,
    [string]$Hostname
)

Set-StrictMode -Version Latest
$ErrorActionPreference = "Stop"

$TASK_NAME = "HealthCheckPDV"
$INTERVAL_MINUTES = 5

# Se uma execução travar, o Windows encerra depois disso (o normal é ~10 segundos)
$EXECUTION_LIMIT_MINUTES = 2

# Quanto tempo esperar pela primeira execução logo após instalar
$FIRST_RUN_WAIT_SECONDS = 60

# SIDs fixos: os nomes "Administradores"/"SYSTEM" mudam conforme o idioma do Windows
$SID_SYSTEM = "*S-1-5-18"
$SID_ADMINISTRATORS = "*S-1-5-32-544"

function Test-IsAdministrator {
    $identity = [Security.Principal.WindowsIdentity]::GetCurrent()
    $principal = New-Object Security.Principal.WindowsPrincipal $identity
    return $principal.IsInRole([Security.Principal.WindowsBuiltInRole]::Administrator)
}

# Deixa o config.json legível só para SYSTEM e administradores: ele guarda a chave da loja,
# e o usuário do caixa não precisa (nem deve) ver
function Protect-ConfigFile {
    param([Parameter(Mandatory)] [string]$Path)

    & icacls.exe $Path /inheritance:r /grant:r "${SID_SYSTEM}:(F)" "${SID_ADMINISTRATORS}:(F)" | Out-Null
    if ($LASTEXITCODE -ne 0) {
        Write-Warning "Não foi possível restringir o acesso ao config.json (icacls código $LASTEXITCODE)."
    }
}

function Install-HealthCheckTask {
    $scriptPath = Join-Path $PSScriptRoot "health-check.ps1"
    $configPath = Join-Path $PSScriptRoot "config.json"

    if (-not (Test-Path $scriptPath)) {
        throw "health-check.ps1 não encontrado em '$PSScriptRoot'. Rode este instalador na mesma pasta dele."
    }
    if (-not (Test-Path $configPath)) {
        throw "config.json não encontrado em '$PSScriptRoot'. Copie o config.example.json para config.json e preencha antes de instalar."
    }

    # Pastas dentro do perfil de um usuário (Área de Trabalho, Downloads...) somem se o perfil for apagado
    if ($PSScriptRoot -like "$env:SystemDrive\Users\*") {
        Write-Warning "A pasta '$PSScriptRoot' fica dentro de um perfil de usuário. Nas PDVs use C:\HealthCheckPDV."
    }

    $arguments = "-NoProfile -NonInteractive -ExecutionPolicy Bypass -File `"$scriptPath`""
    if ($Hostname) {
        Write-Warning "MODO DE TESTE: a tarefa vai rodar com -Hostname $Hostname. Remova-a depois com -Remove."
        $arguments += " -Hostname $Hostname"
    }

    $action = New-ScheduledTaskAction -Execute "powershell.exe" -Argument $arguments -WorkingDirectory $PSScriptRoot

    # Começa agora e repete a cada 5 minutos, sem data para acabar; continua valendo depois de reiniciar
    $trigger = New-ScheduledTaskTrigger -Once -At (Get-Date) -RepetitionInterval (New-TimeSpan -Minutes $INTERVAL_MINUTES)

    $principal = New-ScheduledTaskPrincipal -UserId "SYSTEM" -LogonType ServiceAccount -RunLevel Highest

    # IgnoreNew: se uma execução ainda estiver rodando, a próxima é pulada (nunca duas ao mesmo tempo)
    # StartWhenAvailable: se a PDV estava desligada no horário, roda assim que ligar
    $settings = New-ScheduledTaskSettingsSet `
        -MultipleInstances IgnoreNew `
        -ExecutionTimeLimit (New-TimeSpan -Minutes $EXECUTION_LIMIT_MINUTES) `
        -StartWhenAvailable `
        -AllowStartIfOnBatteries `
        -DontStopIfGoingOnBatteries

    Register-ScheduledTask -TaskName $TASK_NAME `
        -Description "Health Check PDV: envia o estado do caixa para a central a cada $INTERVAL_MINUTES minutos." `
        -Action $action -Trigger $trigger -Principal $principal -Settings $settings `
        -Force | Out-Null

    Protect-ConfigFile -Path $configPath

    Write-Host "Tarefa '$TASK_NAME' instalada: roda a cada $INTERVAL_MINUTES minutos como SYSTEM."
    Write-Host "Executando a primeira vez para conferir..."

    Start-ScheduledTask -TaskName $TASK_NAME
    Wait-FirstRun
}

# Espera a primeira execução terminar e mostra o resultado e o final do log do dia
function Wait-FirstRun {
    $deadline = (Get-Date).AddSeconds($FIRST_RUN_WAIT_SECONDS)
    do {
        Start-Sleep -Seconds 2
        $state = (Get-ScheduledTask -TaskName $TASK_NAME).State
    } while ($state -eq "Running" -and (Get-Date) -lt $deadline)

    if ($state -eq "Running") {
        Write-Warning "A primeira execução ainda não terminou. Confira o log em '$(Join-Path $PSScriptRoot 'logs')' daqui a pouco."
        return
    }

    $lastResult = (Get-ScheduledTaskInfo -TaskName $TASK_NAME).LastTaskResult
    $logFile = Join-Path $PSScriptRoot ("logs\health-check-{0}.log" -f (Get-Date -Format "yyyy-MM-dd"))
    if (Test-Path $logFile) {
        Write-Host ""
        Write-Host "Últimas linhas do log:"
        Get-Content -Path $logFile -Tail 6 -Encoding UTF8 | ForEach-Object { Write-Host "  $_" }
        Write-Host ""
    }

    # 0 = o health-check.ps1 terminou sem erro; 1 = terminou com erro (o motivo está no log)
    if ($lastResult -eq 0) {
        Write-Host "Primeira execução OK. A PDV já deve aparecer no painel."
    } else {
        Write-Warning "A primeira execução terminou com erro (código $lastResult). Veja o motivo nas linhas do log acima."
    }
}

function Uninstall-HealthCheckTask {
    if (-not (Get-ScheduledTask -TaskName $TASK_NAME -ErrorAction SilentlyContinue)) {
        Write-Host "A tarefa '$TASK_NAME' não está instalada."
        return
    }

    Unregister-ScheduledTask -TaskName $TASK_NAME -Confirm:$false

    # Devolve ao config.json as permissões normais da pasta (desfaz o Protect-ConfigFile)
    $configPath = Join-Path $PSScriptRoot "config.json"
    if (Test-Path $configPath) {
        & icacls.exe $configPath /reset | Out-Null
    }

    Write-Host "Tarefa '$TASK_NAME' removida. Os arquivos da pasta não foram apagados."
}

$exitCode = 0
try {
    if (-not (Test-IsAdministrator)) {
        throw "Rode como administrador: abra o PowerShell com o botão direito > 'Executar como administrador'."
    }

    if ($Remove) {
        Uninstall-HealthCheckTask
    } else {
        Install-HealthCheckTask
    }
} catch {
    Write-Host "ERRO: $($_.Exception.Message)" -ForegroundColor Red
    $exitCode = 1
}

exit $exitCode
