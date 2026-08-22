# extract-icons.ps1
#
# Pull the real 32x32 ARGB icons straight from the user's installed
# .exe files and write them as PNG into ./assets/. Falls back to
# sensible defaults whenever a specific binary isn't on the machine —
# e.g. Windows Terminal missing -> use cmd.exe icon for the terminal
# slot, VS Code not in the default install dirs -> probe PATH for
# `code` and walk up to its Code.exe.
#
# Usage (from plugin root):
#   powershell -ExecutionPolicy Bypass -File script/extract-icons.ps1

$ErrorActionPreference = 'Stop'
Add-Type -AssemblyName System.Drawing

# Script lives in ./script/ under the plugin root, so pop one level up
# to reach assets/, package.json, src/, etc.
$ScriptDir  = Split-Path -Parent $MyInvocation.MyCommand.Path
$PluginRoot = Split-Path -Parent $ScriptDir
$AssetsDir  = Join-Path $PluginRoot 'assets'
if (-not (Test-Path $AssetsDir)) { New-Item -ItemType Directory -Path $AssetsDir | Out-Null }

function Resolve-CodeExe {
  # 1) The exact path that showed up in the host spawn log last time.
  $candidates = @(
    'E:\Microsoft VS Code\Code\Code.exe',
    "$env:LOCALAPPDATA\Programs\Microsoft VS Code\Code.exe",
    "$env:ProgramFiles\Microsoft VS Code\Code.exe",
    "${env:ProgramFiles(x86)}\Microsoft VS Code\Code.exe"
  )
  foreach ($c in $candidates) { if (Test-Path $c) { return $c } }
  # 2) Walk from `code.CMD` on PATH up to the parent Code.exe.
  try {
    $codeCmd = (Get-Command code -ErrorAction Stop).Source
    if ($codeCmd -match '(?i)\\Code\\bin\\code\.(cmd|bat)$') {
      $guess = Join-Path (Split-Path (Split-Path $codeCmd)) 'Code.exe'
      if (Test-Path $guess) { return $guess }
    }
  } catch { }
  return $null
}

function Save-Icon([string]$SourceExe, [string]$OutPng, [int]$Size = 32) {
  if (-not (Test-Path $SourceExe)) {
    Write-Warning "  skip: source missing -> $SourceExe"
    return $false
  }
  # ExtractIconEx pulls the first large + first small icon from the
  # module; SHDefExtractIcon would give index control, but group 0
  # is always the "brand" icon every .exe registers for Explorer.
  $large  = [System.IntPtr[]]::new(1)
  $small  = [System.IntPtr[]]::new(1)
  $count  = [Win32.IconExtractor]::ExtractIconEx($SourceExe, 0, $large, $small, 1)
  try {
    $hIcon = [IntPtr]::Zero
    if ($count -ge 1 -and $small[0] -ne [IntPtr]::Zero) { $hIcon = $small[0] }
    if ($count -ge 1 -and $large[0] -ne [IntPtr]::Zero) {
      # Prefer large (256 usually) and let Bitmap scale; it produces
      # a much cleaner 32x32 downsample than the tiny pre-rendered
      # small icon, which is 16x16 on most resources.
      if ($hIcon -ne [IntPtr]::Zero) {
        [Win32.IconExtractor]::DestroyIcon($hIcon) | Out-Null
      }
      $hIcon = $large[0]
    }
    if ($hIcon -eq [IntPtr]::Zero) {
      Write-Warning "  skip: no icon group in $SourceExe"
      return $false
    }
    $icon = [System.Drawing.Icon]::FromHandle($hIcon)
    try {
      $bmp = New-Object System.Drawing.Bitmap($Size, $Size, [System.Drawing.Imaging.PixelFormat]::Format32bppArgb)
      try {
        $bmp.SetResolution(96, 96)
        $g = [System.Drawing.Graphics]::FromImage($bmp)
        try {
          $g.InterpolationMode = [System.Drawing.Drawing2D.InterpolationMode]::HighQualityBicubic
          $g.SmoothingMode     = [System.Drawing.Drawing2D.SmoothingMode]::HighQuality
          $g.PixelOffsetMode   = [System.Drawing.Drawing2D.PixelOffsetMode]::HighQuality
          $g.CompositingQuality= [System.Drawing.Drawing2D.CompositingQuality]::HighQuality
          $g.Clear([System.Drawing.Color]::Transparent)
          $g.DrawIcon($icon, (New-Object System.Drawing.Rectangle(0, 0, $Size, $Size)))
        } finally { $g.Dispose() }
        $bmp.Save($OutPng, [System.Drawing.Imaging.ImageFormat]::Png)
        $sizeKB = [math]::Round((Get-Item $OutPng).Length / 1KB, 1)
        Write-Host "  wrote $OutPng ($sizeKB KB)"
        return $true
      } finally { $bmp.Dispose() }
    } finally { $icon.Dispose() }
  } finally {
    if ($large[0] -ne [IntPtr]::Zero) { [Win32.IconExtractor]::DestroyIcon($large[0]) | Out-Null }
    if ($small[0] -ne [IntPtr]::Zero -and $small[0] -ne $hIcon) { [Win32.IconExtractor]::DestroyIcon($small[0]) | Out-Null }
  }
}

