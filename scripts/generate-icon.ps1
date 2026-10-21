# Temporary Warshati icon: a gold "و" on the navy brand color.
# Writes assets/icon.png (512px, window + README) and assets/icon.ico (16-256px, installer + taskbar).
# Run: powershell -ExecutionPolicy Bypass -File scripts/generate-icon.ps1
param([string]$Font = 'Tahoma')

Add-Type -AssemblyName System.Drawing
$assets = Join-Path $PSScriptRoot '..\assets' | Resolve-Path

function New-IconBitmap([int]$size) {
  $bmp = New-Object System.Drawing.Bitmap($size, $size, [System.Drawing.Imaging.PixelFormat]::Format32bppArgb)
  $g = [System.Drawing.Graphics]::FromImage($bmp)
  $g.SmoothingMode = 'AntiAlias'
  $g.TextRenderingHint = 'AntiAliasGridFit'
  $g.Clear([System.Drawing.Color]::Transparent)

  # Rounded navy square
  $r = [single]($size * 0.22)
  $rect = New-Object System.Drawing.RectangleF(0, 0, $size, $size)
  $path = New-Object System.Drawing.Drawing2D.GraphicsPath
  $path.AddArc($rect.X, $rect.Y, $r * 2, $r * 2, 180, 90)
  $path.AddArc($rect.Right - $r * 2, $rect.Y, $r * 2, $r * 2, 270, 90)
  $path.AddArc($rect.Right - $r * 2, $rect.Bottom - $r * 2, $r * 2, $r * 2, 0, 90)
  $path.AddArc($rect.X, $rect.Bottom - $r * 2, $r * 2, $r * 2, 90, 90)
  $path.CloseFigure()
  $bg = New-Object System.Drawing.Drawing2D.LinearGradientBrush($rect, [System.Drawing.Color]::FromArgb(255, 26, 32, 52), [System.Drawing.Color]::FromArgb(255, 12, 15, 26), 90)
  $g.FillPath($bg, $path)

  # Thin gold inner ring (skipped on tiny sizes, where it turns to noise)
  if ($size -ge 48) {
    $inset = [single]($size * 0.07)
    $ringPen = New-Object System.Drawing.Pen([System.Drawing.Color]::FromArgb(90, 201, 151, 43), [single]([Math]::Max(1, $size * 0.012)))
    $ri = [single]($r * 0.75)
    $ring = New-Object System.Drawing.Drawing2D.GraphicsPath
    $x = $inset; $y = $inset; $w = $size - 2 * $inset
    $ring.AddArc($x, $y, $ri * 2, $ri * 2, 180, 90)
    $ring.AddArc($x + $w - $ri * 2, $y, $ri * 2, $ri * 2, 270, 90)
    $ring.AddArc($x + $w - $ri * 2, $y + $w - $ri * 2, $ri * 2, $ri * 2, 0, 90)
    $ring.AddArc($x, $y + $w - $ri * 2, $ri * 2, $ri * 2, 90, 90)
    $ring.CloseFigure()
    $g.DrawPath($ringPen, $ring)
  }

  # Gold "و", centered on its drawn shape (not its font box)
  $glyph = New-Object System.Drawing.Drawing2D.GraphicsPath
  $fam = New-Object System.Drawing.FontFamily($Font)
  $fmt = New-Object System.Drawing.StringFormat
  $fmt.FormatFlags = [System.Drawing.StringFormatFlags]::DirectionRightToLeft
  $glyph.AddString([string][char]0x0648, $fam, [int][System.Drawing.FontStyle]::Bold, [single]($size * 0.62), (New-Object System.Drawing.PointF(0, 0)), $fmt)
  $b = $glyph.GetBounds()
  $m = New-Object System.Drawing.Drawing2D.Matrix
  $m.Translate([single](($size - $b.Width) / 2 - $b.X), [single](($size - $b.Height) / 2 - $b.Y))
  $glyph.Transform($m)
  $gb = $glyph.GetBounds()
  $gold = New-Object System.Drawing.Drawing2D.LinearGradientBrush($gb, [System.Drawing.Color]::FromArgb(255, 243, 210, 122), [System.Drawing.Color]::FromArgb(255, 184, 134, 31), 90)
  $g.FillPath($gold, $glyph)

  $g.Dispose()
  return $bmp
}

function Get-PngBytes($bmp) {
  $ms = New-Object System.IO.MemoryStream
  $bmp.Save($ms, [System.Drawing.Imaging.ImageFormat]::Png)
  return ,$ms.ToArray()
}

# PNG for the window icon and docs
$big = New-IconBitmap 512
$big.Save((Join-Path $assets 'icon.png'), [System.Drawing.Imaging.ImageFormat]::Png)

# ICO with PNG-compressed entries
$sizes = 16, 24, 32, 48, 64, 128, 256
$images = foreach ($s in $sizes) { ,(Get-PngBytes (New-IconBitmap $s)) }
$out = New-Object System.IO.MemoryStream
$w = New-Object System.IO.BinaryWriter($out)
$w.Write([uint16]0); $w.Write([uint16]1); $w.Write([uint16]$sizes.Count)
$offset = 6 + 16 * $sizes.Count
for ($i = 0; $i -lt $sizes.Count; $i++) {
  $s = $sizes[$i]; $len = $images[$i].Length
  $dim = if ($s -ge 256) { 0 } else { $s }
  $w.Write([byte]$dim); $w.Write([byte]$dim); $w.Write([byte]0); $w.Write([byte]0)
  $w.Write([uint16]1); $w.Write([uint16]32); $w.Write([uint32]$len); $w.Write([uint32]$offset)
  $offset += $len
}
foreach ($img in $images) { $w.Write($img) }
$w.Flush()
[System.IO.File]::WriteAllBytes((Join-Path $assets 'icon.ico'), $out.ToArray())
"Wrote assets/icon.png and assets/icon.ico ($($sizes -join ', ') px)"
