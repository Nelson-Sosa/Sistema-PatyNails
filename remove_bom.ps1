$files = Get-ChildItem -Path ".\src", ".\index.html", ".\package.json", ".\.env.example" -Recurse -File -Include *.js,*.jsx,*.html,*.json,*.css,*.example -ErrorAction SilentlyContinue | Where-Object { $_.FullName -notmatch "node_modules|dist" }

foreach ($file in $files) {
    $bytes = [System.IO.File]::ReadAllBytes($file.FullName)
    if ($bytes.Length -ge 3 -and $bytes[0] -eq 0xEF -and $bytes[1] -eq 0xBB -and $bytes[2] -eq 0xBF) {
        Write-Host "Removing BOM from $($file.FullName)"
        $utf8NoBom = New-Object System.Text.UTF8Encoding $false
        $text = $utf8NoBom.GetString($bytes, 3, $bytes.Length - 3)
        [System.IO.File]::WriteAllText($file.FullName, $text, $utf8NoBom)
    }
}
