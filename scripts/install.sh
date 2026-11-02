#!/bin/sh
# Local verified archive installation; no downloads or shell-profile edits.
set -eu
archive=${1:?Usage: sh install.sh archive.tar.gz [install-directory]}
destination=${2:-"$HOME/.local/bin"}
directory=$(CDPATH= cd -- "$(dirname -- "$archive")" && pwd)
archive="$directory/$(basename -- "$archive")"
name=$(basename -- "$archive")
expected=$(awk -v name="$name" '$2 == name {print $1}' "$directory/SHA256SUMS")
[ ${#expected} -eq 64 ] || { echo 'Archive not listed in SHA256SUMS.' >&2; exit 1; }
if command -v sha256sum >/dev/null 2>&1; then actual=$(sha256sum "$archive" | awk '{print $1}'); else actual=$(shasum -a 256 "$archive" | awk '{print $1}'); fi
[ "$actual" = "$expected" ] || { echo 'Archive checksum mismatch.' >&2; exit 1; }
mkdir -p "$destination"
[ ! -e "$destination/agenttm" ] || { echo 'Destination already exists; move the old executable aside before upgrading.' >&2; exit 1; }
task_tmp=$(mktemp -d)
trap 'rm -f "$task_tmp/agenttm"; rmdir "$task_tmp"' EXIT HUP INT TERM
# Stream the one named entry; no archive path can create a file outside task_tmp.
tar -xOzf "$archive" agenttm > "$task_tmp/agenttm"
[ -s "$task_tmp/agenttm" ] || { echo 'Archive has no executable.' >&2; exit 1; }
install -m 755 "$task_tmp/agenttm" "$destination/agenttm"
printf 'Installed: %s/agenttm\n' "$destination"
