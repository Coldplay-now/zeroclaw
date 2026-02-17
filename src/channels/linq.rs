use super::traits::{Channel, ChannelMessage, SendMessage};
use async_trait::async_trait;
use uuid::Uuid;

/// `Linq` channel — unified messaging (iMessage, RCS, SMS) via Linq API
///
/// This channel operates in webhook mode (push-based) rather than polling.
/// Messages are received via the gateway's `/linq` webhook endpoint.
/// The `listen` method here is a no-op placeholder; actual message handling
/// happens in the gateway when Linq sends webhook events.
///
/// Linq API documentation: <https://docs.liqnq.com>
pub struct LinqChannel {
    /// Linq API key for authentication
    api_key: String,
    /// Webhook verification token (you define this, Linq sends it back for verification)
    verify_token: String,
    /// Allowed phone numbers or email addresses (E.164 format or email)
    allowed_contacts: Vec<String>,
    client: reqwest::Client,
}

impl LinqChannel {
    pub fn new(
        api_key: String,
        verify_token: String,
        allowed_contacts: Vec<String>,
    ) -> Self {
        Self {
            api_key,
            verify_token,
            allowed_contacts,
            client: reqwest::Client::new(),
        }
    }

    /// Check if a contact is allowed (phone: +1234567890, or email: user@example.com)
    fn is_contact_allowed(&self, contact: &str) -> bool {
        self.allowed_contacts.iter().any(|n| n == "*" || n == contact)
    }

    /// Get the verify token for webhook verification
    pub fn verify_token(&self) -> &str {
        &self.verify_token
    }

    /// Parse an incoming webhook payload from Linq and extract messages
    pub fn parse_webhook_payload(&self, payload: &serde_json::Value) -> Vec<ChannelMessage> {
        let mut messages = Vec::new();

        // Linq webhook structure:
        // { "event": "message_received", "data": { "from": "...", "body": "...", "timestamp": "...", "type": "sms|imessage|rcs" } }
        // Or array format for batch events
        let events = if payload.get("event").is_some() {
            vec![payload]
        } else if let Some(arr) = payload.as_array() {
            arr.iter().collect()
        } else {
            return messages;
        };

        for event in events {
            // Get event type
            let Some(event_type) = event.get("event").and_then(|e| e.as_str()) else {
                continue;
            };

            // Only process message received events
            if event_type != "message_received" {
                continue;
            }

            let Some(data) = event.get("data") else {
                continue;
            };

            // Get sender (phone number or email)
            let Some(from) = data.get("from").and_then(|f| f.as_str()) else {
                continue;
            };

            // Check allowlist
            if !self.is_contact_allowed(from) {
                tracing::warn!(
                    "Linq: ignoring message from unauthorized contact: {from}. \
                    Add to allowed_contacts in config.toml, then run `zeroclaw onboard --channels-only`."
                );
                continue;
            }

            // Extract message content (body or text field)
            let content = data
                .get("body")
                .and_then(|b| b.as_str())
                .or_else(|| data.get("text").and_then(|t| t.as_str()))
                .or_else(|| data.get("message").and_then(|m| m.as_str()))
                .unwrap_or("");

            if content.is_empty() {
                continue;
            }

            // Get message type (sms, imessage, rcs)
            let msg_type = data
                .get("type")
                .and_then(|t| t.as_str())
                .unwrap_or("sms");

            // Get timestamp
            let timestamp = data
                .get("timestamp")
                .and_then(|t| t.as_str())
                .and_then(|t| t.parse::<u64>().ok())
                .unwrap_or_else(|| {
                    std::time::SystemTime::now()
                        .duration_since(std::time::UNIX_EPOCH)
                        .unwrap_or_default()
                        .as_secs()
                });

            messages.push(ChannelMessage {
                id: Uuid::new_v4().to_string(),
                reply_target: from.to_string(),
                sender: from.to_string(),
                content: content.to_string(),
                channel: format!("linq-{}", msg_type),
                timestamp,
            });
        }

        messages
    }
}

#[async_trait]
impl Channel for LinqChannel {
    fn name(&self) -> &str {
        "linq"
    }

