$ErrorActionPreference = 'Stop'
Add-Type -AssemblyName System.Drawing

function New-ForgeBitmap([int]$size) {
  $bitmap = [System.Drawing.Bitmap]::new($size, $size, [System.Drawing.Imaging.PixelFormat]::Format32bppArgb)
  $graphics = [System.Drawing.Graphics]::FromImage($bitmap)
  $graphics.SmoothingMode = [System.Drawing.Drawing2D.SmoothingMode]::AntiAlias
  $graphics.Clear([System.Drawing.Color]::Transparent)

  $scale = $size / 512.0
  $rect = [System.Drawing.RectangleF]::new(22 * $scale, 22 * $scale, 468 * $scale, 468 * $scale)
  $radius = 116 * $scale
  $path = [System.Drawing.Drawing2D.GraphicsPath]::new()
  $path.AddArc($rect.Left, $rect.Top, $radius, $radius, 180, 90)
  $path.AddArc($rect.Right - $radius, $rect.Top, $radius, $radius, 270, 90)
  $path.AddArc($rect.Right - $radius, $rect.Bottom - $radius, $radius, $radius, 0, 90)
  $path.AddArc($rect.Left, $rect.Bottom - $radius, $radius, $radius, 90, 90)
  $path.CloseFigure()

  $tile = [System.Drawing.Drawing2D.LinearGradientBrush]::new($rect, [System.Drawing.Color]::FromArgb(255, 43, 47, 35), [System.Drawing.Color]::FromArgb(255, 14, 15, 13), 45)
  $graphics.FillPath($tile, $path)
  $border = [System.Drawing.Pen]::new([System.Drawing.Color]::FromArgb(255, 72, 78, 52), 6 * $scale)
  $graphics.DrawPath($border, $path)

  $mark = [System.Drawing.Pen]::new([System.Drawing.Color]::FromArgb(255, 211, 244, 101), 58 * $scale)
  $mark.StartCap = [System.Drawing.Drawing2D.LineCap]::Round
  $mark.EndCap = [System.Drawing.Drawing2D.LineCap]::Round
  $mark.LineJoin = [System.Drawing.Drawing2D.LineJoin]::Round
  $graphics.DrawLine($mark, 164 * $scale, 372 * $scale, 164 * $scale, 137 * $scale)
  $graphics.DrawLine($mark, 164 * $scale, 137 * $scale, 366 * $scale, 137 * $scale)
  $graphics.DrawLine($mark, 164 * $scale, 249 * $scale, 315 * $scale, 249 * $scale)

  $mark.Dispose()
  $border.Dispose()
  $tile.Dispose()
  $path.Dispose()
  $graphics.Dispose()
  return $bitmap
}

$build = $PSScriptRoot
$png = New-ForgeBitmap 512
$png.Save((Join-Path $build 'icon.png'), [System.Drawing.Imaging.ImageFormat]::Png)
$png.Dispose()

$icoBitmap = New-ForgeBitmap 256
$handle = $icoBitmap.GetHicon()
$icon = [System.Drawing.Icon]::FromHandle($handle)
$stream = [System.IO.File]::Create((Join-Path $build 'icon.ico'))
$icon.Save($stream)
$stream.Dispose()
$icon.Dispose()
$icoBitmap.Dispose()

Write-Output 'Generated build/icon.png and build/icon.ico'
