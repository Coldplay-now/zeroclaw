use super::traits::{Tool, ToolResult};
use async_trait::async_trait;
use serde_json::json;
use std::time::Duration;

/// Web search tool using Brave Search API.
/// Enables agents to search the web for information.
pub struct WebSearchTool {
    api_key: String,
    max_results: usize,
    timeout_secs: u64,
}

impl WebSearchTool {
    pub fn new(api_key: String, max_results: usize, timeout_secs: u64) -> Self {
        Self {
            api_key,
            max_results,
            timeout_secs,
        }
    }

    /// Resolve API key from config or environment variable fallback.
    pub fn resolve_api_key(config_key: Option<&str>) -> Option<String> {
        // 1) Explicit config key
        if let Some(key) = config_key {
            let trimmed = key.trim();
            if !trimmed.is_empty() {
                return Some(trimmed.to_string());
            }
        }
        // 2) Environment variable fallback
        std::env::var("BRAVE_API_KEY")
            .ok()
            .filter(|k| !k.trim().is_empty())
    }
}

#[async_trait]
impl Tool for WebSearchTool {
    fn name(&self) -> &str {
        "web_search"
    }

    fn description(&self) -> &str {
        "Search the web using Brave Search API. Returns titles, URLs, and descriptions of relevant web pages."
    }

    fn parameters_schema(&self) -> serde_json::Value {
        json!({
            "type": "object",
            "properties": {
                "query": {
                    "type": "string",
                    "description": "The search query to look up on the web"
                },
                "count": {
                    "type": "integer",
                    "description": "Number of results to return (1-20, default: 5)",
                    "minimum": 1,
                    "maximum": 20,
                    "default": 5
                }
            },
            "required": ["query"]
        })
    }

    async fn execute(&self, args: serde_json::Value) -> anyhow::Result<ToolResult> {
        let query = args
            .get("query")
            .and_then(|v| v.as_str())
            .ok_or_else(|| anyhow::anyhow!("Missing 'query' parameter"))?;

        if query.trim().is_empty() {
            return Ok(ToolResult {
                success: false,
                output: String::new(),
                error: Some("Search query cannot be empty".into()),
            });
        }

        let count = args
            .get("count")
            .and_then(|v| v.as_u64())
            .map(|c| c.clamp(1, 20) as usize)
            .unwrap_or(self.max_results.clamp(1, 20));

        if self.api_key.is_empty() {
            return Ok(ToolResult {
                success: false,
                output: String::new(),
                error: Some(
                    "Brave API key not configured. Set [web_search].api_key in config.toml or BRAVE_API_KEY env var."
                        .into(),
                ),
            });
        }

        let client = reqwest::Client::builder()
            .timeout(Duration::from_secs(self.timeout_secs))
            .build()?;

        let response = match client
            .get("https://api.search.brave.com/res/v1/web/search")
            .query(&[("q", query), ("count", &count.to_string())])
            .header("Accept", "application/json")
            .header("X-Subscription-Token", &self.api_key)
            .send()
            .await
        {
            Ok(resp) => resp,
            Err(e) => {
                return Ok(ToolResult {
                    success: false,
                    output: String::new(),
                    error: Some(format!("HTTP request failed: {e}")),
                });
            }
        };

        let status = response.status();
        if !status.is_success() {
            let error_body = response
                .text()
                .await
                .unwrap_or_else(|_| "[failed to read error body]".into());
            return Ok(ToolResult {
                success: false,
                output: String::new(),
                error: Some(format!(
                    "Brave Search API error (HTTP {}): {}",
                    status.as_u16(),
                    truncate_string(&error_body, 500)
                )),
            });
        }

        let body: serde_json::Value = match response.json().await {
            Ok(v) => v,
            Err(e) => {
                return Ok(ToolResult {
                    success: false,
                    output: String::new(),
                    error: Some(format!("Failed to parse response JSON: {e}")),
                });
            }
        };

        // Parse search results
        let results = body
            .get("web")
            .and_then(|w| w.get("results"))
            .and_then(|r| r.as_array());

        let output = match results {
            Some(items) if !items.is_empty() => {
                let formatted: Vec<String> = items
                    .iter()
                    .take(count)
                    .enumerate()
                    .map(|(i, item)| {
                        let title = item
                            .get("title")
                            .and_then(|t| t.as_str())
                            .unwrap_or("No title");
                        let url = item.get("url").and_then(|u| u.as_str()).unwrap_or("");
                        let desc = item
                            .get("description")
                            .and_then(|d| d.as_str())
                            .unwrap_or("No description");
                        format!(
                            "{}. {}\n   URL: {}\n   {}",
                            i + 1,
                            title,
                            url,
                            truncate_string(desc, 300)
                        )
                    })
                    .collect();
                formatted.join("\n\n")
            }
            _ => "No results found for the given query.".into(),
        };

        Ok(ToolResult {
            success: true,
            output,
            error: None,
        })
    }
}

fn truncate_string(s: &str, max_len: usize) -> String {
    if s.len() > max_len {
        format!("{}...", &s.chars().take(max_len).collect::<String>())
    } else {
        s.to_string()
    }
}

#[cfg(test)]
mod tests {
    use super::*;

    fn test_tool() -> WebSearchTool {
        WebSearchTool::new("test-api-key".into(), 5, 10)
    }

    #[test]
    fn tool_name_is_web_search() {
        let tool = test_tool();
        assert_eq!(tool.name(), "web_search");
    }

    #[test]
    fn tool_has_description() {
        let tool = test_tool();
        assert!(!tool.description().is_empty());
        assert!(tool.description().contains("Brave"));
    }

    #[test]
    fn parameters_schema_requires_query() {
        let tool = test_tool();
        let schema = tool.parameters_schema();
        assert_eq!(schema["type"], "object");
        assert!(schema["properties"]["query"].is_object());
        assert!(schema["required"]
            .as_array()
            .unwrap()
            .contains(&json!("query")));
    }

    #[tokio::test]
    async fn execute_rejects_empty_query() {
        let tool = test_tool();
        let result = tool.execute(json!({"query": "   "})).await.unwrap();
        assert!(!result.success);
        assert!(result.error.unwrap().contains("empty"));
    }

    #[tokio::test]
    async fn execute_rejects_missing_api_key() {
        let tool = WebSearchTool::new(String::new(), 5, 10);
        let result = tool
            .execute(json!({"query": "rust programming"}))
            .await
            .unwrap();
        assert!(!result.success);
        assert!(result.error.unwrap().contains("API key"));
    }

    #[test]
    fn resolve_api_key_prefers_config() {
        let key = WebSearchTool::resolve_api_key(Some("config-key"));
        assert_eq!(key, Some("config-key".into()));
    }

    #[test]
    fn resolve_api_key_ignores_empty_config() {
        // When config is empty, should fall back to env var (which may not be set in tests)
        let key = WebSearchTool::resolve_api_key(Some("  "));
        // Since BRAVE_API_KEY may or may not be set, we just check it doesn't return the empty string
        assert!(key.as_ref().map(|k| !k.is_empty()).unwrap_or(true));
    }

    #[test]
    fn truncate_string_within_limit() {
        let s = "hello world";
        assert_eq!(truncate_string(s, 100), "hello world");
    }

    #[test]
    fn truncate_string_over_limit() {
        let s = "hello world this is a long string";
        let truncated = truncate_string(s, 10);
        assert!(truncated.len() <= 13); // 10 chars + "..."
        assert!(truncated.ends_with("..."));
    }
}
