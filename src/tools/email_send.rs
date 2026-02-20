use super::traits::{Tool, ToolResult};
use crate::config::EmailToolConfig;
use crate::security::SecurityPolicy;
use async_trait::async_trait;
use lettre::message::{header::ContentType, Attachment, MultiPart, SinglePart};
use lettre::transport::smtp::authentication::Credentials;
use lettre::{Message, SmtpTransport, Transport};
use serde_json::json;
use std::path::{Path, PathBuf};
use std::sync::Arc;

pub struct EmailSendTool {
    security: Arc<SecurityPolicy>,
    config: EmailToolConfig,
}

impl EmailSendTool {
    const MAX_ATTACHMENT_BYTES: usize = 10 * 1024 * 1024;

    pub fn new(security: Arc<SecurityPolicy>, config: EmailToolConfig) -> Self {
        Self { security, config }
    }

    /// Check whether `addr` is permitted by `allowed_recipients`.
    ///
    /// Rules (same convention as `allowed_senders` on the Email channel):
    ///   - empty list → deny all
    ///   - `["*"]`    → allow all
    ///   - exact match or domain-suffix match (e.g. `@example.com`)
    fn is_recipient_allowed(&self, addr: &str) -> bool {
        if self.config.allowed_recipients.is_empty() {
            return false;
        }
        let addr_lower = addr.to_lowercase();
        self.config
            .allowed_recipients
            .iter()
            .any(|pattern: &String| {
                if pattern == "*" {
                    return true;
                }
                let pat = pattern.to_lowercase();
                if pat.starts_with('@') {
                    // Domain-suffix match: "@example.com" allows "user@example.com"
                    addr_lower.ends_with(&pat)
                } else {
                    addr_lower == pat
                }
            })
    }

    fn detect_content_type(path: &Path) -> anyhow::Result<ContentType> {
        let mime = match path.extension().and_then(|v| v.to_str()).unwrap_or("") {
            "txt" | "md" | "log" => "text/plain; charset=utf-8",
            "html" | "htm" => "text/html; charset=utf-8",
            "json" => "application/json",
            "csv" => "text/csv; charset=utf-8",
            "pdf" => "application/pdf",
            "png" => "image/png",
            "jpg" | "jpeg" => "image/jpeg",
            "gif" => "image/gif",
            "webp" => "image/webp",
            _ => "application/octet-stream",
        };
        ContentType::parse(mime)
            .map_err(|e| anyhow::anyhow!("Failed to parse MIME type '{mime}': {e}"))
    }

    fn resolve_attachments(
        &self,
        args: &serde_json::Value,
    ) -> anyhow::Result<Vec<(String, Vec<u8>, ContentType)>> {
        let Some(raw_attachments) = args.get("attachments") else {
            return Ok(vec![]);
        };
        let attachment_list = raw_attachments
            .as_array()
            .ok_or_else(|| anyhow::anyhow!("'attachments' must be an array of file paths"))?;
        let mut resolved = Vec::with_capacity(attachment_list.len());

        for (idx, item) in attachment_list.iter().enumerate() {
            let raw = item
                .as_str()
                .map(str::trim)
                .filter(|v| !v.is_empty())
                .ok_or_else(|| {
                    anyhow::anyhow!("attachments[{idx}] must be a non-empty string path")
                })?;

            if !self.security.is_path_allowed(raw) {
                anyhow::bail!("Attachment path is not allowed: {raw}");
            }

            let rel_path = PathBuf::from(raw);
            if rel_path.is_absolute() {
                anyhow::bail!("Attachment path must be relative to workspace: {raw}");
            }

            let candidate = self.security.workspace_dir.join(&rel_path);
            let resolved_path = candidate.canonicalize().map_err(|e| {
                anyhow::anyhow!(
                    "Attachment file does not exist or cannot be resolved '{}': {}",
                    candidate.display(),
                    e
                )
            })?;

            if !self.security.is_resolved_path_allowed(&resolved_path) {
                anyhow::bail!(
                    "Attachment path escapes workspace boundary: {}",
                    resolved_path.display()
                );
            }

            let bytes = std::fs::read(&resolved_path).map_err(|e| {
                anyhow::anyhow!(
                    "Failed to read attachment '{}': {}",
                    resolved_path.display(),
                    e
                )
            })?;
            if bytes.len() > Self::MAX_ATTACHMENT_BYTES {
                anyhow::bail!(
                    "Attachment exceeds size limit ({} bytes): {}",
                    Self::MAX_ATTACHMENT_BYTES,
                    resolved_path.display()
                );
            }

            let filename = resolved_path
                .file_name()
                .and_then(|v| v.to_str())
                .ok_or_else(|| {
                    anyhow::anyhow!(
                        "Attachment file name is invalid UTF-8: {}",
                        resolved_path.display()
                    )
                })?
                .to_string();
            let content_type = Self::detect_content_type(&resolved_path)?;
            resolved.push((filename, bytes, content_type));
        }

        Ok(resolved)
    }
}

