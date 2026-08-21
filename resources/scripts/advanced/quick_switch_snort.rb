#!/usr/bin/env ruby
# Quick Switch v1
# Compatible with IDS: Snort
#
# Cross-platform network reset: detects the OS and runs the correct native
# commands rather than assuming Windows syntax everywhere.

require "rbconfig"

def run(cmd)
  system(cmd)
rescue StandardError
  nil
end

puts "Executing IP configuration commands..."

os = RbConfig::CONFIG["host_os"]

if os =~ /mswin|mingw|cygwin/
  run("ipconfig /release")
  run("ipconfig /release6")
  run("ipconfig /renew")
  run("ipconfig /renew6")
  run("ipconfig /flushdns")

elsif os =~ /darwin/
  iface = `route get default 2>/dev/null`[/interface: (\S+)/, 1]
  if iface
    run("sudo ipconfig set #{iface} NONE")
    run("sudo ipconfig set #{iface} DHCP")
  end
  run("sudo dscacheutil -flushcache")
  run("sudo killall -HUP mDNSResponder")

elsif os =~ /linux/
  iface = `ip route show default 2>/dev/null`[/dev (\S+)/, 1]
  if system("command -v nmcli > /dev/null 2>&1") && iface
    run("sudo nmcli device disconnect #{iface}")
    run("sudo nmcli device connect #{iface}")
  elsif system("command -v dhclient > /dev/null 2>&1") && iface
    run("sudo dhclient -r #{iface}")
    run("sudo dhclient #{iface}")
  end
  if system("command -v resolvectl > /dev/null 2>&1")
    run("sudo resolvectl flush-caches")
  elsif system("command -v systemd-resolve > /dev/null 2>&1")
    run("sudo systemd-resolve --flush-caches")
  end
end

# Restart Snort if it's running as a service, so it re-binds to the
# interface after the reset instead of watching a stale link.
run("sudo systemctl restart snort 2>/dev/null") if system("command -v systemctl > /dev/null 2>&1")

puts "Task completed successfully."

# Footer
puts "Created by DeadmanXXXII"
