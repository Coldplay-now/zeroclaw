use crate::config::Config;
use anyhow::{Context, Result};
use std::fs;
use std::path::PathBuf;
use std::process::Command;

const SERVICE_LABEL: &str = "com.zeroclaw.daemon";

/// Init system detection for Linux
#[derive(Debug, Clone, Copy, PartialEq, Eq)]
enum InitSystem {
    Systemd,
    OpenRC,
    Unknown,
}

/// Detect which init system is active on the system
fn detect_init_system() -> InitSystem {
    // Check for systemd first (most common)
    if Command::new("systemctl")
        .arg("--version")
        .output()
        .map(|o| o.status.success())
        .unwrap_or(false)
    {
        return InitSystem::Systemd;
    }

    // Check for OpenRC (Alpine Linux, Gentoo, etc.)
    if Command::new("rc-status")
        .output()
        .map(|o| o.status.success())
        .unwrap_or(false)
    {
        return InitSystem::OpenRC;
    }

    // Check for /sbin/openrc as a fallback
    if Command::new("/sbin/openrc")
        .arg("--version")
        .output()
        .map(|o| o.status.success())
        .unwrap_or(false)
    {
        return InitSystem::OpenRC;
    }

    InitSystem::Unknown
}

pub fn handle_command(command: &crate::ServiceCommands, config: &Config) -> Result<()> {
    match command {
        crate::ServiceCommands::Install => install(config),
        crate::ServiceCommands::Start => start(config),
        crate::ServiceCommands::Stop => stop(config),
        crate::ServiceCommands::Status => status(config),
        crate::ServiceCommands::Uninstall => uninstall(config),
    }
}

fn install(config: &Config) -> Result<()> {
    if cfg!(target_os = "macos") {
        install_macos(config)
    } else if cfg!(target_os = "linux") {
        install_linux(config)
    } else {
        anyhow::bail!("Service management is supported on macOS and Linux only");
    }
}

fn start(config: &Config) -> Result<()> {
    if cfg!(target_os = "macos") {
        let plist = macos_service_file()?;
        run_checked(Command::new("launchctl").arg("load").arg("-w").arg(&plist))?;
        run_checked(Command::new("launchctl").arg("start").arg(SERVICE_LABEL))?;
        println!("✅ Service started");
        Ok(())
    } else if cfg!(target_os = "linux") {
        let init_system = detect_init_system();
        match init_system {
            InitSystem::Systemd => {
                run_checked(Command::new("systemctl").args(["--user", "daemon-reload"]))?;
                run_checked(Command::new("systemctl").args(["--user", "start", "zeroclaw.service"]))?;
                println!("✅ Service started");
                return Ok(());
            }
            InitSystem::OpenRC => {
                run_checked(Command::new("rc-service").arg("zeroclaw").arg("start"))?;
                println!("✅ Service started");
                return Ok(());
            }
            InitSystem::Unknown => {
                // Try systemd as fallback
                let _ = run_checked(Command::new("systemctl").args(["--user", "daemon-reload"]));
                let _ = run_checked(Command::new("systemctl").args(["--user", "start", "zeroclaw.service"]));
                println!("✅ Service started (systemd)");
                return Ok(());
            }
        }
    } else {
        let _ = config;
        anyhow::bail!("Service management is supported on macOS and Linux only")
    }
}

fn stop(config: &Config) -> Result<()> {
    if cfg!(target_os = "macos") {
        let plist = macos_service_file()?;
        let _ = run_checked(Command::new("launchctl").arg("stop").arg(SERVICE_LABEL));
        let _ = run_checked(
            Command::new("launchctl")
                .arg("unload")
                .arg("-w")
                .arg(&plist),
        );
        println!("✅ Service stopped");
        Ok(())
    } else if cfg!(target_os = "linux") {
        let init_system = detect_init_system();
        match init_system {
            InitSystem::Systemd => {
                let _ = run_checked(Command::new("systemctl").args(["--user", "stop", "zeroclaw.service"]));
                println!("✅ Service stopped");
                return Ok(());
            }
            InitSystem::OpenRC => {
                run_checked(Command::new("rc-service").arg("zeroclaw").arg("stop"))?;
                println!("✅ Service stopped");
                return Ok(());
            }
            InitSystem::Unknown => {
                let _ = run_checked(Command::new("systemctl").args(["--user", "stop", "zeroclaw.service"]));
                println!("✅ Service stopped (systemd)");
                return Ok(());
            }
        }
    } else {
        let _ = config;
        anyhow::bail!("Service management is supported on macOS and Linux only")
    }
}

