param([switch]$Record)
$ErrorActionPreference='Stop'
if (-not $Record) { throw 'Pass -Record to authorize a real Codex request in a new disposable demo repository.' }
$root = (Resolve-Path (Join-Path $PSScriptRoot '../../..')).Path
$binary = Join-Path $root 'bin/agenttm.exe'
$run = Join-Path $root ('.test-work/launch-film-' + [guid]::NewGuid())
$repo = Join-Path $run 'demo-checkout'
New-Item -ItemType Directory -Path (Join-Path $repo 'src') -Force | Out-Null
New-Item -ItemType Directory -Path (Join-Path $repo 'test') | Out-Null
$utf8 = New-Object System.Text.UTF8Encoding($false)
[IO.File]::WriteAllText((Join-Path $repo 'package.json'),'{"name":"agenttm-demo-checkout","private":true,"type":"module"}', $utf8)
[IO.File]::WriteAllText((Join-Path $repo 'README.md'),"# Demo checkout`n`nFictional shopping-cart project created for the AgentTM launch video.`nNo customer data or external dependencies.`n", $utf8)
[IO.File]::WriteAllText((Join-Path $repo 'src/cart.ts'), @'
export type CartItem = {
  name: string;
  unitPriceCents: number;
  quantity: number;
};

/** Return the subtotal in integer cents. */
export function subtotalCents(items: CartItem[]): number {
  return items.reduce((total, item) => total + item.unitPriceCents, 0);
}
'@, $utf8)
[IO.File]::WriteAllText((Join-Path $repo 'test/cart.test.ts'), @'
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { subtotalCents } from '../src/cart.ts';

test('empty cart totals zero', () => {
  assert.equal(subtotalCents([]), 0);
});
'@, $utf8)
Push-Location $repo
try {
  git init
  git config user.name 'AgentTM Demo'
  git config user.email 'demo@example.invalid'
  git add .
  git commit -m 'Demo checkout baseline'
  if($LASTEXITCODE -ne 0){throw 'Demo Git baseline failed'}
  & $binary init
  if($LASTEXITCODE -ne 0){throw 'AgentTM initialization failed'}
  & $binary run codex --model gpt-6.1-sol --sandbox workspace-write --snapshot-after-tool=true -- 'Fix subtotalCents in src/cart.ts so every item contributes unitPriceCents multiplied by quantity. Add a regression test in test/cart.test.ts: two notebooks at 1999 cents and one pen at 499 cents should total 4497 cents. Run node --experimental-strip-types --test test/cart.test.ts to verify. Keep the change focused; do not install dependencies or edit other files.'
  if($LASTEXITCODE -ne 0){throw 'Demo Codex recording failed'}
  & $binary doctor
  if($LASTEXITCODE -ne 0){throw 'Demo integrity check failed'}
} finally { Pop-Location }
[IO.File]::WriteAllText((Join-Path $PSScriptRoot '../demo-location.txt'), $repo, $utf8)
Write-Output "VIDEO_DEMO_ROOT=$repo"
