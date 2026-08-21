#!/bin/bash
# Quick Switch v1
# Compatible with IDS: Snort (macOS)
#
# Note: macOS's ipconfig is a different tool from Windows'. It has no
# /release or /renew6 flags — DHCP lease control is per-interface via
# "ipconfig set <iface> DHCP".
set -uo pipefail

echo "Executing IP configuration commands..."

IFACE=$(route get default 2>/dev/null | awk '/interface:/ {print $2; exit}')

if [ -n "$IFACE" ]; then
  sudo ipconfig set "$IFACE" NONE
  sudo ipconfig set "$IFACE" DHCP
else
  echo "Could not detect default interface."
fi

sudo dscacheutil -flushcache
sudo killall -HUP mDNSResponder 2>/dev/null

# Restart Snort if it's running as a launchd service, so it re-binds after reset.
if command -v launchctl >/dev/null 2>&1 && launchctl list | grep -qi snort; then
  sudo launchctl kickstart -k system/snort 2>/dev/null
fi

echo "Task completed successfully."
echo "Created by DeadmanXXXII"
