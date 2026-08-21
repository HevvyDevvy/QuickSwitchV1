// Quick Switch v1
// Compatible with IDS: Suricata
//
// Cross-platform network reset: detects the OS at compile time and runs the
// correct native commands rather than assuming Windows syntax everywhere.
// Needs compiling: `rustc quick_switch_suricata.rs -o quick_switch_suricata`

use std::process::Command;

fn run(cmd: &str, args: &[&str]) {
    let _ = Command::new(cmd).args(args).status();
}

fn default_interface_linux() -> Option<String> {
    let out = Command::new("ip").args(["route", "show", "default"]).output().ok()?;
    let text = String::from_utf8_lossy(&out.stdout);
    let mut parts = text.split_whitespace();
    while let Some(p) = parts.next() {
        if p == "dev" {
            return parts.next().map(|s| s.to_string());
        }
    }
    None
}

fn default_interface_macos() -> Option<String> {
    let out = Command::new("route").args(["get", "default"]).output().ok()?;
    let text = String::from_utf8_lossy(&out.stdout);
    for line in text.lines() {
        if let Some(idx) = line.find("interface:") {
            return Some(line[idx + "interface:".len()..].trim().to_string());
        }
    }
    None
}

fn main() {
    println!("Executing IP configuration commands...");

    #[cfg(target_os = "windows")]
    {
        run("ipconfig", &["/release"]);
        run("ipconfig", &["/release6"]);
        run("ipconfig", &["/renew"]);
        run("ipconfig", &["/renew6"]);
        run("ipconfig", &["/flushdns"]);
    }

    #[cfg(target_os = "macos")]
    {
        if let Some(iface) = default_interface_macos() {
            run("sudo", &["ipconfig", "set", &iface, "NONE"]);
            run("sudo", &["ipconfig", "set", &iface, "DHCP"]);
        }
        run("sudo", &["dscacheutil", "-flushcache"]);
        run("sudo", &["killall", "-HUP", "mDNSResponder"]);
    }

    #[cfg(target_os = "linux")]
    {
        if let Some(iface) = default_interface_linux() {
            run("sudo", &["dhclient", "-r", &iface]);
            run("sudo", &["dhclient", &iface]);
        }
        run("sudo", &["resolvectl", "flush-caches"]);
    }

    // Restart Suricata if it's running as a service, so it re-binds to the
    // interface after the reset instead of watching a stale link.
    #[cfg(any(target_os = "linux", target_os = "macos"))]
    run("sudo", &["systemctl", "restart", "suricata"]);

    println!("Task completed successfully.");

    // Footer
    println!("Created by DeadmanXXXII");
}
