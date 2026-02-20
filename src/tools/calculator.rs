use super::traits::{Tool, ToolResult};
use crate::security::SecurityPolicy;
use async_trait::async_trait;
use meval::Expr;
use serde_json::json;
use std::sync::Arc;

const MAX_EXPRESSION_LEN: usize = 200;
const DEFAULT_PRECISION: usize = 6;
const MAX_PRECISION: usize = 12;

/// Calculator tool for deterministic in-process math evaluation.
pub struct CalculatorTool {
    security: Arc<SecurityPolicy>,
}

impl CalculatorTool {
    pub fn new(security: Arc<SecurityPolicy>) -> Self {
        Self { security }
    }

    fn normalize_precision(args: &serde_json::Value) -> anyhow::Result<usize> {
        let precision = args
            .get("precision")
            .and_then(|v| v.as_u64())
            .map_or(DEFAULT_PRECISION, |v| v as usize);
        if precision > MAX_PRECISION {
            anyhow::bail!("precision must be <= {MAX_PRECISION}");
        }
        Ok(precision)
    }

    fn format_result(value: f64, precision: usize) -> String {
        let mut s = format!("{value:.precision$}");
        if s.contains('.') {
            s = s.trim_end_matches('0').trim_end_matches('.').to_string();
        }
        if s.is_empty() { "0".to_string() } else { s }
    }
}

#[async_trait]
impl Tool for CalculatorTool {
    fn name(&self) -> &str {
        "calculator"
    }

    fn description(&self) -> &str {
        "Evaluate a math expression safely inside ZeroClaw (supports +, -, *, /, ^, parentheses, constants pi/e)."
    }

    fn parameters_schema(&self) -> serde_json::Value {
        json!({
            "type": "object",
            "properties": {
                "expression": {
                    "type": "string",
                    "description": "Math expression to evaluate, e.g. (3+5)*2^3, sqrt(81), pow(2,10)"
                },
                "precision": {
                    "type": "integer",
                    "description": "Optional decimal precision for formatted output (0-12, default: 6)"
                }
            },
            "required": ["expression"]
        })
    }

    async fn execute(&self, args: serde_json::Value) -> anyhow::Result<ToolResult> {
        let expression = args
            .get("expression")
            .and_then(|v| v.as_str())
            .map(str::trim)
            .filter(|v| !v.is_empty())
            .ok_or_else(|| anyhow::anyhow!("Missing required parameter 'expression'"))?;

        if expression.len() > MAX_EXPRESSION_LEN {
            return Ok(ToolResult {
                success: false,
                output: String::new(),
                error: Some(format!(
                    "Expression too long: {} chars (max {MAX_EXPRESSION_LEN})",
                    expression.len()
                )),
            });
        }

        if self.security.is_rate_limited() {
            return Ok(ToolResult {
                success: false,
                output: String::new(),
                error: Some("Rate limit exceeded: too many actions in the last hour".into()),
            });
        }
        if !self.security.record_action() {
            return Ok(ToolResult {
                success: false,
                output: String::new(),
                error: Some("Rate limit exceeded: action budget exhausted".into()),
            });
        }

        let precision = Self::normalize_precision(&args)?;

        let expr: Expr = expression.parse().map_err(|e| {
            anyhow::anyhow!("Invalid expression syntax: {e}. Example: (2+3)*4 or sqrt(81)")
        })?;

        let value = expr
            .eval()
            .map_err(|e| anyhow::anyhow!("Failed to evaluate expression: {e}"))?;
        if !value.is_finite() {
            return Ok(ToolResult {
                success: false,
                output: String::new(),
                error: Some("Expression result is not finite (possibly division by zero)".into()),
            });
        }

        let formatted = Self::format_result(value, precision);
        let output = json!({
            "expression": expression,
            "result": value,
            "formatted": formatted,
            "precision": precision
        })
        .to_string();

        Ok(ToolResult {
            success: true,
            output,
            error: None,
        })
    }
}

#[cfg(test)]
mod tests {
    use super::*;
    use crate::security::{AutonomyLevel, SecurityPolicy};

    fn test_security(max_actions_per_hour: u32) -> Arc<SecurityPolicy> {
        Arc::new(SecurityPolicy {
            autonomy: AutonomyLevel::Full,
            max_actions_per_hour,
            workspace_dir: std::env::temp_dir(),
            ..SecurityPolicy::default()
        })
    }

    #[test]
    fn calculator_tool_name() {
        let tool = CalculatorTool::new(test_security(100));
        assert_eq!(tool.name(), "calculator");
    }

    #[test]
    fn calculator_tool_schema_contains_expression() {
        let tool = CalculatorTool::new(test_security(100));
        let schema = tool.parameters_schema();
        assert!(schema["properties"].get("expression").is_some());
        assert!(schema["properties"].get("precision").is_some());
        assert!(schema["required"]
            .as_array()
            .unwrap()
            .contains(&serde_json::Value::String("expression".into())));
    }

    #[tokio::test]
    async fn execute_calculates_basic_expression() {
        let tool = CalculatorTool::new(test_security(100));
        let result = tool
            .execute(json!({"expression": "(3+5)*2^3"}))
            .await
            .unwrap();
        assert!(result.success);
        assert!(result.output.contains("\"formatted\":\"64\""));
    }

    #[tokio::test]
    async fn execute_supports_math_functions() {
        let tool = CalculatorTool::new(test_security(100));
        let result = tool
            .execute(json!({"expression": "sqrt(81)+sin(pi/2)"}))
            .await
            .unwrap();
        assert!(result.success);
        assert!(result.output.contains("\"formatted\":\"10\""));
    }

    #[tokio::test]
    async fn execute_respects_precision() {
        let tool = CalculatorTool::new(test_security(100));
        let result = tool
            .execute(json!({"expression": "10/3", "precision": 2}))
            .await
            .unwrap();
        assert!(result.success);
        assert!(result.output.contains("\"formatted\":\"3.33\""));
    }

    #[tokio::test]
    async fn execute_rejects_invalid_expression() {
        let tool = CalculatorTool::new(test_security(100));
        let result = tool.execute(json!({"expression": "2++*3"})).await;
        assert!(result.is_err());
        assert!(result
            .err()
            .unwrap()
            .to_string()
            .contains("Invalid expression syntax"));
    }

    #[tokio::test]
    async fn execute_rejects_large_precision() {
        let tool = CalculatorTool::new(test_security(100));
        let result = tool
            .execute(json!({"expression": "1/3", "precision": 20}))
            .await;
        assert!(result.is_err());
        assert!(result.err().unwrap().to_string().contains("precision"));
    }

    #[tokio::test]
    async fn execute_blocks_when_rate_limited() {
        let tool = CalculatorTool::new(test_security(0));
        let result = tool.execute(json!({"expression": "1+1"})).await.unwrap();
        assert!(!result.success);
        assert!(result.error.unwrap().contains("Rate limit"));
    }
}
