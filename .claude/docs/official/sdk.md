# Claude Code SDK

> Build custom AI agents with the Claude Code SDK

## Why use the Claude Code SDK?

The Claude Code SDK provides all the building blocks you need to build production-ready agents:

* **Optimized Claude integration**: Automatic prompt caching and
  performance optimizations
* **Rich tool ecosystem**: File operations, code execution, web search, and
  MCP extensibility
* **Advanced permissions**: Fine-grained control over agent capabilities
* **Production essentials**: Built-in error handling, session management, and
  monitoring

## What can you build with the SDK?

Here are some example agent types you can create:

**Coding agents:**

* SRE agents that diagnose and fix production issues
* Security review bots that audit code for vulnerabilities
* Oncall engineering assistants that triage incidents
* Code review agents that enforce style and best practices

**Business agents:**

* Legal assistants that review contracts and compliance
* Finance advisors that analyze reports and forecasts
* Customer support agents that resolve technical issues
* Content creation assistants for marketing teams

The SDK is currently available in TypeScript and Python, with a command line interface (CLI) for quick prototyping.

## Quick start

Get your first agent running in under 5 minutes:

<Steps>
  <Step title="Install the SDK">
    <Tabs>
      <Tab title="Command line">
        Install `@anthropic-ai/claude-code` from NPM:

        ```bash
        npm install -g @anthropic-ai/claude-code
        ```
      </Tab>

      <Tab title="TypeScript">
        Install `@anthropic-ai/claude-code` from NPM:

        ```bash
        npm install -g @anthropic-ai/claude-code
        ```
      </Tab>

      <Tab title="Python">
        Install `claude-code-sdk` from PyPI and `@anthropic-ai/claude-code` from NPM:

        ```bash
        pip install claude-code-sdk
        npm install -g @anthropic-ai/claude-code  # Required dependency
        ```

        (Optional) Install IPython for interactive development:

        ```bash
        pip install ipython
        ```
      </Tab>
    </Tabs>
  </Step>

  <Step title="Set your API key">
    Get your API key from the [Anthropic Console](https://console.anthropic.com/) and set the `ANTHROPIC_API_KEY` environment variable:

    ```bash
    export ANTHROPIC_API_KEY="your-api-key-here"
    ```
  </Step>

  <Step title="Create your first agent">
    Create one of these example agents:

    <Tabs>
      <Tab title="Command line">
        ```bash
        # Create a simple legal assistant
        claude -p "Review this contract clause for potential issues: 'The party agrees to unlimited liability...'" \
          --append-system-prompt "You are a legal assistant. Identify risks and suggest improvements."
        ```
      </Tab>

      <Tab title="TypeScript">
        ```ts
        // legal-agent.ts
        import { query } from "@anthropic-ai/claude-code";

        // Create a simple legal assistant
        for await (const message of query({
          prompt: "Review this contract clause for potential issues: 'The party agrees to unlimited liability...'",
          options: {
            systemPrompt: "You are a legal assistant. Identify risks and suggest improvements.",
            maxTurns: 2
          }
        })) {
          if (message.type === "result") {
            console.log(message.result);
          }
        }
        ```
      </Tab>

      <Tab title="Python">
        ```python
        # legal-agent.py
        import asyncio
        from claude_code_sdk import ClaudeSDKClient, ClaudeCodeOptions

        async def main():
            async with ClaudeSDKClient(
                options=ClaudeCodeOptions(
                    system_prompt="You are a legal assistant. Identify risks and suggest improvements.",
                    max_turns=2
                )
            ) as client:
                # Send the query
                await client.query(
                    "Review this contract clause for potential issues: 'The party agrees to unlimited liability...'"
                )
                
                # Stream the response
                async for message in client.receive_response():
                    if hasattr(message, 'content'):
                        # Print streaming content as it arrives
                        for block in message.content:
                            if hasattr(block, 'text'):
                                print(block.text, end='', flush=True)

        if __name__ == "__main__":
            asyncio.run(main())
        ```
      </Tab>
    </Tabs>
  </Step>

  <Step title="Run the agent">
    <Tabs>
      <Tab title="Command line">
        Copy and paste the command above directly into your terminal.
      </Tab>

      <Tab title="TypeScript">
        1. Set up project:

        ```bash
        npm init -y
        npm install @anthropic-ai/claude-code tsx
        ```

        2. Add `"type": "module"` to your package.json

        3. Save the code above as `legal-agent.ts`, then run:

        ```bash
        npx tsx legal-agent.ts
        ```
      </Tab>

      <Tab title="Python">
        Save the code above as `legal-agent.py`, then run:

        ```bash
        python legal-agent.py
        ```

        For [IPython](https://ipython.org/)/Jupyter notebooks, you can run the code directly in a cell:

        ```python
        await main()
        ```
      </Tab>
    </Tabs>
  </Step>
</Steps>

Each example above creates a working agent that will:

* Analyze the prompt using Claude's reasoning capabilities
* Plan a multi-step approach to solve the problem
* Execute actions using tools like file operations, bash commands, and web search
* Provide actionable recommendations based on the analysis

## Core usage

### Overview

The Claude Code SDK allows you to interface with Claude Code in non-interactive mode from your applications.

<Tabs>
  <Tab title="Command line">
    **Prerequisites**

    * Node.js 18+
    * `@anthropic-ai/claude-code` from NPM

    **Basic usage**

    The primary command-line interface to Claude Code is the `claude` command. Use the `--print` (or `-p`) flag to run in non-interactive mode and print the final result:

    ```bash
    claude -p "Analyze system performance" \
      --append-system-prompt "You are a performance engineer" \
      --allowedTools "Bash,Read,WebSearch" \
      --permission-mode acceptEdits \
      --cwd /path/to/project
    ```

    **Configuration**

    The SDK leverages all the CLI options available in Claude Code. Here are the key ones for SDK usage:

    | Flag                       | Description                                                                                            | Example                                                                                                                   |
    | :------------------------- | :----------------------------------------------------------------------------------------------------- | :------------------------------------------------------------------------------------------------------------------------ |
    | `--print`, `-p`            | Run in non-interactive mode                                                                            | `claude -p "query"`                                                                                                       |
    | `--output-format`          | Specify output format (`text`, `json`, `stream-json`)                                                  | `claude -p --output-format json`                                                                                          |
    | `--resume`, `-r`           | Resume a conversation by session ID                                                                    | `claude --resume abc123`                                                                                                  |
    | `--continue`, `-c`         | Continue the most recent conversation                                                                  | `claude --continue`                                                                                                       |
    | `--verbose`                | Enable verbose logging                                                                                 | `claude --verbose`                                                                                                        |
    | `--append-system-prompt`   | Append to system prompt (only with `--print`)                                                          | `claude --append-system-prompt "Custom instruction"`                                                                      |
    | `--allowedTools`           | Space-separated list of allowed tools, or <br /><br /> string of comma-separated list of allowed tools | `claude --allowedTools mcp__slack mcp__filesystem`<br /><br />`claude --allowedTools "Bash(npm install),mcp__filesystem"` |
    | `--disallowedTools`        | Space-separated list of denied tools, or <br /><br /> string of comma-separated list of denied tools   | `claude --disallowedTools mcp__splunk mcp__github`<br /><br />`claude --disallowedTools "Bash(git commit),mcp__github"`   |
    | `--mcp-config`             | Load MCP servers from a JSON file                                                                      | `claude --mcp-config servers.json`                                                                                        |
    | `--permission-prompt-tool` | MCP tool for handling permission prompts (only with `--print`)                                         | `claude --permission-prompt-tool mcp__auth__prompt`                                                                       |

    For a complete list of CLI options and features, see the [CLI reference](/en/docs/claude-code/cli-reference) documentation.
  </Tab>

  <Tab title="TypeScript">
    **Prerequisites**

    * Node.js 18+
    * `@anthropic-ai/claude-code` from NPM

    <Note>
      To view the TypeScript SDK source code, visit the [`@anthropic-ai/claude-code` page on NPM](https://www.npmjs.com/package/@anthropic-ai/claude-code?activeTab=code).
    </Note>

    **Basic usage**

    The primary interface via the TypeScript SDK is the `query` function, which returns an async iterator that streams messages as they arrive:

    ```ts
    import { query } from "@anthropic-ai/claude-code";

    for await (const message of query({
      prompt: "Analyze system performance",
      abortController: new AbortController(),
      options: {
        maxTurns: 5,
        systemPrompt: "You are a performance engineer",
        allowedTools: ["Bash", "Read", "WebSearch"]
      }
    })) {
      if (message.type === "result") {
        console.log(message.result);
      }
    }
    ```

    **Configuration**

    The TypeScript SDK accepts all arguments supported by the [command line](/en/docs/claude-code/cli-reference), as well as the following additional options:

    | Argument                     | Description                         | Default                                                                              |
    | :--------------------------- | :---------------------------------- | :----------------------------------------------------------------------------------- |
    | `abortController`            | Abort controller                    | `new AbortController()`                                                              |
    | `cwd`                        | Current working directory           | `process.cwd()`                                                                      |
    | `executable`                 | Which JavaScript runtime to use     | `node` when running with Node.js, `bun` when running with Bun                        |
    | `executableArgs`             | Arguments to pass to the executable | `[]`                                                                                 |
    | `pathToClaudeCodeExecutable` | Path to the Claude Code executable  | Executable that ships with `@anthropic-ai/claude-code`                               |
    | `permissionMode`             | Permission mode for the session     | `"default"` (options: `"default"`, `"acceptEdits"`, `"plan"`, `"bypassPermissions"`) |
  </Tab>

  <Tab title="Python">
    **Prerequisites**

    * Python 3.10+
    * `claude-code-sdk` from PyPI
    * Node.js 18+
    * `@anthropic-ai/claude-code` from NPM

    <Note>
      To view the Python SDK source code, see the [`claude-code-sdk`](https://github.com/anthropics/claude-code-sdk-python) repo.
    </Note>

    <Tip>
      For interactive development, use [IPython](https://ipython.org/): `pip install ipython`
    </Tip>

    **Basic usage**

    The Python SDK provides two primary interfaces:

    1. The `ClaudeSDKClient` class (Recommended)

    Best for streaming responses, multi-turn conversations, and interactive applications:

    ```python
    import asyncio
    from claude_code_sdk import ClaudeSDKClient, ClaudeCodeOptions

    async def main():
        async with ClaudeSDKClient(
            options=ClaudeCodeOptions(
                system_prompt="You are a performance engineer",
                allowed_tools=["Bash", "Read", "WebSearch"],
                max_turns=5
            )
        ) as client:
            await client.query("Analyze system performance")
            
            # Stream responses
            async for message in client.receive_response():
                if hasattr(message, 'content'):
                    for block in message.content:
                        if hasattr(block, 'text'):
                            print(block.text, end='', flush=True)

    # Run as script
    asyncio.run(main())

    # Or in IPython/Jupyter: await main()
    ```

    The SDK also supports passing structured messages and image inputs:

    ```python
    from claude_code_sdk import ClaudeSDKClient, ClaudeCodeOptions

    async with ClaudeSDKClient() as client:
        # Text message
        await client.query("Analyze this code for security issues")
        
        # Message with image reference (image will be read by Claude's Read tool)
        await client.query("Explain what's shown in screenshot.png")
        
        # Multiple messages in sequence
        messages = [
            "First, analyze the architecture diagram in diagram.png",
            "Now suggest improvements based on the diagram",
            "Finally, generate implementation code"
        ]
        
        for msg in messages:
            await client.query(msg)
            async for response in client.receive_response():
                # Process each response
                pass

    # The SDK handles image files through Claude's built-in Read tool
    # Supported formats: PNG, JPG, PDF, and other common formats
    ```

    <Note>
      The Python examples on this page use `asyncio`, but you can also use `anyio`.
    </Note>

    2. The `query` function

    For simple, one-shot queries:

    ```python
    from claude_code_sdk import query, ClaudeCodeOptions

    async for message in query(
        prompt="Analyze system performance",
        options=ClaudeCodeOptions(system_prompt="You are a performance engineer")
    ):
        if type(message).__name__ == "ResultMessage":
            print(message.result)
    ```

    **Configuration**

    As the Python SDK accepts all arguments supported by the [command line](/en/docs/claude-code/cli-reference) through the `ClaudeCodeOptions` class.
  </Tab>
</Tabs>

### Authentication

#### Anthropic API key

For basic authentication, retrieve an Anthropic API key from the [Anthropic Console](https://console.anthropic.com/) and set the `ANTHROPIC_API_KEY` environment variable, as demonstrated in the [Quick start](#quick-start).

#### Third-party API credentials

The SDK also supports authentication via third-party API providers:

* **Amazon Bedrock**: Set `CLAUDE_CODE_USE_BEDROCK=1` environment variable and configure AWS credentials
* **Google Vertex AI**: Set `CLAUDE_CODE_USE_VERTEX=1` environment variable and configure Google Cloud credentials

For detailed configuration instructions for third-party providers, see the [Amazon Bedrock](/en/docs/claude-code/amazon-bedrock) and [Google Vertex AI](/en/docs/claude-code/google-vertex-ai) documentation.

### Multi-turn conversations

For multi-turn conversations, you can resume conversations or continue from the most recent session:

<Tabs>
  <Tab title="Command line">
    ```bash
    # Continue the most recent conversation
    claude --continue "Now refactor this for better performance"

    # Resume a specific conversation by session ID
    claude --resume 550e8400-e29b-41d4-a716-446655440000 "Update the tests"

    # Resume in non-interactive mode
    claude --resume 550e8400-e29b-41d4-a716-446655440000 "Fix all linting issues" --no-interactive
    ```
  </Tab>

  <Tab title="TypeScript">
    ```ts
    import { query } from "@anthropic-ai/claude-code";

    // Continue most recent conversation
    for await (const message of query({
      prompt: "Now refactor this for better performance",
      options: { continueSession: true }
    })) {
      if (message.type === "result") console.log(message.result);
    }

    // Resume specific session
    for await (const message of query({
      prompt: "Update the tests",
      options: { 
        resumeSessionId: "550e8400-e29b-41d4-a716-446655440000",
        maxTurns: 3
      }
    })) {
      if (message.type === "result") console.log(message.result);
    }
    ```
  </Tab>

  <Tab title="Python">
    ```python
    import asyncio
    from claude_code_sdk import ClaudeSDKClient, ClaudeCodeOptions, query

    # Method 1: Using ClaudeSDKClient for persistent conversations
    async def multi_turn_conversation():
        async with ClaudeSDKClient() as client:
            # First query
            await client.query("Let's refactor the payment module")
            async for msg in client.receive_response():
                # Process first response
                pass
            
            # Continue in same session
            await client.query("Now add comprehensive error handling")
            async for msg in client.receive_response():
                # Process continuation
                pass
            
            # The conversation context is maintained throughout

    # Method 2: Using query function with session management
    async def resume_session():
        # Continue most recent conversation
        async for message in query(
            prompt="Now refactor this for better performance",
            options=ClaudeCodeOptions(continue_conversation=True)
        ):
            if type(message).__name__ == "ResultMessage":
                print(message.result)

        # Resume specific session
        async for message in query(
            prompt="Update the tests", 
            options=ClaudeCodeOptions(
                resume="550e8400-e29b-41d4-a716-446655440000",
                max_turns=3
            )
        ):
            if type(message).__name__ == "ResultMessage":
                print(message.result)

    # Run the examples
    asyncio.run(multi_turn_conversation())
    ```
  </Tab>
</Tabs>

### Using Plan Mode

Plan Mode allows Claude to analyze code without making modifications, useful for code reviews and planning changes.

<Tabs>
  <Tab title="Command line">
    ```bash
    claude -p "Review this code" --permission-mode plan
    ```
  </Tab>

  <Tab title="TypeScript">
    ```ts
    import { query } from "@anthropic-ai/claude-code";

    for await (const message of query({
      prompt: "Your prompt here",
      options: {
        permissionMode: 'plan'
      }
    })) {
      if (message.type === "result") {
        console.log(message.result);
      }
    }
    ```
  </Tab>

  <Tab title="Python">
    ```python
    from claude_code_sdk import ClaudeSDKClient, ClaudeCodeOptions

    async with ClaudeSDKClient(
        options=ClaudeCodeOptions(permission_mode='plan')
    ) as client:
        await client.query("Your prompt here")
    ```
  </Tab>
</Tabs>

<Note>
  Plan Mode restricts editing, file creation, and command execution. See [permission modes](/en/docs/claude-code/iam#permission-modes) for details.
</Note>

### Custom system prompts

System prompts define your agent's role, expertise, and behavior. This is where you specify what kind of agent you're building:

<Tabs>
  <Tab title="Command line">
    ```bash
    # SRE incident response agent
    claude -p "API is down, investigate" \
      --append-system-prompt "You are an SRE expert. Diagnose issues systematically and provide actionable solutions."

    # Legal document review agent  
    claude -p "Review this contract" \
      --append-system-prompt "You are a corporate lawyer. Identify risks, suggest improvements, and ensure compliance."

    # Append to default system prompt
    claude -p "Refactor this function" \
      --append-system-prompt "Always include comprehensive error handling and unit tests."
    ```
  </Tab>

  <Tab title="TypeScript">
    ```ts
    import { query } from "@anthropic-ai/claude-code";

    // SRE incident response agent
    for await (const message of query({
      prompt: "API is down, investigate",
      options: {
        systemPrompt: "You are an SRE expert. Diagnose issues systematically and provide actionable solutions.",
        maxTurns: 3
      }
    })) {
      if (message.type === "result") console.log(message.result);
    }

    // Append to default system prompt
    for await (const message of query({
      prompt: "Refactor this function",
      options: {
        appendSystemPrompt: "Always include comprehensive error handling and unit tests.",
        maxTurns: 2
      }
    })) {
      if (message.type === "result") console.log(message.result);
    }
    ```
  </Tab>

  <Tab title="Python">
    ```python
    import asyncio
    from claude_code_sdk import ClaudeSDKClient, ClaudeCodeOptions

    async def specialized_agents():
        # SRE incident response agent with streaming
        async with ClaudeSDKClient(
            options=ClaudeCodeOptions(
                system_prompt="You are an SRE expert. Diagnose issues systematically and provide actionable solutions.",
                max_turns=3
            )
        ) as sre_agent:
            await sre_agent.query("API is down, investigate")
            
            # Stream the diagnostic process
            async for message in sre_agent.receive_response():
                if hasattr(message, 'content'):
                    for block in message.content:
                        if hasattr(block, 'text'):
                            print(block.text, end='', flush=True)
        
        # Legal review agent with custom prompt
        async with ClaudeSDKClient(
            options=ClaudeCodeOptions(
                append_system_prompt="Always include comprehensive error handling and unit tests.",
                max_turns=2
            )
        ) as dev_agent:
            await dev_agent.query("Refactor this function")
            
            # Collect full response
            full_response = []
            async for message in dev_agent.receive_response():
                if type(message).__name__ == "ResultMessage":
                    print(message.result)

    asyncio.run(specialized_agents())
    ```
  </Tab>
</Tabs>

## Advanced Usage

### Custom tools via MCP

The Model Context Protocol (MCP) lets you give your agents custom tools and capabilities. This is crucial for building specialized agents that need domain-specific integrations.

**Example agent tool configurations:**

```json
{
  "mcpServers": {
    "slack": {
      "command": "npx",
      "args": ["-y", "@modelcontextprotocol/server-slack"],
      "env": {"SLACK_TOKEN": "your-slack-token"}
    },
    "jira": {
      "command": "npx", 
      "args": ["-y", "@modelcontextprotocol/server-jira"],
      "env": {"JIRA_TOKEN": "your-jira-token"}
    },
    "database": {
      "command": "npx",
      "args": ["-y", "@modelcontextprotocol/server-postgres"],
      "env": {"DB_CONNECTION_STRING": "your-db-url"}
    }
  }
}
```

**Usage examples:**

<Tabs>
  <Tab title="Command line">
    ```bash
    # SRE agent with monitoring tools
    claude -p "Investigate the payment service outage" \
      --mcp-config sre-tools.json \
      --allowedTools "mcp__datadog,mcp__pagerduty,mcp__kubernetes" \
      --append-system-prompt "You are an SRE. Use monitoring data to diagnose issues."

    # Customer support agent with CRM access
    claude -p "Help resolve customer ticket #12345" \
      --mcp-config support-tools.json \
      --allowedTools "mcp__zendesk,mcp__stripe,mcp__user_db" \
      --append-system-prompt "You are a technical support specialist."
    ```
  </Tab>

  <Tab title="TypeScript">
    ```ts
    import { query } from "@anthropic-ai/claude-code";

    // SRE agent with monitoring tools
    for await (const message of query({
      prompt: "Investigate the payment service outage",
      options: {
        mcpConfig: "sre-tools.json",
        allowedTools: ["mcp__datadog", "mcp__pagerduty", "mcp__kubernetes"],
        systemPrompt: "You are an SRE. Use monitoring data to diagnose issues.",
        maxTurns: 4
      }
    })) {
      if (message.type === "result") console.log(message.result);
    }
    ```
  </Tab>

  <Tab title="Python">
    ```python
    import asyncio
    from claude_code_sdk import ClaudeSDKClient, ClaudeCodeOptions

    async def mcp_enabled_agent():
        # Legal agent with document access and streaming
        # Note: Configure your MCP servers as needed
        mcp_servers = {
            # Example configuration - uncomment and configure as needed:
            # "docusign": {
            #     "command": "npx",
            #     "args": ["-y", "@modelcontextprotocol/server-docusign"],
            #     "env": {"API_KEY": "your-key"}
            # }
        }
        
        async with ClaudeSDKClient(
            options=ClaudeCodeOptions(
                mcp_servers=mcp_servers,
                allowed_tools=["mcp__docusign", "mcp__compliance_db"],
                system_prompt="You are a corporate lawyer specializing in contract review.",
                max_turns=4
            )
        ) as client:
            await client.query("Review this contract for compliance risks")
            
            # Monitor tool usage and responses
            async for message in client.receive_response():
                if hasattr(message, 'content'):
                    for block in message.content:
                        if hasattr(block, 'type'):
                            if block.type == 'tool_use':
                                print(f"\n[Using tool: {block.name}]\n")
                            elif hasattr(block, 'text'):
                                print(block.text, end='', flush=True)
                        elif hasattr(block, 'text'):
                            print(block.text, end='', flush=True)
                
                if type(message).__name__ == "ResultMessage":
                    print(f"\n\nReview complete. Total cost: ${message.total_cost_usd:.4f}")

    asyncio.run(mcp_enabled_agent())
    ```
  </Tab>
</Tabs>

<Note>
  When using MCP tools, you must explicitly allow them using the `--allowedTools` flag. MCP tool names follow the pattern `mcp__<serverName>__<toolName>` where:

  * `serverName` is the key from your MCP configuration file
  * `toolName` is the specific tool provided by that server

  This security measure ensures that MCP tools are only used when explicitly permitted.

  If you specify just the server name (i.e., `mcp__<serverName>`), all tools from that server will be allowed.

  Glob patterns (e.g., `mcp__go*`) are not supported.
</Note>

### Custom permission prompt tool

Optionally, use `--permission-prompt-tool` to pass in an MCP tool that we will use to check whether or not the user grants the model permissions to invoke a given tool. When the model invokes a tool the following happens:

1. We first check permission settings: all [settings.json files](/en/docs/claude-code/settings), as well as `--allowedTools` and `--disallowedTools` passed into the SDK; if one of these allows or denies the tool call, we proceed with the tool call
2. Otherwise, we invoke the MCP tool you provided in `--permission-prompt-tool`

The `--permission-prompt-tool` MCP tool is passed the tool name and input, and must return a JSON-stringified payload with the result. The payload must be one of:

```ts
// tool call is allowed
{
  "behavior": "allow",
  "updatedInput": {...}, // updated input, or just return back the original input
}

// tool call is denied
{
  "behavior": "deny",
  "message": "..." // human-readable string explaining why the permission was denied
}
```

**Implementation examples:**

<Tabs>
  <Tab title="Command line">
    ```bash
    # Use with your MCP server configuration
    claude -p "Analyze and fix the security issues" \
      --permission-prompt-tool mcp__security__approval_prompt \
      --mcp-config security-tools.json \
      --allowedTools "Read,Grep" \
      --disallowedTools "Bash(rm*),Write"

    # With custom permission rules
    claude -p "Refactor the codebase" \
      --permission-prompt-tool mcp__custom__permission_check \
      --mcp-config custom-config.json \
      --output-format json
    ```
  </Tab>

  <Tab title="TypeScript">
    ```ts
    const server = new McpServer({
      name: "Test permission prompt MCP Server",
      version: "0.0.1",
    });

    server.tool(
      "approval_prompt",
      'Simulate a permission check - approve if the input contains "allow", otherwise deny',
      {
        tool_name: z.string().describe("The name of the tool requesting permission"),
        input: z.object({}).passthrough().describe("The input for the tool"),
        tool_use_id: z.string().optional().describe("The unique tool use request ID"),
      },
      async ({ tool_name, input }) => {
        return {
          content: [
            {
              type: "text",
              text: JSON.stringify(
                JSON.stringify(input).includes("allow")
                  ? {
                      behavior: "allow",
                      updatedInput: input,
                    }
                  : {
                      behavior: "deny",
                      message: "Permission denied by test approval_prompt tool",
                    }
              ),
            },
          ],
        };
      }
    );

    // Use in SDK
    import { query } from "@anthropic-ai/claude-code";

    for await (const message of query({
      prompt: "Analyze the codebase",
      options: {
        permissionPromptTool: "mcp__test-server__approval_prompt",
        mcpConfig: "my-config.json",
        allowedTools: ["Read", "Grep"]
      }
    })) {
      if (message.type === "result") console.log(message.result);
    }
    ```
  </Tab>

  <Tab title="Python">
    ```python
    import asyncio
    from claude_code_sdk import ClaudeSDKClient, ClaudeCodeOptions

    async def use_permission_prompt():
        """Example using custom permission prompt tool"""
        
        # MCP server configuration
        mcp_servers = {
            # Example configuration - uncomment and configure as needed:
            # "security": {
            #     "command": "npx",
            #     "args": ["-y", "@modelcontextprotocol/server-security"],
            #     "env": {"API_KEY": "your-key"}
            # }
        }
        
        async with ClaudeSDKClient(
            options=ClaudeCodeOptions(
                permission_prompt_tool_name="mcp__security__approval_prompt",  # Changed from permission_prompt_tool
                mcp_servers=mcp_servers,
                allowed_tools=["Read", "Grep"],
                disallowed_tools=["Bash(rm*)", "Write"],
                system_prompt="You are a security auditor"
            )
        ) as client:
            await client.query("Analyze and fix the security issues")
            
            # Monitor tool usage and permissions
            async for message in client.receive_response():
                if hasattr(message, 'content'):
                    for block in message.content:
                        if hasattr(block, 'type'):  # Added check for 'type' attribute
                            if block.type == 'tool_use':
                                print(f"[Tool: {block.name}] ", end='')
                        if hasattr(block, 'text'):
                            print(block.text, end='', flush=True)
                
                # Check for permission denials in error messages
                if type(message).__name__ == "ErrorMessage":
                    if hasattr(message, 'error') and "Permission denied" in str(message.error):
                        print(f"\n⚠️ Permission denied: {message.error}")

    # Example MCP server implementation (Python)
    # This would be in your MCP server code
    async def approval_prompt(tool_name: str, input: dict, tool_use_id: str = None):
        """Custom permission prompt handler"""
        # Your custom logic here
        if "allow" in str(input):
            return json.dumps({
                "behavior": "allow",
                "updatedInput": input
            })
        else:
            return json.dumps({
                "behavior": "deny",
                "message": f"Permission denied for {tool_name}"
            })

    asyncio.run(use_permission_prompt())
    ```
  </Tab>
</Tabs>

Usage notes:

* Use `updatedInput` to tell the model that the permission prompt mutated its input; otherwise, set `updatedInput` to the original input, as in the example above. For example, if the tool shows a file edit diff to the user and lets them edit the diff manually, the permission prompt tool should return that updated edit.
* The payload must be JSON-stringified

## Output formats

The SDK supports multiple output formats:

### Text output (default)

<Tabs>
  <Tab title="Command line">
    ```bash
    claude -p "Explain file src/components/Header.tsx"
    # Output: This is a React component showing...
    ```
  </Tab>

  <Tab title="TypeScript">
    ```ts
    // Default text output
    for await (const message of query({
      prompt: "Explain file src/components/Header.tsx"
    })) {
      if (message.type === "result") {
        console.log(message.result);
        // Output: This is a React component showing...
      }
    }
    ```
  </Tab>

  <Tab title="Python">
    ```python
    # Default text output with streaming
    async with ClaudeSDKClient() as client:
        await client.query("Explain file src/components/Header.tsx")
        
        # Stream text as it arrives
        async for message in client.receive_response():
            if hasattr(message, 'content'):
                for block in message.content:
                    if hasattr(block, 'text'):
                        print(block.text, end='', flush=True)
                        # Output streams in real-time: This is a React component showing...
    ```
  </Tab>
</Tabs>

### JSON output

Returns structured data including metadata:

<Tabs>
  <Tab title="Command line">
    ```bash
    claude -p "How does the data layer work?" --output-format json
    ```
  </Tab>

  <Tab title="TypeScript">
    ```ts
    // Collect all messages for JSON-like access
    const messages = [];
    for await (const message of query({
      prompt: "How does the data layer work?"
    })) {
      messages.push(message);
    }

    // Access result message with metadata
    const result = messages.find(m => m.type === "result");
    console.log({
      result: result.result,
      cost: result.total_cost_usd,
      duration: result.duration_ms
    });
    ```
  </Tab>

  <Tab title="Python">
    ```python
    # Collect all messages with metadata
    async with ClaudeSDKClient() as client:
        await client.query("How does the data layer work?")
        
        messages = []
        result_data = None
        
        async for message in client.receive_messages():
            messages.append(message)
            
            # Capture result message with metadata
            if type(message).__name__ == "ResultMessage":
                result_data = {
                    "result": message.result,
                    "cost": message.total_cost_usd,
                    "duration": message.duration_ms,
                    "num_turns": message.num_turns,
                    "session_id": message.session_id
                }
                break
        
        print(result_data)
    ```
  </Tab>
</Tabs>

Response format:

```json
{
  "type": "result",
  "subtype": "success",
  "total_cost_usd": 0.003,
  "is_error": false,
  "duration_ms": 1234,
  "duration_api_ms": 800,
  "num_turns": 6,
  "result": "The response text here...",
  "session_id": "abc123"
}
```

### Streaming JSON output

Streams each message as it is received:

```bash
$ claude -p "Build an application" --output-format stream-json
```

Each conversation begins with an initial `init` system message, followed by a list of user and assistant messages, followed by a final `result` system message with stats. Each message is emitted as a separate JSON object.

## Message schema

Messages returned from the JSON API are strictly typed according to the following schema:

```ts
type SDKMessage =
  // An assistant message
  | {
      type: "assistant";
      message: Message; // from Anthropic SDK
      session_id: string;
    }

  // A user message
  | {
      type: "user";
      message: MessageParam; // from Anthropic SDK
      session_id: string;
    }

  // Emitted as the last message
  | {
      type: "result";
      subtype: "success";
      duration_ms: float;
      duration_api_ms: float;
      is_error: boolean;
      num_turns: int;
      result: string;
      session_id: string;
      total_cost_usd: float;
    }

  // Emitted as the last message, when we've reached the maximum number of turns
  | {
      type: "result";
      subtype: "error_max_turns" | "error_during_execution";
      duration_ms: float;
      duration_api_ms: float;
      is_error: boolean;
      num_turns: int;
      session_id: string;
      total_cost_usd: float;
    }

  // Emitted as the first message at the start of a conversation
  | {
      type: "system";
      subtype: "init";
      apiKeySource: string;
      cwd: string;
      session_id: string;
      tools: string[];
      mcp_servers: {
        name: string;
        status: string;
      }[];
      model: string;
      permissionMode: "default" | "acceptEdits" | "bypassPermissions" | "plan";
    };
```

We will soon publish these types in a JSONSchema-compatible format. We use semantic versioning for the main Claude Code package to communicate breaking changes to this format.

`Message` and `MessageParam` types are available in Anthropic SDKs. For example, see the Anthropic [TypeScript](https://github.com/anthropics/anthropic-sdk-typescript) and [Python](https://github.com/anthropics/anthropic-sdk-python/) SDKs.

## Input formats

The SDK supports multiple input formats:

### Text input (default)

<Tabs>
  <Tab title="Command line">
    ```bash
    # Direct argument
    claude -p "Explain this code"

    # From stdin
    echo "Explain this code" | claude -p
    ```
  </Tab>

  <Tab title="TypeScript">
    ```ts
    // Direct prompt
    for await (const message of query({
      prompt: "Explain this code"
    })) {
      if (message.type === "result") console.log(message.result);
    }

    // From variable
    const userInput = "Explain this code";
    for await (const message of query({ prompt: userInput })) {
      if (message.type === "result") console.log(message.result);
    }
    ```
  </Tab>

  <Tab title="Python">
    ```python
    import asyncio
    from claude_code_sdk import ClaudeSDKClient

    async def process_inputs():
        async with ClaudeSDKClient() as client:
            # Text input
            await client.query("Explain this code")
            async for message in client.receive_response():
                # Process streaming response
                pass
            
            # Image input (Claude will use Read tool automatically)
            await client.query("What's in this diagram? screenshot.png")
            async for message in client.receive_response():
                # Process image analysis
                pass
            
            # Multiple inputs with mixed content
            inputs = [
                "Analyze the architecture in diagram.png",
                "Compare it with best practices",
                "Generate improved version"
            ]
            
            for prompt in inputs:
                await client.query(prompt)
                async for message in client.receive_response():
                    # Process each response
                    pass

    asyncio.run(process_inputs())
    ```
  </Tab>
</Tabs>

### Streaming JSON input

A stream of messages provided via `stdin` where each message represents a user turn. This allows multiple turns of a conversation without re-launching the `claude` binary and allows providing guidance to the model while it is processing a request.

Each message is a JSON 'User message' object, following the same format as the output message schema. Messages are formatted using the [jsonl](https://jsonlines.org/) format where each line of input is a complete JSON object. Streaming JSON input requires `-p` and `--output-format stream-json`.

Currently this is limited to text-only user messages.

```bash
$ echo '{"type":"user","message":{"role":"user","content":[{"type":"text","text":"Explain this code"}]}}' | claude -p --output-format=stream-json --input-format=stream-json --verbose
```

## Agent integration examples

### SRE incident response bot

<Tabs>
  <Tab title="Command line">
    ```bash
    #!/bin/bash

    # Automated incident response agent
    investigate_incident() {
        local incident_description="$1"
        local severity="${2:-medium}"
        
        claude -p "Incident: $incident_description (Severity: $severity)" \
          --append-system-prompt "You are an SRE expert. Diagnose the issue, assess impact, and provide immediate action items." \
          --output-format json \
          --allowedTools "Bash,Read,WebSearch,mcp__datadog" \
          --mcp-config monitoring-tools.json
    }

    # Usage
    investigate_incident "Payment API returning 500 errors" "high"
    ```
  </Tab>

  <Tab title="TypeScript">
    ```ts
    import { query } from "@anthropic-ai/claude-code";

    // Automated incident response agent
    async function investigateIncident(
      incidentDescription: string, 
      severity = "medium"
    ) {
      const messages = [];
      
      for await (const message of query({
        prompt: `Incident: ${incidentDescription} (Severity: ${severity})`,
        options: {
          systemPrompt: "You are an SRE expert. Diagnose the issue, assess impact, and provide immediate action items.",
          maxTurns: 6,
          allowedTools: ["Bash", "Read", "WebSearch", "mcp__datadog"],
          mcpConfig: "monitoring-tools.json"
        }
      })) {
        messages.push(message);
      }
      
      return messages.find(m => m.type === "result");
    }

    // Usage
    const result = await investigateIncident("Payment API returning 500 errors", "high");
    console.log(result.result);
    ```
  </Tab>

  <Tab title="Python">
    ```python
    import asyncio
    from claude_code_sdk import ClaudeSDKClient, ClaudeCodeOptions

    async def investigate_incident(incident_description: str, severity: str = "medium"):
        """Automated incident response agent with real-time streaming"""
        
        # MCP server configuration for monitoring tools
        mcp_servers = {
            # Example configuration - uncomment and configure as needed:
            # "datadog": {
            #     "command": "npx",
            #     "args": ["-y", "@modelcontextprotocol/server-datadog"],
            #     "env": {"API_KEY": "your-datadog-key", "APP_KEY": "your-app-key"}
            # }
        }
        
        async with ClaudeSDKClient(
            options=ClaudeCodeOptions(
                system_prompt="You are an SRE expert. Diagnose the issue, assess impact, and provide immediate action items.",
                max_turns=6,
                allowed_tools=["Bash", "Read", "WebSearch", "mcp__datadog"],
                mcp_servers=mcp_servers
            )
        ) as client:
            # Send the incident details
            prompt = f"Incident: {incident_description} (Severity: {severity})"
            print(f"🚨 Investigating: {prompt}\n")
            await client.query(prompt)
            
            # Stream the investigation process
            investigation_log = []
            async for message in client.receive_response():
                if hasattr(message, 'content'):
                    for block in message.content:
                        if hasattr(block, 'type'):
                            if block.type == 'tool_use':
                                print(f"[{block.name}] ", end='')
                        if hasattr(block, 'text'):
                            text = block.text
                            print(text, end='', flush=True)
                            investigation_log.append(text)
                
                # Capture final result
                if type(message).__name__ == "ResultMessage":
                    return {
                        'analysis': ''.join(investigation_log),
                        'cost': message.total_cost_usd,
                        'duration_ms': message.duration_ms
                    }

    # Usage
    result = await investigate_incident("Payment API returning 500 errors", "high")
    print(f"\n\nInvestigation complete. Cost: ${result['cost']:.4f}")
    ```
  </Tab>
</Tabs>

### Automated security review

<Tabs>
  <Tab title="Command line">
    ```bash
    # Security audit agent for pull requests
    audit_pr() {
        local pr_number="$1"
        
        gh pr diff "$pr_number" | claude -p \
          --append-system-prompt "You are a security engineer. Review this PR for vulnerabilities, insecure patterns, and compliance issues." \
          --output-format json \
          --allowedTools "Read,Grep,WebSearch"
    }

    # Usage and save to file
    audit_pr 123 > security-report.json
    ```
  </Tab>

  <Tab title="TypeScript">
    ```ts
    import { query } from "@anthropic-ai/claude-code";
    import { execSync } from "child_process";

    async function auditPR(prNumber: number) {
      // Get PR diff
      const prDiff = execSync(`gh pr diff ${prNumber}`, { encoding: 'utf8' });
      
      const messages = [];
      for await (const message of query({
        prompt: prDiff,
        options: {
          systemPrompt: "You are a security engineer. Review this PR for vulnerabilities, insecure patterns, and compliance issues.",
          maxTurns: 3,
          allowedTools: ["Read", "Grep", "WebSearch"]
        }
      })) {
        messages.push(message);
      }
      
      return messages.find(m => m.type === "result");
    }

    // Usage
    const report = await auditPR(123);
    console.log(JSON.stringify(report, null, 2));
    ```
  </Tab>

  <Tab title="Python">
    ```python
    import subprocess
    import asyncio
    import json
    from claude_code_sdk import ClaudeSDKClient, ClaudeCodeOptions

    async def audit_pr(pr_number: int):
        """Security audit agent for pull requests with streaming feedback"""
        # Get PR diff
        pr_diff = subprocess.check_output(
            ["gh", "pr", "diff", str(pr_number)], 
            text=True
        )
        
        async with ClaudeSDKClient(
            options=ClaudeCodeOptions(
                system_prompt="You are a security engineer. Review this PR for vulnerabilities, insecure patterns, and compliance issues.",
                max_turns=3,
                allowed_tools=["Read", "Grep", "WebSearch"]
            )
        ) as client:
            print(f"🔍 Auditing PR #{pr_number}\n")
            await client.query(pr_diff)
            
            findings = []
            async for message in client.receive_response():
                if hasattr(message, 'content'):
                    for block in message.content:
                        if hasattr(block, 'text'):
                            # Stream findings as they're discovered
                            print(block.text, end='', flush=True)
                            findings.append(block.text)
                
                if type(message).__name__ == "ResultMessage":
                    return {
                        'pr_number': pr_number,
                        'findings': ''.join(findings),
                        'metadata': {
                            'cost': message.total_cost_usd,
                            'duration': message.duration_ms,
                            'severity': 'high' if 'vulnerability' in ''.join(findings).lower() else 'medium'
                        }
                    }

    # Usage
    report = await audit_pr(123)
    print(f"\n\nAudit complete. Severity: {report['metadata']['severity']}")
    print(json.dumps(report, indent=2))
    ```
  </Tab>
</Tabs>

### Multi-turn legal assistant

<Tabs>
  <Tab title="Command line">
    ```bash
    # Legal document review with session persistence
    session_id=$(claude -p "Start legal review session" --output-format json | jq -r '.session_id')

    # Review contract in multiple steps
    claude -p --resume "$session_id" "Review contract.pdf for liability clauses"
    claude -p --resume "$session_id" "Check compliance with GDPR requirements" 
    claude -p --resume "$session_id" "Generate executive summary of risks"
    ```
  </Tab>

  <Tab title="TypeScript">
    ```ts
    import { query } from "@anthropic-ai/claude-code";

    async function legalReview() {
      // Start legal review session
      let sessionId: string;
      
      for await (const message of query({
        prompt: "Start legal review session",
        options: { maxTurns: 1 }
      })) {
        if (message.type === "system" && message.subtype === "init") {
          sessionId = message.session_id;
        }
      }
      
      // Multi-step review using same session
      const steps = [
        "Review contract.pdf for liability clauses",
        "Check compliance with GDPR requirements",
        "Generate executive summary of risks"
      ];
      
      for (const step of steps) {
        for await (const message of query({
          prompt: step,
          options: { resumeSessionId: sessionId, maxTurns: 2 }
        })) {
          if (message.type === "result") {
            console.log(`Step: ${step}`);
            console.log(message.result);
          }
        }
      }
    }
    ```
  </Tab>

  <Tab title="Python">
    ```python
    import asyncio
    from claude_code_sdk import ClaudeSDKClient, ClaudeCodeOptions

    async def legal_review():
        """Legal document review with persistent session and streaming"""
        
        async with ClaudeSDKClient(
            options=ClaudeCodeOptions(
                system_prompt="You are a corporate lawyer. Provide detailed legal analysis.",
                max_turns=2
            )
        ) as client:
            # Multi-step review in same session
            steps = [
                "Review contract.pdf for liability clauses",
                "Check compliance with GDPR requirements", 
                "Generate executive summary of risks"
            ]
            
            review_results = []
            
            for step in steps:
                print(f"\n📋 {step}\n")
                await client.query(step)
                
                step_result = []
                async for message in client.receive_response():
                    if hasattr(message, 'content'):
                        for block in message.content:
                            if hasattr(block, 'text'):
                                text = block.text
                                print(text, end='', flush=True)
                                step_result.append(text)
                    
                    if type(message).__name__ == "ResultMessage":
                        review_results.append({
                            'step': step,
                            'analysis': ''.join(step_result),
                            'cost': message.total_cost_usd
                        })
            
            # Summary
            total_cost = sum(r['cost'] for r in review_results)
            print(f"\n\n✅ Legal review complete. Total cost: ${total_cost:.4f}")
            return review_results

    # Usage
    results = await legal_review()
    ```
  </Tab>
</Tabs>

## Python-Specific Best Practices

### Key Patterns

```python
import asyncio
from claude_code_sdk import ClaudeSDKClient, ClaudeCodeOptions

# Always use context managers
async with ClaudeSDKClient() as client:
    await client.query("Analyze this code")
    async for msg in client.receive_response():
        # Process streaming messages
        pass

# Run multiple agents concurrently
async with ClaudeSDKClient() as reviewer, ClaudeSDKClient() as tester:
    await asyncio.gather(
        reviewer.query("Review main.py"),
        tester.query("Write tests for main.py")
    )

# Error handling
from claude_code_sdk import CLINotFoundError, ProcessError

try:
    async with ClaudeSDKClient() as client:
        # Your code here
        pass
except CLINotFoundError:
    print("Install CLI: npm install -g @anthropic-ai/claude-code")
except ProcessError as e:
    print(f"Process error: {e}")

# Collect full response with metadata
async def get_response(client, prompt):
    await client.query(prompt)
    text = []
    async for msg in client.receive_response():
        if hasattr(msg, 'content'):
            for block in msg.content:
                if hasattr(block, 'text'):
                    text.append(block.text)
        if type(msg).__name__ == "ResultMessage":
            return {'text': ''.join(text), 'cost': msg.total_cost_usd}
```

### IPython/Jupyter Tips

```python
# In Jupyter, use await directly in cells
client = ClaudeSDKClient()
await client.connect()
await client.query("Analyze data.csv")
async for msg in client.receive_response():
    print(msg)
await client.disconnect()

# Create reusable helper functions
async def stream_print(client, prompt):
    await client.query(prompt)
    async for msg in client.receive_response():
        if hasattr(msg, 'content'):
            for block in msg.content:
                if hasattr(block, 'text'):
                    print(block.text, end='', flush=True)
```

## Best practices

* **Use JSON output format** for programmatic parsing of responses:

  ```bash
  # Parse JSON response with jq
  result=$(claude -p "Generate code" --output-format json)
  code=$(echo "$result" | jq -r '.result')
  cost=$(echo "$result" | jq -r '.cost_usd')
  ```

* **Handle errors gracefully** - check exit codes and stderr:

  ```bash
  if ! claude -p "$prompt" 2>error.log; then
      echo "Error occurred:" >&2
      cat error.log >&2
      exit 1
  fi
  ```

* **Use session management** for maintaining context in multi-turn conversations

* **Consider timeouts** for long-running operations:

  ```bash
  timeout 300 claude -p "$complex_prompt" || echo "Timed out after 5 minutes"
  ```

* **Respect rate limits** when making multiple requests by adding delays between calls

## Related resources

* [CLI usage and controls](/en/docs/claude-code/cli-reference) - Complete CLI documentation
* [GitHub Actions integration](/en/docs/claude-code/github-actions) - Automate your GitHub workflow with Claude
* [Common workflows](/en/docs/claude-code/common-workflows) - Step-by-step guides for common use cases