#[async_trait]
impl Tool for EmailSendTool {
    fn name(&self) -> &str {
        "email_send"
    }

    fn description(&self) -> &str {
        "Send an email via SMTP. Supports plain text/HTML body and optional attachments from workspace files."
    }

    fn parameters_schema(&self) -> serde_json::Value {
        json!({
            "type": "object",
            "properties": {
                "to": {
                    "type": "string",
                    "description": "Recipient email address"
                },
                "subject": {
                    "type": "string",
                    "description": "Email subject line"
                },
                "body": {
                    "type": "string",
                    "description": "Email body content (plain text by default, or HTML if html=true)"
                },
                "html": {
                    "type": "boolean",
                    "description": "Set to true to send body as HTML instead of plain text (default: false)"
                },
                "attachments": {
                    "type": "array",
                    "description": "Optional attachment file paths (relative to workspace only)",
                    "items": {
                        "type": "string"
                    }
                }
            },
            "required": ["to", "subject", "body"]
        })
    }

    async fn execute(&self, args: serde_json::Value) -> anyhow::Result<ToolResult> {
        // ── Security gates ──────────────────────────────────────
        if !self.security.can_act() {
            return Ok(ToolResult {
                success: false,
                output: String::new(),
                error: Some("Action blocked: autonomy is read-only".into()),
            });
        }

        if !self.security.record_action() {
            return Ok(ToolResult {
                success: false,
                output: String::new(),
                error: Some("Action blocked: rate limit exceeded".into()),
            });
        }

        // ── Parse parameters ────────────────────────────────────
        let to = args
            .get("to")
            .and_then(|v| v.as_str())
            .map(str::trim)
            .filter(|v| !v.is_empty())
            .ok_or_else(|| anyhow::anyhow!("Missing required parameter 'to'"))?
            .to_string();

        let subject = args
            .get("subject")
            .and_then(|v| v.as_str())
            .map(str::trim)
            .filter(|v| !v.is_empty())
            .ok_or_else(|| anyhow::anyhow!("Missing required parameter 'subject'"))?
            .to_string();

        let body = args
            .get("body")
            .and_then(|v| v.as_str())
            .map(str::trim)
            .filter(|v| !v.is_empty())
            .ok_or_else(|| anyhow::anyhow!("Missing required parameter 'body'"))?
            .to_string();

        let html = args.get("html").and_then(|v| v.as_bool()).unwrap_or(false);
        let attachments = self.resolve_attachments(&args)?;

        // ── Recipient allowlist ─────────────────────────────────
        if !self.is_recipient_allowed(&to) {
            return Ok(ToolResult {
                success: false,
                output: String::new(),
                error: Some(format!(
                    "Recipient '{}' is not in allowed_recipients list",
                    to
                )),
            });
        }

        // ── Validate config ─────────────────────────────────────
        if self.config.smtp_host.is_empty() {
            return Ok(ToolResult {
                success: false,
                output: String::new(),
                error: Some("SMTP host is not configured".into()),
            });
        }

        if self.config.from_address.is_empty() {
            return Ok(ToolResult {
                success: false,
                output: String::new(),
                error: Some("From address is not configured".into()),
            });
        }

        // ── Build email ─────────────────────────────────────────
        let part = if html {
            SinglePart::html(body)
        } else {
            SinglePart::plain(body)
        };

        let builder = Message::builder()
            .from(
                self.config
                    .from_address
                    .parse()
                    .map_err(|e| anyhow::anyhow!("Invalid from_address: {}", e))?,
            )
            .to(to
                .parse()
                .map_err(|e| anyhow::anyhow!("Invalid recipient address '{}': {}", to, e))?)
            .subject(subject);

        let email = if attachments.is_empty() {
            builder
                .singlepart(part)
                .map_err(|e| anyhow::anyhow!("Failed to build email: {}", e))?
        } else {
            let multipart = attachments.into_iter().fold(
                MultiPart::mixed().singlepart(part),
                |acc, (filename, bytes, content_type)| {
                    acc.singlepart(Attachment::new(filename).body(bytes, content_type))
                },
            );
            builder
                .multipart(multipart)
                .map_err(|e| anyhow::anyhow!("Failed to build email with attachments: {}", e))?
        };

        // ── Resolve password (config → env var fallback) ────────
        let password = if self.config.password.is_empty() {
            std::env::var("EMAIL_TOOL_PASSWORD").unwrap_or_default()
        } else {
            self.config.password.clone()
        };

        if password.is_empty() {
            return Ok(ToolResult {
                success: false,
                output: String::new(),
                error: Some(
                    "SMTP password is not configured (set in config.toml or EMAIL_TOOL_PASSWORD env var)".into(),
                ),
            });
        }

        // ── Build SMTP transport ────────────────────────────────
        let creds = Credentials::new(self.config.username.clone(), password);

        let transport = if !self.config.smtp_tls {
            // No TLS — plaintext (dangerous, for trusted LAN only)
            SmtpTransport::builder_dangerous(&self.config.smtp_host)
                .port(self.config.smtp_port)
                .credentials(creds)
                .build()
        } else if self.config.smtp_port == 587 {
            // Port 587 → STARTTLS (connect plaintext, then upgrade)
            SmtpTransport::starttls_relay(&self.config.smtp_host)
                .map_err(|e| anyhow::anyhow!("SMTP STARTTLS error: {}", e))?
                .port(self.config.smtp_port)
                .credentials(creds)
                .build()
        } else {
            // Port 465 or other → implicit TLS
            SmtpTransport::relay(&self.config.smtp_host)
                .map_err(|e| anyhow::anyhow!("SMTP relay error: {}", e))?
                .port(self.config.smtp_port)
                .credentials(creds)
                .build()
        };

        // ── Send ────────────────────────────────────────────────
        match transport.send(&email) {
            Ok(_) => Ok(ToolResult {
                success: true,
                output: format!("Email sent successfully to {}", to),
                error: None,
            }),
            Err(e) => Ok(ToolResult {
                success: false,
                output: String::new(),
                error: Some(format!("Failed to send email: {}", e)),
            }),
        }
    }
}