    async fn send(&self, message: &SendMessage) -> anyhow::Result<()> {
        // Linq API: POST to https://api.liqnq.com/v1/messages
        let url = "https://api.liqnq.com/v1/messages";

        // Build request body
        let body = serde_json::json!({
            "to": message.recipient,
            "body": message.content,
        });

        let resp = self
            .client
            .post(url)
            .header("Authorization", format!("Bearer {}", self.api_key))
            .header("Content-Type", "application/json")
            .json(&body)
            .send()
            .await?;

        if !resp.status().is_success() {
            let status = resp.status();
            let error_body = resp.text().await.unwrap_or_default();
            tracing::error!("Linq send failed: {status} — {error_body}");
            anyhow::bail!("Linq API error: {status}");
        }

        Ok(())
    }

    async fn listen(&self, _tx: tokio::sync::mpsc::Sender<ChannelMessage>) -> anyhow::Result<()> {
        // Linq uses webhooks (push-based), not polling.
        // Messages are received via the gateway's /linq endpoint.
        // This method keeps the channel "alive" but doesn't actively poll.
        tracing::info!(
            "Linq channel active (webhook mode). \
            Configure Linq webhook to POST to your gateway's /linq endpoint."
        );

        // Keep the task alive — it will be cancelled when the channel shuts down
        loop {
            tokio::time::sleep(std::time::Duration::from_secs(3600)).await;
        }
    }

    async fn health_check(&self) -> bool {
        // Check if we can reach the Linq API
        self.client
            .get("https://api.liqnq.com/v1/health")
            .header("Authorization", format!("Bearer {}", self.api_key))
            .send()
            .await
            .map(|r| r.status().is_success())
            .unwrap_or(false)
    }
}

#[cfg(test)]
mod tests {
    use super::*;

    fn make_channel() -> LinqChannel {
        LinqChannel::new(
            "test-api-key".into(),
            "verify-me".into(),
            vec!["+1234567890".into(), "test@example.com".into()],
        )
    }

    #[test]
    fn linq_channel_name() {
        let ch = make_channel();
        assert_eq!(ch.name(), "linq");
    }

    #[test]
    fn linq_verify_token() {
        let ch = make_channel();
        assert_eq!(ch.verify_token(), "verify-me");
    }

    #[test]
    fn linq_contact_allowed_exact() {
        let ch = make_channel();
        assert!(ch.is_contact_allowed("+1234567890"));
        assert!(ch.is_contact_allowed("test@example.com"));
        assert!(!ch.is_contact_allowed("+9876543210"));
        assert!(!ch.is_contact_allowed("other@example.com"));
    }

    #[test]
    fn linq_contact_allowed_wildcard() {
        let ch = LinqChannel::new("key".into(), "ver".into(), vec!["*".into()]);
        assert!(ch.is_contact_allowed("+1234567890"));
        assert!(ch.is_contact_allowed("test@example.com"));
        assert!(ch.is_contact_allowed("+9999999999"));
    }

    #[test]
    fn linq_contact_denied_empty() {
        let ch = LinqChannel::new("key".into(), "ver".into(), vec![]);
        assert!(!ch.is_contact_allowed("+1234567890"));
    }

    #[test]
    fn linq_parse_empty_payload() {
        let ch = make_channel();
        let payload = serde_json::json!({});
        let msgs = ch.parse_webhook_payload(&payload);
        assert!(msgs.is_empty());
    }

    #[test]
    fn linq_parse_valid_sms_message() {
        let ch = LinqChannel::new(
            "key".into(),
            "ver".into(),
            vec!["+1234567890".into()],
        );
        let payload = serde_json::json!({
            "event": "message_received",
            "data": {
                "from": "+1234567890",
                "body": "Hello ZeroClaw!",
                "type": "sms",
                "timestamp": "1699999999"
            }
        });

        let msgs = ch.parse_webhook_payload(&payload);
        assert_eq!(msgs.len(), 1);
        assert_eq!(msgs[0].sender, "+1234567890");
        assert_eq!(msgs[0].content, "Hello ZeroClaw!");
        assert_eq!(msgs[0].channel, "linq-sms");
        assert_eq!(msgs[0].timestamp, 1_699_999_999);
    }