# --- Pinvoke for ExtractIconEx + DestroyIcon ------------------------------
$iconExtractor = @"
using System;
using System.Runtime.InteropServices;
namespace Win32 {
  public static class IconExtractor {
    [DllImport("shell32.dll", CharSet = CharSet.Unicode)]
    public static extern uint ExtractIconEx(
      string lpszFile,
      int    nIconIndex,
      IntPtr[] phiconLarge,
      IntPtr[] phiconSmall,
      uint   nIcons);

    [DllImport("user32.dll")]
    [return: MarshalAs(UnmanagedType.Bool)]
    public static extern bool DestroyIcon(IntPtr hIcon);
  }
}
"@
Add-Type -TypeDefinition $iconExtractor -ReferencedAssemblies @()

# --- Targets ---------------------------------------------------------------
# The plugin ships THREE icon files. Terminal intentionally shares
# cmd.exe's icon (user opted for a single, unambiguous command-line
# glyph instead of distinguishing Windows Terminal vs cmd.exe).
$cmdExe      = Join-Path $env:WINDIR 'System32\cmd.exe'
$explorerExe = Join-Path $env:WINDIR 'explorer.exe'
$codeExe     = Resolve-CodeExe

function Coalesce($a, $b) { if ($a) { $a } else { $b } }
Write-Host "[extract-icons] assets dir -> $AssetsDir"
Write-Host "[extract-icons]   code      : $(Coalesce $codeExe '<not found>')"
Write-Host "[extract-icons]   terminal  : $cmdExe (cmd.exe icon, per user)"
Write-Host "[extract-icons]   explorer  : $explorerExe"

$ok = 0
# 1) VS Code -> vscode.png. If the user really doesn't have Code
#    installed we fall back to explorer as a "neutral editor" tile.
$codeOut = Join-Path $AssetsDir 'vscode.png'
if (Save-Icon -SourceExe $codeExe -OutPng $codeOut) { $ok++ } else {
  Write-Warning "VS Code icon missing; copying explorer as a placeholder."
  Save-Icon -SourceExe $explorerExe -OutPng $codeOut | Out-Null
}

# 2) cmd.png -> cmd.exe's own icon. Doubles as the terminal slot tile
#    (user declined a distinct Windows Terminal glyph).
$cmdOut = Join-Path $AssetsDir 'cmd.png'
if (Save-Icon -SourceExe $cmdExe -OutPng $cmdOut) { $ok++ }

# 3) Explorer -> explorer.png. Guaranteed in-box on every Windows
#    install back to 95, so no fallback needed.
$expOut = Join-Path $AssetsDir 'explorer.png'
if (Save-Icon -SourceExe $explorerExe -OutPng $expOut) { $ok++ }

# Cleanup: if a previous run left wt.png on disk, remove it so the
# on-disk asset list matches the three-file contract.
$staleWt = Join-Path $AssetsDir 'wt.png'
if (Test-Path $staleWt) {
  Remove-Item -LiteralPath $staleWt -Force
  Write-Host "  removed stale wt.png (not part of the icon set any longer)"
}

Write-Host "[extract-icons] done ($ok icons extracted; set = vscode / cmd / explorer)"
exit 0
