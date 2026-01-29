NTNU webedit — Koble til nettverksområde

Bruk \\webedit.ntnu.no\brukernavn som mål for opplasting/redigering hvis dere bruker NTNUs webedit-område. Bytt `brukernavn` med ditt NTNU-brukernavn og logg inn med NTNU-legitimasjon når du blir spurt.

Offisielle veiledninger (NTNU):

- Lag nettside på folk-ntnu: https://i.ntnu.no/wiki/-/wiki/Norsk/Lag+nettside+p%C3%A5+folk-ntnu-no
- Koble til nettverksområde (Windows): https://i.ntnu.no/wiki/-/wiki/Norsk/Koble+til+nettverksomr%C3%A5de+med+Windows
- Koble til nettverksområde (Mac OS X): https://i.ntnu.no/wiki/-/wiki/Norsk/Koble+til+nettverksomr%C3%A5de+med+Mac+OS+X
- Koble til nettverksområde (Linux): https://i.ntnu.no/wiki/-/wiki/Norsk/Koble+til+nettverksomr%C3%A5de+med+Linux

Korte eksempler:

Windows (File Explorer eller PowerShell / cmd):

```powershell
# Mappe som Z: (bytt Z: om nødvendig)
net use Z: \\\\webedit.ntnu.no\\brukernavn
# Eller i PowerShell (vedvarende):
New-PSDrive -Name "W" -PSProvider FileSystem -Root "\\webedit.ntnu.no\\brukernavn" -Persist
```

Mac (Finder -> Go -> Connect to Server eller terminal):

```bash
# Fra Finder: Connect to Server -> smb://webedit.ntnu.no/brukernavn
# Terminal (krever riktig autentisering/format):
# mkdir -p /Volumes/webedit
# mount_smbfs //brukernavn@webedit.ntnu.no/brukernavn /Volumes/webedit
```

Linux (GNOME: Connect to Server smb://webedit.ntnu.no/brukernavn eller CLI):

```bash
# GUI: Bruk filbehandler -> Connect to Server -> smb://webedit.ntnu.no/brukernavn
# CLI (krever cifs-utils):
sudo mkdir -p /mnt/webedit
sudo mount -t cifs //webedit.ntnu.no/brukernavn /mnt/webedit -o username=brukernavn,uid=$(id -u),gid=$(id -g)
```

Merk: noen miljøer krever domeneformat for brukernavn eller ekstra opsjoner (f.eks. `domain=ntnu.no` eller `sec=ntlmssp`). Følg NTNUs offisielle guider lenket over hvis du får autentiseringsproblemer.

Når du er koblet opp: kopier de publiserbare filene (f.eks. innhold fra `export/` eller `index.html` + `assets/`) inn i `\\webedit.ntnu.no\\brukernavn` etter organisasjonsreglene deres. Test i nettleser via folk-ntnu-side etter opplasting.
