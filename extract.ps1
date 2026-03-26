Add-Type -AssemblyName System.IO.Compression.FileSystem
foreach ($f in Get-ChildItem 'c:\Users\progr\Downloads\SolarSystem\info\*.docx') {
    Write-Output "=== $($f.Name) ==="
    try {
        $zip = [System.IO.Compression.ZipFile]::OpenRead($f.FullName)
        $entry = $zip.Entries | Where-Object { $_.FullName -eq 'word/document.xml' }
        $stream = $entry.Open()
        $reader = New-Object System.IO.StreamReader($stream)
        $xml = $reader.ReadToEnd()
        $reader.Close()
        $stream.Close()
        $zip.Dispose()
        $clean = $xml -replace '<[^>]+>',''
        $clean = $clean -replace '&amp;','&'
        $clean = $clean -replace '&lt;','<'
        $clean = $clean -replace '&gt;','>'
        $len = [Math]::Min(2000, $clean.Length)
        Write-Output $clean.Substring(0, $len)
    } catch {
        Write-Output "Error: $_"
    }
    Write-Output ""
}