#[cfg(test)]
mod tests {
    use super::*;
    use crate::security::AutonomyLevel;

    fn test_security(level: AutonomyLevel, max_actions_per_hour: u32) -> Arc<SecurityPolicy> {
        Arc::new(SecurityPolicy {
            autonomy: level,
            max_actions_per_hour,
            workspace_dir: std::env::temp_dir(),
            ..SecurityPolicy::default()
        })
    }

    fn test_config() -> EmailToolConfig {
        EmailToolConfig {
            enabled: true,
            smtp_host: "smtp.example.com".into(),
            smtp_port: 465,
            smtp_tls: true,
            username: "test_user".into(),
            password: "test_pass".into(),
            from_address: "zeroclaw_bot@example.com".into(),
            allowed_recipients: vec!["allowed@example.com".into(), "@corp.example.com".into()],
        }
    }

    #[test]
    fn email_send_tool_name() {
        let tool = EmailSendTool::new(test_security(AutonomyLevel::Full, 100), test_config());
        assert_eq!(tool.name(), "email_send");
    }

    #[test]
    fn email_send_tool_description() {
        let tool = EmailSendTool::new(test_security(AutonomyLevel::Full, 100), test_config());
        assert!(!tool.description().is_empty());
    }

    #[test]
    fn email_send_tool_has_parameters_schema() {
        let tool = EmailSendTool::new(test_security(AutonomyLevel::Full, 100), test_config());
        let schema = tool.parameters_schema();
        assert_eq!(schema["type"], "object");
        assert!(schema["properties"].get("to").is_some());
        assert!(schema["properties"].get("subject").is_some());
        assert!(schema["properties"].get("body").is_some());
        assert!(schema["properties"].get("html").is_some());
        assert!(schema["properties"].get("attachments").is_some());
    }

