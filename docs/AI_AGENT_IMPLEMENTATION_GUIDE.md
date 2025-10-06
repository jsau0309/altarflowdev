# AI Agent Implementation Guide

## Overview
This guide covers how to build AI agents using both OpenAI and Claude/Anthropic platforms based on their official documentation.

## OpenAI Agents SDK

### Core Architecture
- **Agent**: Defines the agent's identity and capabilities
- **Runner**: Executes the agent with input and manages the conversation flow
- **Tools**: Functions and capabilities the agent can use
- **Sessions**: Manages conversation memory and context

### Basic Implementation

```python
from agents import Agent, Runner

# Create an agent
agent = Agent(
    name="Assistant",
    instructions="You are a helpful assistant"
)

# Run synchronously
result = Runner.run_sync(agent, "Your prompt here")
print(result.final_output)

# Run asynchronously
async def main():
    result = await Runner.run(agent, "Your prompt here")
    print(result.final_output)
```

### Tool Implementation

OpenAI offers three types of tools:

#### 1. Hosted Tools
Pre-built tools that run on OpenAI's infrastructure:
- `WebSearchTool()` - Web search capabilities
- `FileSearchTool()` - Vector store retrieval
- `ComputerTool()` - Computer automation
- `CodeInterpreterTool()` - Code execution in sandbox
- `ImageGenerationTool()` - Generate images

```python
from agents import Agent, WebSearchTool, FileSearchTool

agent = Agent(
    name="Research Assistant",
    tools=[
        WebSearchTool(),
        FileSearchTool(
            max_num_results=3,
            vector_store_ids=["vector_store_id"]
        )
    ]
)
```

#### 2. Function Tools
Use any Python function as a tool with automatic schema extraction:

```python
from agents import function_tool
from typing import TypedDict

class Location(TypedDict):
    lat: float
    long: float

@function_tool
async def fetch_weather(location: Location) -> str:
    """Fetch weather for a location.

    Args:
        location: The location to fetch weather for.
    """
    # Implementation here
    return "sunny"

# Custom error handling
@function_tool(failure_error_function=custom_error_handler)
def risky_operation(data: str) -> str:
    """Performs a risky operation."""
    # Implementation
    pass

agent = Agent(
    name="Weather Assistant",
    tools=[fetch_weather, risky_operation]
)
```

#### 3. Agents as Tools
Orchestrate multiple specialized agents:

```python
spanish_agent = Agent(
    name="Spanish Translator",
    instructions="Translate to Spanish"
)

french_agent = Agent(
    name="French Translator",
    instructions="Translate to French"
)

orchestrator = Agent(
    name="Translation Orchestrator",
    instructions="Coordinate translations using available tools",
    tools=[
        spanish_agent.as_tool(
            tool_name="translate_spanish",
            tool_description="Translates to Spanish"
        ),
        french_agent.as_tool(
            tool_name="translate_french",
            tool_description="Translates to French"
        )
    ]
)
```

### Session Management

Maintain conversation history across multiple runs:

```python
from agents import SQLiteSession, OpenAIConversationsSession

# SQLite-based memory
session = SQLiteSession("user_123", "conversations.db")

# OpenAI-hosted memory
session = OpenAIConversationsSession()

# Use session
result = await Runner.run(agent, "Hello", session=session)
# Subsequent runs remember context
result = await Runner.run(agent, "What did I just say?", session=session)

# Session operations
items = await session.get_items()  # Get history
await session.pop_item()  # Remove last item
await session.clear_session()  # Clear all
```

### Custom Session Implementation

```python
from agents.memory.session import SessionABC

class CustomSession(SessionABC):
    async def get_items(self, limit: int | None = None):
        # Retrieve conversation history
        pass

    async def add_items(self, items):
        # Store new items
        pass

    async def pop_item(self):
        # Remove and return last item
        pass

    async def clear_session(self):
        # Clear all items
        pass
```

## Claude/Anthropic Implementation

### Core Technologies
- **Model Context Protocol (MCP)**: Standardized way to connect AI models to data sources
- **Claude Code SDK**: Production-ready agent framework
- **Multiple SDK Options**: Headless, TypeScript, Python

### MCP Architecture

MCP acts like a "USB-C port for AI" - providing standardized connections between:
- AI models (clients)
- Data sources and tools (servers)

### Claude Code SDK Setup

#### Authentication
```bash
# Basic Anthropic API
export ANTHROPIC_API_KEY=sk-...

# Amazon Bedrock
export CLAUDE_CODE_USE_BEDROCK=1
# Configure AWS credentials

# Google Vertex AI
export CLAUDE_CODE_USE_VERTEX=1
# Configure Google Cloud credentials
```

#### Core Concepts

1. **System Prompts**: Define agent role and behavior
2. **Tool Permissions**: Fine-grained control over capabilities
   - `allowedTools` - Explicitly allow tools
   - `disallowedTools` - Block specific tools
   - `permissionMode` - Overall permission strategy
3. **MCP Integration**: Extend with custom tools via MCP servers

### Building Agents with Claude Code SDK

#### TypeScript Implementation
```typescript
import { Agent } from '@anthropic/claude-code-sdk';

const agent = new Agent({
  name: "Assistant",
  systemPrompt: "You are a helpful coding assistant",
  tools: {
    allowedTools: ['file_operations', 'web_search'],
    disallowedTools: ['code_execution'],
    permissionMode: 'strict'
  }
});

// Run the agent
const result = await agent.run("Your prompt here");
```