    #[test]
    fn linq_parse_valid_imessage() {
        let ch = LinqChannel::new(
            "key".into(),
            "ver".into(),
            vec!["test@example.com".into()],
        );
        let payload = serde_json::json!({
            "event": "message_received",
            "data": {
                "from": "test@example.com",
                "text": "iMessage test",
                "type": "imessage",
                "timestamp": "1700000000"
            }
        });

        let msgs = ch.parse_webhook_payload(&payload);
        assert_eq!(msgs.len(), 1);
        assert_eq!(msgs[0].sender, "test@example.com");
        assert_eq!(msgs[0].content, "iMessage test");
        assert_eq!(msgs[0].channel, "linq-imessage");
    }

    #[test]
    fn linq_parse_valid_rcs() {
        let ch = LinqChannel::new(
            "key".into(),
            "ver".into(),
            vec!["*".into()],
        );
        let payload = serde_json::json!({
            "event": "message_received",
            "data": {
                "from": "+1234567890",
                "message": "RCS test",
                "type": "rcs",
                "timestamp": "1700000001"
            }
        });

        let msgs = ch.parse_webhook_payload(&payload);
        assert_eq!(msgs.len(), 1);
        assert_eq!(msgs[0].content, "RCS test");
        assert_eq!(msgs[0].channel, "linq-rcs");
    }

    #[test]
    fn linq_parse_unauthorized_contact() {
        let ch = LinqChannel::new(
            "key".into(),
            "ver".into(),
            vec!["+1111111111".into()],
        );
        let payload = serde_json::json!({
            "event": "message_received",
            "data": {
                "from": "+9999999999",
                "body": "Spam",
                "type": "sms",
                "timestamp": "1699999999"
            }
        });

        let msgs = ch.parse_webhook_payload(&payload);
        assert!(msgs.is_empty(), "Unauthorized contacts should be filtered");
    }

    #[test]
    fn linq_parse_ignores_non_message_events() {
        let ch = LinqChannel::new("key".into(), "ver".into(), vec!["*".into()]);
        let payload = serde_json::json!({
            "event": "message_delivered",
            "data": {
                "from": "+1234567890",
                "body": "Ignored",
                "type": "sms"
            }
        });

        let msgs = ch.parse_webhook_payload(&payload);
        assert!(msgs.is_empty(), "Non-message events should be ignored");
    }

    #[test]
    fn linq_parse_missing_data_skipped() {
        let ch = LinqChannel::new("key".into(), "ver".into(), vec!["*".into()]);
        let payload = serde_json::json!({
            "event": "message_received"
        });

        let msgs = ch.parse_webhook_payload(&payload);
        assert!(msgs.is_empty());
    }

    #[test]
    fn linq_parse_missing_from_field() {
        let ch = LinqChannel::new("key".into(), "ver".into(), vec!["*".into()]);
        let payload = serde_json::json!({
            "event": "message_received",
            "data": {
                "body": "No sender",
                "type": "sms"
            }
        });

        let msgs = ch.parse_webhook_payload(&payload);
        assert!(msgs.is_empty());
    }

    #[test]
    fn linq_parse_empty_body_skipped() {
        let ch = LinqChannel::new("key".into(), "ver".into(), vec!["*".into()]);
        let payload = serde_json::json!({
            "event": "message_received",
            "data": {
                "from": "+1234567890",
                "body": "",
                "type": "sms"
            }
        });

        let msgs = ch.parse_webhook_payload(&payload);
        assert!(msgs.is_empty());
    }

    #[test]
    fn linq_parse_array_events() {
        let ch = LinqChannel::new("key".into(), "ver".into(), vec!["*".into()]);
        let payload = serde_json::json!([
            {
                "event": "message_received",
                "data": {
                    "from": "+1111111111",
                    "body": "First",
                    "type": "sms",
                    "timestamp": "1"
                }
            },
            {
                "event": "message_received",
                "data": {
                    "from": "+2222222222",
                    "body": "Second",
                    "type": "sms",
                    "timestamp": "2"
                }
            }
        ]);

        let msgs = ch.parse_webhook_payload(&payload);
        assert_eq!(msgs.len(), 2);
        assert_eq!(msgs[0].content, "First");
        assert_eq!(msgs[1].content, "Second");
    }