fn status(config: &Config) -> Result<()> {
    if cfg!(target_os = "macos") {
        let out = run_capture(Command::new("launchctl").arg("list"))?;
        let running = out.lines().any(|line| line.contains(SERVICE_LABEL));
        println!(
            "Service: {}",
            if running {
                "✅ running/loaded"
            } else {
                "❌ not loaded"
            }
        );
        println!("Unit: {}", macos_service_file()?.display());
        return Ok(());
    }

    if cfg!(target_os = "linux") {
        let init_system = detect_init_system();
        match init_system {
            InitSystem::Systemd => {
                let out = run_capture(Command::new("systemctl").args([
                    "--user",
                    "is-active",
                    "zeroclaw.service",
                ]))
                .unwrap_or_else(|_| "unknown".into());
                println!("Init system: systemd");
                println!("Service state: {}", out.trim());
                println!("Unit: {}", linux_service_file(config)?.display());
                return Ok(());
            }
            InitSystem::OpenRC => {
                let out = run_capture(Command::new("rc-service").arg("zeroclaw").arg("status"))
                    .unwrap_or_else(|_| "unknown".into());
                println!("Init system: OpenRC");
                println!("Service state: {}", out.trim());
                println!("Script: {}", openrc_service_file(config)?.display());
                return Ok(());
            }
            InitSystem::Unknown => {
                println!("Init system: unknown (trying systemd)");
                let out = run_capture(Command::new("systemctl").args([
                    "--user",
                    "is-active",
                    "zeroclaw.service",
                ]))
                .unwrap_or_else(|_| "unknown".into());
                println!("Service state: {}", out.trim());
                return Ok(());
            }
        }
    }

    anyhow::bail!("Service management is supported on macOS and Linux only")
}

fn uninstall(config: &Config) -> Result<()> {
    stop(config)?;

    if cfg!(target_os = "macos") {
        let file = macos_service_file()?;
        if file.exists() {
            fs::remove_file(&file)
                .with_context(|| format!("Failed to remove {}", file.display()))?;
        }
        println!("✅ Service uninstalled ({})", file.display());
        return Ok(());
    }

    if cfg!(target_os = "linux") {
        let init_system = detect_init_system();
        match init_system {
            InitSystem::Systemd => {
                let file = linux_service_file(config)?;
                if file.exists() {
                    fs::remove_file(&file)
                        .with_context(|| format!("Failed to remove {}", file.display()))?;
                }
                let _ = run_checked(Command::new("systemctl").args(["--user", "daemon-reload"]));
                println!("✅ Service uninstalled ({})", file.display());
                return Ok(());
            }
            InitSystem::OpenRC => {
                let file = openrc_service_file(config)?;
                // Disable the service first
                let _ = run_checked(Command::new("rc-update").arg("delete").arg("zeroclaw").arg("default"));
                if file.exists() {
                    fs::remove_file(&file)
                        .with_context(|| format!("Failed to remove {}", file.display()))?;
                }
                println!("✅ Service uninstalled ({})", file.display());
                return Ok(());
            }
            InitSystem::Unknown => {
                let file = linux_service_file(config)?;
                if file.exists() {
                    fs::remove_file(&file)
                        .with_context(|| format!("Failed to remove {}", file.display()))?;
                }
                let _ = run_checked(Command::new("systemctl").args(["--user", "daemon-reload"]));
                println!("✅ Service uninstalled ({})", file.display());
                return Ok(());
            }
        }
    }

    anyhow::bail!("Service management is supported on macOS and Linux only")
}

