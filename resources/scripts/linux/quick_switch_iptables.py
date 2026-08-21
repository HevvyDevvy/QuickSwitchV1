#!/usr/bin/env python3
# Quick Switch v1
# Compatible with iptables for firewall management (Linux)

import shutil
import subprocess

print("Executing IP configuration commands...")


def run(cmd):
    try:
        subprocess.run(cmd, check=False)
    except FileNotFoundError:
        pass


# Find the interface used for the default route so release/renew targets it.
iface = None
try:
    out = subprocess.run(
        ["ip", "route", "show", "default"], capture_output=True, text=True
    ).stdout
    parts = out.split()
    if "dev" in parts:
        iface = parts[parts.index("dev") + 1]
except Exception:
    pass

if shutil.which("nmcli") and iface:
    run(["sudo", "nmcli", "device", "disconnect", iface])
    run(["sudo", "nmcli", "device", "connect", iface])
elif shutil.which("dhclient") and iface:
    run(["sudo", "dhclient", "-r", iface])
    run(["sudo", "dhclient", iface])
else:
    print("No supported DHCP client (nmcli/dhclient) found or default interface not detected.")

if shutil.which("resolvectl"):
    run(["sudo", "resolvectl", "flush-caches"])
elif shutil.which("systemd-resolve"):
    run(["sudo", "systemd-resolve", "--flush-caches"])

print("Task completed successfully.")

# Footer
print("Created by DeadmanXXXII.")
