Add-Type -AssemblyName System.IO.Compression.FileSystem
$files = @(
    'S.O.L.A.R. Chapter 1 – The Rationale.docx',
    'S.O.L.A.R. Chapter 2, The Sun.docx',
    'S.O.L.A.R. Chapter 3, Mercury.docx',
    'S.O.L.A.R. Chapter 4, Venus.docx',
    'S.O.L.A.R. Chapter 5, Earth.docx',
    'S.O.L.A.R. Chapter 6, Mars.docx',
    'S.O.L.A.R. Chapter 10 - Neptune.docx'
)
foreach ($fname in $files) {
    $path = "c:\Users\progr\Downloads\SolarSystem\info\$fname"
    Write-Output "=== $fname ==="
    try {
        $zip = [System.IO.Compression.ZipFile]::OpenRead($path)
        $entry = $zip.Entries | Where-Object { $_.FullName -eq 'word/document.xml' }
        $stream = $entry.Open()
        $reader = New-Object System.IO.StreamReader($stream)
        $xml = $reader.ReadToEnd()
        $reader.Close()
        $stream.Close()
        $zip.Dispose()
        $clean = $xml -replace '<[^>]+>',''
        $clean = $clean -replace '&amp;','&'
        $len = [Math]::Min(2000, $clean.Length)
        Write-Output $clean.Substring(0, $len)
    } catch {
        Write-Output "Error: $_"
    }
    Write-Output ""
}
