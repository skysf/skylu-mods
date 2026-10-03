#!/usr/bin/env bash
# One command before every release: what the plugin directory's scan trips
# on, then Claude Code's own validation and every plugin's tests.
#
# The directory's security scan reads ${...} in a plugin's files as a shell
# expansion: a template string becomes "a command assembled at run time", and
# ${tokens} "reads the installer's tokens". Together they hold every version
# for a human reviewer. So plugin code builds strings with +, never ${...};
# only the variables Claude Code itself documents are allowed.
set -euo pipefail

root="$(cd "$(dirname "$0")/.." && pwd)"
cd "$root"
status=0

echo "== no \${...} in plugin files, other than Claude Code's own variables"
allowed='\$\{(CLAUDE_PLUGIN_ROOT|CLAUDE_PLUGIN_DATA|CLAUDE_PROJECT_DIR|user_config\.[A-Za-z0-9_]+)\}'
hits="$(git grep --untracked -n -I -F '${' -- plugins/ | sed -E "s/${allowed}//g" | grep -F '${' || true)"
if [ -n "$hits" ]; then
  printf '%s\n' "$hits"
  echo "FAIL: build these strings with + instead"
  status=1
fi

echo "== claude plugin validate (marketplace)"
claude plugin validate . || status=1

for plugin in plugins/*/; do
  plugin="${plugin%/}"
  echo "== claude plugin validate ($plugin)"
  claude plugin validate "$plugin" || status=1
  if [ -d "$plugin/tests" ]; then
    echo "== claude plugin test ($plugin)"
    claude plugin test "$plugin" || status=1
  fi
done

if [ "$status" -eq 0 ]; then echo "ALL CHECKS PASSED"; else echo "SOME CHECKS FAILED"; fi
exit "$status"