fn install_macos(config: &Config) -> Result<()> {
    let file = macos_service_file()?;
    if let Some(parent) = file.parent() {
        fs::create_dir_all(parent)?;
    }

    let exe = std::env::current_exe().context("Failed to resolve current executable")?;
    let logs_dir = config
        .config_path
        .parent()
        .map_or_else(|| PathBuf::from("."), PathBuf::from)
        .join("logs");
    fs::create_dir_all(&logs_dir)?;

    let stdout = logs_dir.join("daemon.stdout.log");
    let stderr = logs_dir.join("daemon.stderr.log");

    let plist = format!(
        r#"<?xml version=\"1.0\" encoding=\"UTF-8\"?>
<!DOCTYPE plist PUBLIC \"-//Apple//DTD PLIST 1.0//EN\" \"http://www.apple.com/DTDs/PropertyList-1.0.dtd\">
<plist version=\"1.0\">
<dict>
  <key>Label</key>
  <string>{label}</string>
  <key>ProgramArguments</key>
  <array>
    <string>{exe}</string>
    <string>daemon</string>
  </array>
  <key>RunAtLoad</key>
  <true/>
  <key>KeepAlive</key>
  <true/>
  <key>StandardOutPath</key>
  <string>{stdout}</string>
  <key>StandardErrorPath</key>
  <string>{stderr}</string>
</dict>
</plist>
"#,
        label = SERVICE_LABEL,
        exe = xml_escape(&exe.display().to_string()),
        stdout = xml_escape(&stdout.display().to_string()),
        stderr = xml_escape(&stderr.display().to_string())
    );

    fs::write(&file, plist)?;
    println!("✅ Installed launchd service: {}", file.display());
    println!("   Start with: zeroclaw service start");
    Ok(())
}

fn install_linux(config: &Config) -> Result<()> {
    let init_system = detect_init_system();

    match init_system {
        InitSystem::Systemd => install_systemd(config),
        InitSystem::OpenRC => install_openrc(config),
        InitSystem::Unknown => {
            // Fallback to systemd for unknown systems (may work in user sessions)
            eprintln!("⚠️  Could not detect init system, trying systemd...");
            install_systemd(config)
        }
    }
}

fn install_systemd(config: &Config) -> Result<()> {
    let file = linux_service_file(config)?;
    if let Some(parent) = file.parent() {
        fs::create_dir_all(parent)?;
    }

    let exe = std::env::current_exe().context("Failed to resolve current executable")?;
    let unit = format!(
        "[Unit]\nDescription=ZeroClaw daemon\nAfter=network.target\n\n[Service]\nType=simple\nExecStart={} daemon\nRestart=always\nRestartSec=3\n\n[Install]\nWantedBy=default.target\n",
        exe.display()
    );

    fs::write(&file, unit)?;
    let _ = run_checked(Command::new("systemctl").args(["--user", "daemon-reload"]));
    let _ = run_checked(Command::new("systemctl").args(["--user", "enable", "zeroclaw.service"]));
    println!("✅ Installed systemd user service: {}", file.display());
    println!("   Start with: zeroclaw service start");
    Ok(())
}

fn install_openrc(config: &Config) -> Result<()> {
    let file = openrc_service_file(config)?;
    if let Some(parent) = file.parent() {
        fs::create_dir_all(parent)?;
    }

    let exe = std::env::current_exe().context("Failed to resolve current executable")?;

    // OpenRC init script
    let init_script = format!(
        r#"#!/sbin/openrc-run

description="ZeroClaw AI assistant daemon"
command="{exe}"
command_args="daemon"
command_background=true
pidfile="/run/$RC_SVCNAME.pid"
output_log="/var/log/zeroclaw/daemon.log"
error_log="/var/log/zeroclaw/daemon.error.log"

depend() {{
    need net
    after firewall
}}

start_pre() {{
    checkpath --directory --owner root:root --mode 0755 /var/log/zeroclaw
}}
"#,
        exe = exe.display()
    );

    fs::write(&file, init_script)?;

    // Make the script executable
    let mut perms = fs::metadata(&file)?.permissions();
    #[cfg(unix)]
    {
        use std::os::unix::fs::PermissionsExt;
        perms.set_mode(0o755);
        fs::set_permissions(&file, perms)?;
    }

    // Enable the service (add to default runlevel)
    let _ = run_checked(Command::new("rc-update").arg("add").arg("zeroclaw").arg("default"));

    println!("✅ Installed OpenRC service: {}", file.display());
    println!("   Start with: zeroclaw service start");
    println!("   Or: rc-service zeroclaw start");
    Ok(())
}

