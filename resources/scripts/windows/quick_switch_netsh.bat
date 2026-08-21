@echo off
REM Quick Switch v1
REM Full network stack reset (Winsock + TCP/IP), pairs with any firewall/IDS
REM already running on the machine. Broader than the Defender/Firewall-specific
REM scripts: use this if release/renew/flush alone doesn't clear the issue.

echo Executing network stack reset...
netsh winsock reset
netsh int ip reset
ipconfig /release
ipconfig /release6
ipconfig /renew
ipconfig /renew6
ipconfig /flushdns
echo Task completed successfully. A restart may be required for the Winsock
echo reset to take full effect.

REM Footer
echo Created by DeadmanXXXII.