#### Python Implementation
```python
from claude_code import Agent, Runner

agent = Agent(
    name="Assistant",
    system_prompt="You are a helpful assistant",
    tool_permissions={
        'allowed_tools': ['file_operations'],
        'disallowed_tools': ['code_execution']
    }
)

result = await Runner.run(agent, "Your prompt")
```

### MCP Server Integration

MCP allows you to create custom tools that can be used across different AI applications:

```python
# MCP server example (simplified)
class CustomMCPServer:
    def __init__(self):
        self.tools = {
            'database_query': self.database_query,
            'api_call': self.api_call
        }

    async def database_query(self, query: str):
        # Execute database query
        return results

    async def api_call(self, endpoint: str, params: dict):
        # Make API call
        return response

# Connect to agent
agent = Agent(
    name="Data Assistant",
    mcp_servers=[CustomMCPServer()]
)
```

## Key Patterns and Best Practices

### 1. Tool Design Patterns
- **Atomic Tools**: Single-purpose functions that do one thing well
- **Composite Tools**: Combine multiple atomic tools for complex operations
- **Error Handling**: Always implement graceful error handling in tools
- **Validation**: Use type hints and Pydantic models for input validation

### 2. Memory Management
- **Session-based**: Use for conversational agents
- **Stateless**: For single-turn operations
- **Hybrid**: Selective memory based on context

### 3. Agent Orchestration
- **Hierarchical**: Main orchestrator delegates to specialized agents
- **Peer-to-peer**: Agents communicate directly
- **Pipeline**: Sequential processing through multiple agents

### 4. Production Considerations

#### Performance
- Implement caching for expensive operations
- Use async/await for I/O operations
- Batch operations when possible
- Monitor rate limits

#### Security
- Validate all inputs
- Implement permission boundaries
- Audit tool usage
- Secure API keys and credentials

#### Reliability
- Implement retry logic with exponential backoff
- Handle timeouts gracefully
- Log all operations for debugging
- Implement circuit breakers for external services

### 5. Testing Strategies
```python
# Unit test individual tools
async def test_weather_tool():
    location = {"lat": 37.7749, "long": -122.4194}
    result = await fetch_weather(location)
    assert result in ["sunny", "cloudy", "rainy"]

# Integration test agent behavior
async def test_agent_integration():
    agent = Agent(name="Test Agent", tools=[fetch_weather])
    result = await Runner.run(agent, "What's the weather?")
    assert "weather" in result.final_output.lower()

# Mock external services
from unittest.mock import AsyncMock
async def test_with_mocked_api():
    mock_api = AsyncMock(return_value={"status": "success"})
    agent.tools = [mock_api]
    result = await Runner.run(agent, "Call the API")
```

## Common Use Cases

### 1. Code Review Agent
```python
agent = Agent(
    name="Code Reviewer",
    instructions="Review code for security, performance, and best practices",
    tools=[
        analyze_code_security,
        check_performance_metrics,
        validate_best_practices
    ]
)
```

### 2. SRE/DevOps Agent
```python
agent = Agent(
    name="SRE Assistant",
    instructions="Diagnose and fix production issues",
    tools=[
        fetch_logs,
        analyze_metrics,
        execute_remediation,
        create_incident_report
    ]
)
```

### 3. Data Analysis Agent
```python
agent = Agent(
    name="Data Analyst",
    instructions="Analyze data and generate insights",
    tools=[
        query_database,
        perform_statistical_analysis,
        generate_visualization,
        create_report
    ]
)
```

### 4. Customer Support Agent
```python
agent = Agent(
    name="Support Assistant",
    instructions="Help customers resolve technical issues",
    tools=[
        search_knowledge_base,
        check_account_status,
        create_support_ticket,
        escalate_to_human
    ]
)
```

## Framework Comparison

| Feature | OpenAI Agents SDK | Claude Code SDK |
|---------|------------------|-----------------|
| **Architecture** | Agent + Runner + Tools | Agent + MCP + Permissions |
| **Tool System** | Function decorators, hosted tools | MCP servers, permission-based |
| **Memory** | SQLite, OpenAI Conversations API | Session management, context windows |
| **Languages** | Python primary | TypeScript, Python, Headless |
| **Orchestration** | Agents as tools | MCP protocol |
| **Production Features** | Built-in error handling | Fine-grained permissions |
| **Extensibility** | Custom functions | MCP servers |
| **Hosting** | Self-hosted or OpenAI | Self-hosted or cloud providers |

## Migration Considerations

### From OpenAI to Claude
1. Convert function tools to MCP servers
2. Adapt session management to Claude's context handling
3. Update permission model from tool-based to permission-based
4. Migrate prompts and instructions

### From Claude to OpenAI
1. Convert MCP servers to function tools
2. Implement session management with SQLite or OpenAI Conversations
3. Adapt permission model to tool selection
4. Update system prompts to instructions

## Resources

### OpenAI
- [OpenAI Agents Python SDK](https://github.com/openai/openai-agents-python)
- [OpenAI Platform Documentation](https://platform.openai.com/docs)
- [Assistants API Guide](https://platform.openai.com/docs/assistants)

### Claude/Anthropic
- [Model Context Protocol](https://modelcontextprotocol.io)
- [Claude Code SDK Documentation](https://docs.anthropic.com/en/docs/claude-code)
- [MCP Specification](https://spec.modelcontextprotocol.io)
- [Anthropic Console](https://console.anthropic.com)

### Community Resources
- [MCP Servers Repository](https://github.com/modelcontextprotocol/servers)
- [Agent Examples and Templates](https://github.com/anthropics/agent-examples)
- [OpenAI Cookbook](https://cookbook.openai.com)