fn macos_service_file() -> Result<PathBuf> {
    let home = directories::UserDirs::new()
        .map(|u| u.home_dir().to_path_buf())
        .context("Could not find home directory")?;
    Ok(home
        .join("Library")
        .join("LaunchAgents")
        .join(format!("{SERVICE_LABEL}.plist")))
}

fn linux_service_file(config: &Config) -> Result<PathBuf> {
    let home = directories::UserDirs::new()
        .map(|u| u.home_dir().to_path_buf())
        .context("Could not find home directory")?;
    let _ = config;
    Ok(home
        .join(".config")
        .join("systemd")
        .join("user")
        .join("zeroclaw.service"))
}

fn openrc_service_file(config: &Config) -> Result<PathBuf> {
    let _ = config;
    // OpenRC init scripts are typically in /etc/init.d/ or /etc/local.d/
    // For user-managed services, we use /etc/init.d/ for system-wide or
    // ~/.local/init.d/ for user-local (less common)
    // We'll use /etc/init.d/ which requires root, or fall back to ~/.local/init.d/
    if PathBuf::from("/etc/init.d").exists() && std::env::var("USER").ok().as_deref() == Some("root") {
        Ok(PathBuf::from("/etc/init.d/zeroclaw"))
    } else {
        // For non-root users, use a local init directory
        let home = directories::UserDirs::new()
            .map(|u| u.home_dir().to_path_buf())
            .context("Could not find home directory")?;
        Ok(home
            .join(".local")
            .join("init.d")
            .join("zeroclaw"))
    }
}

fn run_checked(command: &mut Command) -> Result<()> {
    let output = command.output().context("Failed to spawn command")?;
    if !output.status.success() {
        let stderr = String::from_utf8_lossy(&output.stderr);
        anyhow::bail!("Command failed: {}", stderr.trim());
    }
    Ok(())
}

fn run_capture(command: &mut Command) -> Result<String> {
    let output = command.output().context("Failed to spawn command")?;
    let mut text = String::from_utf8_lossy(&output.stdout).to_string();
    if text.trim().is_empty() {
        text = String::from_utf8_lossy(&output.stderr).to_string();
    }
    Ok(text)
}

fn xml_escape(raw: &str) -> String {
    raw.replace('&', "&amp;")
        .replace('<', "&lt;")
        .replace('>', "&gt;")
        .replace('"', "&quot;")
        .replace('\'', "&apos;")
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn xml_escape_escapes_reserved_chars() {
        let escaped = xml_escape("<&>\"' and text");
        assert_eq!(escaped, "&lt;&amp;&gt;&quot;&apos; and text");
    }

    #[test]
    fn run_capture_reads_stdout() {
        let out = run_capture(Command::new("sh").args(["-lc", "echo hello"]))
            .expect("stdout capture should succeed");
        assert_eq!(out.trim(), "hello");
    }

    #[test]
    fn run_capture_falls_back_to_stderr() {
        let out = run_capture(Command::new("sh").args(["-lc", "echo warn 1>&2"]))
            .expect("stderr capture should succeed");
        assert_eq!(out.trim(), "warn");
    }

    #[test]
    fn run_checked_errors_on_non_zero_status() {
        let err = run_checked(Command::new("sh").args(["-lc", "exit 17"]))
            .expect_err("non-zero exit should error");
        assert!(err.to_string().contains("Command failed"));
    }

    #[test]
    fn linux_service_file_has_expected_suffix() {
        let file = linux_service_file(&Config::default()).unwrap();
        let path = file.to_string_lossy();
        assert!(path.ends_with(".config/systemd/user/zeroclaw.service"));
    }

    #[test]
    fn openrc_service_file_has_expected_suffix() {
        let file = openrc_service_file(&Config::default()).unwrap();
        let path = file.to_string_lossy();
        // For non-root users, should be in ~/.local/init.d/
        assert!(path.contains(".local/init.d/zeroclaw") || path.contains("/etc/init.d/zeroclaw"));
    }
}
