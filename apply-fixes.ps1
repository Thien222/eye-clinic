# PowerShell script to apply all eye clinic fixes
cd "C:\Users\Administrator\Desktop\ok\eye-clinic"

# Fix #3b: Update Reception voice call to only say ticket number (line ~142)
$file = "components/Reception.tsx"
$content = Get-Content $file -Raw
$content = $content -replace 'Mời bệnh nhân số \$\{p\.ticketNumber\}, \$\{p\.fullName\}, vào phòng khúc xạ', 'Mời bệnh nhân số ${String(p.ticketNumber).padStart(3, \"0\")}'
Set-Content $file $content -NoNewline

# Fix #3c: Update Reception ticket display formatting (line ~177)
$content = Get-Content $file -Raw
$content = $content -replace '<td className="p-3 font-bold text-brand-600">\{p\.ticketNumber\}</td>', '<td className="p-3 font-bold text-brand-600">{String(p.ticketNumber).padStart(3, \"0\")}</td>'
Set-Content $file $content -NoNewline

# Fix #3d: Update Refraction voice call
$file = "components/Refraction.tsx"
$content = Get-Content $file -Raw  
$content = $content -replace 'Mời bệnh nhân số \$\{p\.ticketNumber\}, \$\{p\.fullName\}, vào phòng khúc xạ', 'Mời bệnh nhân số ${String(p.ticketNumber).padStart(3, \"0\")}'
Set-Content $file $content -NoNewline

# Fix #6a: Change "Độ cầu/viễn" to "Độ cận/viễn" 
$content = Get-Content $file -Raw
$content = $content -replace 'Độ cầu/viễn', 'Độ cận/viễn'
$content = $content -replace 'Độ cầu \(SPH\)', 'Độ cận/viễn (SPH)'
Set-Content $file $content -NoNewline

Write-Host "Applied fixes #3 and #6a successfully!"
