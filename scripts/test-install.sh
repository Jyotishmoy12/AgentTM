#!/bin/sh
set -eu
asset_dir=$(CDPATH= cd -- "${1:?asset directory required}" && pwd)
version=${2:?version required}
platform=${3:?platform required, for example linux_amd64}
extract_only=${4:-}
script_dir=$(CDPATH= cd -- "$(dirname -- "$0")" && pwd)
test_root=$(mktemp -d)
archive="$asset_dir/agenttm_${version}_${platform}.tar.gz"
sh "$script_dir/install.sh" "$archive" "$test_root/installed"
binary="$test_root/installed/agenttm"
tar -xOzf "$archive" agenttm > "$test_root/expected"
cmp "$binary" "$test_root/expected"
if [ "$extract_only" != --extract-only ]; then
    [ -x "$binary" ] || { echo 'Executable permission missing.' >&2; exit 1; }
    reported=$("$binary" version)
    case "$reported" in "agenttm $version ("*) ;; *) echo "Wrong version: $reported" >&2; exit 1;; esac
fi
if sh "$script_dir/install.sh" "$archive" "$test_root/installed"; then echo 'Existing installation overwritten.' >&2; exit 1; fi
mkdir "$test_root/bad"
cp "$archive" "$test_root/bad/$(basename -- "$archive")"
cp "$asset_dir/SHA256SUMS" "$test_root/bad/SHA256SUMS"
printf 'tampered' >> "$test_root/bad/$(basename -- "$archive")"
if sh "$script_dir/install.sh" "$test_root/bad/$(basename -- "$archive")" "$test_root/rejected"; then echo 'Bad checksum accepted.' >&2; exit 1; fi
[ ! -e "$test_root/rejected/agenttm" ] || exit 1
if [ "$extract_only" = --extract-only ]; then
    printf 'Extraction/checksum/overwrite checks PASS; native execution NOT tested (%s)\n' "$platform"
else
    mkdir "$test_root/repo"
    git init "$test_root/repo"
    cd "$test_root/repo"
    "$binary" init
    printf 'Unix install, executable mode, version, overwrite refusal, checksum rejection: PASS (%s)\n' "$test_root"
fi
