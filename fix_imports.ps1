$uiDir = "c:\Users\Chira\OneDrive\Desktop\techheck\projects\project1\voice-notes-app\src\components\ui"

Get-ChildItem -Path $uiDir -Filter "*.tsx" -Recurse | ForEach-Object {
    $file = $_.FullName
    $content = Get-Content $file -Raw

    # Strip @version from any package imports inside quotes
    $fixed = $content -replace '(?<=from ")([^"]+?)@[\d.]+(?=")', '$1'

    if ($fixed -ne $content) {
        Set-Content -Path $file -Value $fixed -NoNewline
        Write-Host "Fixed: $($_.Name)"
    } else {
        Write-Host "No change: $($_.Name)"
    }
}

Write-Host "`nDone!"