    #[test]
    fn linq_parse_array_mixed_events_filters_non_message() {
        let ch = LinqChannel::new("key".into(), "ver".into(), vec!["*".into()]);
        let payload = serde_json::json!([
            {
                "event": "message_received",
                "data": {
                    "from": "+1111111111",
                    "body": "Keep",
                    "type": "sms",
                    "timestamp": "1"
                }
            },
            {
                "event": "message_delivered",
                "data": {
                    "from": "+1111111111",
                    "status": "delivered"
                }
            }
        ]);

        let msgs = ch.parse_webhook_payload(&payload);
        assert_eq!(msgs.len(), 1);
        assert_eq!(msgs[0].content, "Keep");
    }

    #[test]
    fn linq_parse_unicode_message() {
        let ch = LinqChannel::new("key".into(), "ver".into(), vec!["*".into()]);
        let payload = serde_json::json!({
            "event": "message_received",
            "data": {
                "from": "+1234567890",
                "body": "Hello 👋 世界 🌍 مرحبا",
                "type": "sms",
                "timestamp": "1"
            }
        });

        let msgs = ch.parse_webhook_payload(&payload);
        assert_eq!(msgs.len(), 1);
        assert_eq!(msgs[0].content, "Hello 👋 世界 🌍 مرحبا");
    }

    #[test]
    fn linq_parse_text_field_fallback() {
        let ch = LinqChannel::new("key".into(), "ver".into(), vec!["*".into()]);
        let payload = serde_json::json!({
            "event": "message_received",
            "data": {
                "from": "+1234567890",
                "text": "Using text field",
                "type": "sms",
                "timestamp": "1"
            }
        });

        let msgs = ch.parse_webhook_payload(&payload);
        assert_eq!(msgs.len(), 1);
        assert_eq!(msgs[0].content, "Using text field");
    }

    #[test]
    fn linq_parse_message_field_fallback() {
        let ch = LinqChannel::new("key".into(), "ver".into(), vec!["*".into()]);
        let payload = serde_json::json!({
            "event": "message_received",
            "data": {
                "from": "+1234567890",
                "message": "Using message field",
                "type": "imessage",
                "timestamp": "1"
            }
        });

        let msgs = ch.parse_webhook_payload(&payload);
        assert_eq!(msgs.len(), 1);
        assert_eq!(msgs[0].content, "Using message field");
    }

    #[test]
    fn linq_parse_body_takes_precedence() {
        let ch = LinqChannel::new("key".into(), "ver".into(), vec!["*".into()]);
        let payload = serde_json::json!({
            "event": "message_received",
            "data": {
                "from": "+1234567890",
                "body": "Body wins",
                "text": "Text ignored",
                "message": "Message ignored",
                "type": "sms",
                "timestamp": "1"
            }
        });

        let msgs = ch.parse_webhook_payload(&payload);
        assert_eq!(msgs.len(), 1);
        assert_eq!(msgs[0].content, "Body wins");
    }

    #[test]
    fn linq_parse_missing_timestamp_uses_current() {
        let ch = LinqChannel::new("key".into(), "ver".into(), vec!["*".into()]);
        let payload = serde_json::json!({
            "event": "message_received",
            "data": {
                "from": "+1234567890",
                "body": "Test",
                "type": "sms"
            }
        });

        let msgs = ch.parse_webhook_payload(&payload);
        assert_eq!(msgs.len(), 1);
        assert!(msgs[0].timestamp > 0);
    }

    #[test]
    fn linq_parse_missing_type_defaults_to_sms() {
        let ch = LinqChannel::new("key".into(), "ver".into(), vec!["*".into()]);
        let payload = serde_json::json!({
            "event": "message_received",
            "data": {
                "from": "+1234567890",
                "body": "Test",
                "timestamp": "1"
            }
        });

        let msgs = ch.parse_webhook_payload(&payload);
        assert_eq!(msgs.len(), 1);
        assert_eq!(msgs[0].channel, "linq-sms");
    }

    #[test]
    fn linq_channel_fields_stored_correctly() {
        let ch = LinqChannel::new(
            "my-api-key".into(),
            "my-verify-token".into(),
            vec!["+111".into(), "+222".into(), "user@example.com".into()],
        );
        assert_eq!(ch.verify_token(), "my-verify-token");
        assert!(ch.is_contact_allowed("+111"));
        assert!(ch.is_contact_allowed("+222"));
        assert!(ch.is_contact_allowed("user@example.com"));
        assert!(!ch.is_contact_allowed("+333"));
    }
}
