#!/usr/bin/env python3
# Quick Switch v1
# Compatible with IDS: Suricata
#
# Cross-platform network reset: detects the OS and runs the correct native
# commands rather than assuming Windows syntax everywhere.

import platform
import shutil
import subprocess


def run(cmd):
    try:
        subprocess.run(cmd, check=False)
    except FileNotFoundError:
        pass


print("Executing IP configuration commands...")

system = platform.system()

if system == "Windows":
    run(["ipconfig", "/release"])
    run(["ipconfig", "/release6"])
    run(["ipconfig", "/renew"])
    run(["ipconfig", "/renew6"])
    run(["ipconfig", "/flushdns"])

elif system == "Darwin":
    iface = None
    try:
        out = subprocess.run(["route", "get", "default"], capture_output=True, text=True).stdout
        for line in out.splitlines():
            if "interface:" in line:
                iface = line.split()[-1]
                break
    except Exception:
        pass
    if iface:
        run(["sudo", "ipconfig", "set", iface, "NONE"])
        run(["sudo", "ipconfig", "set", iface, "DHCP"])
    run(["sudo", "dscacheutil", "-flushcache"])
    run(["sudo", "killall", "-HUP", "mDNSResponder"])

elif system == "Linux":
    iface = None
    try:
        out = subprocess.run(["ip", "route", "show", "default"], capture_output=True, text=True).stdout
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
    if shutil.which("resolvectl"):
        run(["sudo", "resolvectl", "flush-caches"])
    elif shutil.which("systemd-resolve"):
        run(["sudo", "systemd-resolve", "--flush-caches"])

# Restart Suricata if it's running as a service, so it re-binds to the
# interface after the reset instead of watching a stale link.
if shutil.which("systemctl"):
    run(["sudo", "systemctl", "restart", "suricata"])

print("Task completed successfully.")

# Footer
print("Created by DeadmanXXXII")