    #[test]
    fn email_send_tool_requires_to_subject_body() {
        let tool = EmailSendTool::new(test_security(AutonomyLevel::Full, 100), test_config());
        let schema = tool.parameters_schema();
        let required = schema["required"].as_array().unwrap();
        assert!(required.contains(&serde_json::Value::String("to".into())));
        assert!(required.contains(&serde_json::Value::String("subject".into())));
        assert!(required.contains(&serde_json::Value::String("body".into())));
    }

    #[tokio::test]
    async fn execute_blocks_readonly_mode() {
        let tool = EmailSendTool::new(test_security(AutonomyLevel::ReadOnly, 100), test_config());

        let result = tool
            .execute(json!({"to": "allowed@example.com", "subject": "hi", "body": "hello"}))
            .await
            .unwrap();
        assert!(!result.success);
        assert!(result.error.unwrap().contains("read-only"));
    }

    #[tokio::test]
    async fn execute_blocks_rate_limit() {
        let tool = EmailSendTool::new(test_security(AutonomyLevel::Full, 0), test_config());

        let result = tool
            .execute(json!({"to": "allowed@example.com", "subject": "hi", "body": "hello"}))
            .await
            .unwrap();
        assert!(!result.success);
        assert!(result.error.unwrap().contains("rate limit"));
    }

    #[tokio::test]
    async fn execute_rejects_disallowed_recipient() {
        let tool = EmailSendTool::new(test_security(AutonomyLevel::Full, 100), test_config());

        let result = tool
            .execute(json!({"to": "stranger@evil.com", "subject": "hi", "body": "hello"}))
            .await
            .unwrap();
        assert!(!result.success);
        assert!(result.error.unwrap().contains("not in allowed_recipients"));
    }

    #[tokio::test]
    async fn execute_allows_exact_recipient() {
        // This will fail at SMTP connect (no real server), but should pass
        // the allowlist check and reach the SMTP send stage.
        let tool = EmailSendTool::new(test_security(AutonomyLevel::Full, 100), test_config());

        let result = tool
            .execute(json!({"to": "allowed@example.com", "subject": "hi", "body": "hello"}))
            .await
            .unwrap();
        // We expect failure at SMTP transport level (no real server), not at allowlist
        if !result.success {
            let err = result.error.unwrap();
            assert!(
                !err.contains("not in allowed_recipients"),
                "Should pass allowlist check: {err}"
            );
        }
    }

    #[tokio::test]
    async fn execute_allows_domain_suffix_recipient() {
        let tool = EmailSendTool::new(test_security(AutonomyLevel::Full, 100), test_config());

        let result = tool
            .execute(json!({
                "to": "user_a@corp.example.com",
                "subject": "hi",
                "body": "hello"
            }))
            .await
            .unwrap();
        if !result.success {
            let err = result.error.unwrap();
            assert!(
                !err.contains("not in allowed_recipients"),
                "Domain suffix should match: {err}"
            );
        }
    }

    #[tokio::test]
    async fn execute_rejects_empty_allowed_list() {
        let mut cfg = test_config();
        cfg.allowed_recipients = vec![];

        let tool = EmailSendTool::new(test_security(AutonomyLevel::Full, 100), cfg);

        let result = tool
            .execute(json!({"to": "anyone@example.com", "subject": "hi", "body": "hello"}))
            .await
            .unwrap();
        assert!(!result.success);
        assert!(result.error.unwrap().contains("not in allowed_recipients"));
    }

    #[tokio::test]
    async fn execute_allows_wildcard_recipients() {
        let mut cfg = test_config();
        cfg.allowed_recipients = vec!["*".into()];

        let tool = EmailSendTool::new(test_security(AutonomyLevel::Full, 100), cfg);

        let result = tool
            .execute(json!({"to": "anyone@anywhere.com", "subject": "hi", "body": "hello"}))
            .await
            .unwrap();
        // Should pass allowlist; may fail at SMTP
        if !result.success {
            let err = result.error.unwrap();
            assert!(
                !err.contains("not in allowed_recipients"),
                "Wildcard should allow all: {err}"
            );
        }
    }

