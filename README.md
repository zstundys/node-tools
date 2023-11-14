![Visualization of the codebase](./diagram.svg)

## Setup - Windows Powershell profile

```ps1
function Run-Tool {
    param($toolName)
    Set-Location -Path "O:\node-tools"
    Invoke-Expression "pnpm run $toolName"
}

Set-Alias -Name run -Value Run-Tool
```

Usage:

```ps1
run <toolName>
```
