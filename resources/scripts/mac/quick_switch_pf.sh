#!/bin/bash
# Quick Switch v1
# Compatible with pf (macOS's built-in packet filter) for firewall management
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

# Reload pf rules from the standard anchor config, if present.
if command -v pfctl >/dev/null 2>&1 && [ -f /etc/pf.conf ]; then
  sudo pfctl -f /etc/pf.conf
fi

echo "Task completed successfully."
echo "Created by DeadmanXXXII."