    #[test]
    fn recipient_check_is_case_insensitive() {
        let tool = EmailSendTool::new(test_security(AutonomyLevel::Full, 100), test_config());
        assert!(tool.is_recipient_allowed("Allowed@Example.COM"));
        assert!(tool.is_recipient_allowed("user_a@Corp.Example.Com"));
    }

    #[tokio::test]
    async fn execute_rejects_empty_smtp_host() {
        let mut cfg = test_config();
        cfg.smtp_host = String::new();
        cfg.allowed_recipients = vec!["*".into()];

        let tool = EmailSendTool::new(test_security(AutonomyLevel::Full, 100), cfg);

        let result = tool
            .execute(json!({"to": "user_a@example.com", "subject": "hi", "body": "hello"}))
            .await
            .unwrap();
        assert!(!result.success);
        assert!(result.error.unwrap().contains("SMTP host"));
    }

    /// Tests env-var password fallback (both missing and present).
    /// Combined into one test to avoid env-var race conditions in parallel tests.
    #[tokio::test]
    async fn execute_password_env_var_fallback() {
        // Use a mutex-like env var name unique to this test to avoid global state issues.
        // Step 1: empty config password + no env var → should reject
        std::env::remove_var("EMAIL_TOOL_PASSWORD");

        let mut cfg = test_config();
        cfg.password = String::new();
        cfg.allowed_recipients = vec!["*".into()];

        let tool = EmailSendTool::new(test_security(AutonomyLevel::Full, 100), cfg);
        let result = tool
            .execute(json!({"to": "user_a@example.com", "subject": "hi", "body": "hello"}))
            .await
            .unwrap();
        assert!(!result.success);
        assert!(
            result.error.as_deref().unwrap().contains("SMTP password"),
            "Expected password error, got: {:?}",
            result.error
        );

        // Step 2: set env var → should pass password check (fail at SMTP connect)
        std::env::set_var("EMAIL_TOOL_PASSWORD", "env_secret");

        let mut cfg2 = test_config();
        cfg2.password = String::new();
        cfg2.allowed_recipients = vec!["*".into()];

        let tool2 = EmailSendTool::new(test_security(AutonomyLevel::Full, 100), cfg2);
        let result2 = tool2
            .execute(json!({"to": "user_a@example.com", "subject": "hi", "body": "hello"}))
            .await
            .unwrap();
        if !result2.success {
            let err = result2.error.unwrap();
            assert!(
                !err.contains("SMTP password"),
                "Should use env var fallback: {err}"
            );
        }

        // Clean up
        std::env::remove_var("EMAIL_TOOL_PASSWORD");
    }

    #[tokio::test]
    async fn execute_rejects_non_array_attachments() {
        let tool = EmailSendTool::new(test_security(AutonomyLevel::Full, 100), test_config());
        let result = tool
            .execute(json!({
                "to": "allowed@example.com",
                "subject": "hello",
                "body": "world",
                "attachments": "not-an-array"
            }))
            .await;

        assert!(result.is_err());
        assert!(result
            .err()
            .unwrap()
            .to_string()
            .contains("attachments"));
    }

    #[tokio::test]
    async fn execute_rejects_attachment_outside_workspace() {
        let mut cfg = test_config();
        cfg.allowed_recipients = vec!["*".into()];
        let tool = EmailSendTool::new(test_security(AutonomyLevel::Full, 100), cfg);

        let result = tool
            .execute(json!({
                "to": "user_a@example.com",
                "subject": "hello",
                "body": "world",
                "attachments": ["/etc/hosts"]
            }))
            .await;

        assert!(result.is_err());
        assert!(result
            .err()
            .unwrap()
            .to_string()
            .contains("Attachment path"));
    }

    #[tokio::test]
    async fn execute_rejects_missing_attachment_file() {
        let mut cfg = test_config();
        cfg.allowed_recipients = vec!["*".into()];
        let tool = EmailSendTool::new(test_security(AutonomyLevel::Full, 100), cfg);

        let result = tool
            .execute(json!({
                "to": "user_a@example.com",
                "subject": "hello",
                "body": "world",
                "attachments": ["not_exists.txt"]
            }))
            .await;

        assert!(result.is_err());
        assert!(result
            .err()
            .unwrap()
            .to_string()
            .contains("does not exist"));
    }
}
