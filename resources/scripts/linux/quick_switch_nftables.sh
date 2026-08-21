#!/bin/bash
# Quick Switch v1
# Compatible with nftables for firewall management (Linux)
set -uo pipefail

echo "Executing IP configuration commands..."

IFACE=$(ip route show default | awk '/default/ {print $5; exit}')

if command -v nmcli >/dev/null 2>&1 && [ -n "$IFACE" ]; then
  sudo nmcli device disconnect "$IFACE" 2>/dev/null
  sudo nmcli device connect "$IFACE" 2>/dev/null
elif command -v dhclient >/dev/null 2>&1 && [ -n "$IFACE" ]; then
  sudo dhclient -r "$IFACE"
  sudo dhclient "$IFACE"
else
  echo "No supported DHCP client (nmcli/dhclient) found or default interface not detected."
fi

if command -v resolvectl >/dev/null 2>&1; then
  sudo resolvectl flush-caches
elif command -v systemd-resolve >/dev/null 2>&1; then
  sudo systemd-resolve --flush-caches
fi

# Re-apply the ruleset from the standard nftables config location, if present,
# so the reload picks up any pending rule changes.
if command -v nft >/dev/null 2>&1 && [ -f /etc/nftables.conf ]; then
  sudo nft -f /etc/nftables.conf
fi

echo "Task completed successfully."
echo "Created by DeadmanXXXII."
