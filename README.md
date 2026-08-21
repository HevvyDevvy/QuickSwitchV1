QuickSwitch/

├── .github/
│   └── workflows/
│       └── build-desktop.yml

├── build-resources/
│   └── icon.png

├── resources/
│   └── scripts/
│       ├── windows/
│       │   ├── quick_switch_windows_firewall.ps1
│       │   ├── quick_switch_windows_defender.ps1
│       │   └── quick_switch_windows_defender_firewall.bat

│       ├── linux/
│       │   ├── quick_switch_ufw.sh
│       │   ├── quick_switch_iptables.py
│       │   └── quick_switch_snort.sh

│       ├── mac/
│       │   └── quick_switch_snort.sh
│       └── advanced/
│           ├── quick_switch_suricata.py
│           ├── quick_switch_snort.rb
│           └── quick_switch_suricata.rs

├── electron-main.cjs
├── preload.cjs
├── customSign.cjs
├── index.html
├── renderer.js
└── package.json
