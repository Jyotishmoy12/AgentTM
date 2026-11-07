#!/bin/sh
set -eu

fail() {
    printf '%s\n' "$1" >&2
    exit 1
}

verify_archive() {
    expected=$(awk -v name="$name" '$2 == name {print $1}' "$directory/SHA256SUMS")
    [ ${#expected} -eq 64 ] || fail 'Archive not listed in SHA256SUMS.'
    if command -v sha256sum >/dev/null 2>&1; then
        actual=$(sha256sum "$archive" | awk '{print $1}')
    else
        actual=$(shasum -a 256 "$archive" | awk '{print $1}')
    fi
    [ "$actual" = "$expected" ] || fail 'Archive checksum mismatch.'
}

cleanup() {
    rm -f "$task_tmp/agenttm"
    rmdir "$task_tmp"
}

archive=${1:?Usage: sh install.sh archive.tar.gz [install-directory]}
destination=${2:-"$HOME/.local/bin"}
directory=$(CDPATH= cd -- "$(dirname -- "$archive")" && pwd)
archive="$directory/$(basename -- "$archive")"
name=$(basename -- "$archive")
verify_archive

mkdir -p "$destination"
[ ! -e "$destination/agenttm" ] || fail 'Destination already exists; move the old executable aside before upgrading.'
task_tmp=$(mktemp -d)
trap cleanup EXIT HUP INT TERM
tar -xOzf "$archive" agenttm > "$task_tmp/agenttm"
[ -s "$task_tmp/agenttm" ] || fail 'Archive has no executable.'
install -m 755 "$task_tmp/agenttm" "$destination/agenttm"
printf 'Installed: %s/agenttm\n' "$destination"
