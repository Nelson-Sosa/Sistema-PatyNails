$files = Get-ChildItem -Path ".\src", ".\index.html", ".\package.json", ".\.env.example" -Recurse -File -Include *.js,*.jsx,*.html,*.json,*.css,*.example -ErrorAction SilentlyContinue | Where-Object { $_.FullName -notmatch "node_modules|dist" }

foreach ($file in $files) {
    $content = Get-Content $file.FullName -Raw -Encoding UTF8
    if ($content -match "marbenails" -or $content -match "Marbenails" -or $content -match "MarbeNails" -or $content -match "MARBENAILS") {
        Write-Host "Migrating $($file.FullName)"
        $content = $content -replace "sistema-marbenails", "sistema-patynails"
        $content = $content -replace "marbenails_pending_action", "patynails_pending_action"
        $content = $content -replace "hola@marbenails.com", "hola@patynails.com"
        $content = $content -replace "marbenails/works", "patynails/works"
        $content = $content -replace "marbenails", "patynails"
        $content = $content -replace "Marbenails", "Patynails"
        $content = $content -replace "MarbeNails", "PatyNails"
        $content = $content -replace "MARBENAILS", "PATYNAILS"
        
        # update Logo imports
        $content = $content -replace "LogoMarbenails", "LogoPatyNails"
        
        [IO.File]::WriteAllText($file.FullName, $content, [System.Text.Encoding]::UTF8)
    }
}
