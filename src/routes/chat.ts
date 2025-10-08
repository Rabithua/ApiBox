/**
 * Chat API routes using OpenAI-compatible API
 * Provides conversation services through Alibaba Cloud's DashScope
 */

import { OpenAI } from "@openai/openai";
import {
  Logger,
  createJsonResponse,
  createErrorResponse,
} from "../utils/helpers.ts";

// Initialize OpenAI client with DashScope configuration
const openai = new OpenAI({
  apiKey: Deno.env.get("DASHSCOPE_API_KEY"),
  baseURL: "https://dashscope.aliyuncs.com/compatible-mode/v1",
});

/**
 * Message interface for chat requests
 */
interface ChatMessage {
  role: "system" | "user" | "assistant";
  content: string;
}

/**
 * Chat request body interface
 */
interface ChatRequest {
  messages: ChatMessage[];
  model?: string;
  temperature?: number;
  max_tokens?: number;
  stream?: boolean;
}

/**
 * Handle chat completion requests
 * POST /api/chat/completions
 */
export async function handleChatCompletions(req: Request): Promise<Response> {
  try {
    // Validate request method
    if (req.method !== "POST") {
      Logger.warn(`Invalid method for chat completions: ${req.method}`);
      return createErrorResponse("Method not allowed", 405, [
        {
          code: "METHOD_NOT_ALLOWED",
          message: "Only POST method is allowed for chat completions",
        },
      ]);
    }

    // Validate API key
    const apiKey = Deno.env.get("DASHSCOPE_API_KEY");
    if (!apiKey) {
      Logger.error("DASHSCOPE_API_KEY environment variable not set");
      return createErrorResponse("Service configuration error", 500, [
        {
          code: "API_KEY_NOT_CONFIGURED",
          message: "Chat service is not properly configured",
        },
      ]);
    }

    // Parse request body
    let requestBody: ChatRequest;
    try {
      requestBody = await req.json();
    } catch (error) {
      Logger.warn(`Failed to parse chat request body: ${error}`);
      return createErrorResponse("Invalid request body", 400, [
        {
          code: "INVALID_JSON",
          message: "Request body must be valid JSON",
        },
      ]);
    }

    // Validate required fields
    if (!requestBody.messages || !Array.isArray(requestBody.messages)) {
      Logger.warn("Missing or invalid messages in chat request");
      return createErrorResponse("Invalid request", 400, [
        {
          code: "MISSING_MESSAGES",
          message: "Request must include a 'messages' array",
        },
      ]);
    }

    if (requestBody.messages.length === 0) {
      Logger.warn("Empty messages array in chat request");
      return createErrorResponse("Invalid request", 400, [
        {
          code: "EMPTY_MESSAGES",
          message: "Messages array cannot be empty",
        },
      ]);
    }

    // Validate message format
    for (const message of requestBody.messages) {
      if (!message.role || !message.content) {
        Logger.warn("Invalid message format in chat request");
        return createErrorResponse("Invalid message format", 400, [
          {
            code: "INVALID_MESSAGE_FORMAT",
            message: "Each message must have 'role' and 'content' properties",
          },
        ]);
      }

      if (!["system", "user", "assistant"].includes(message.role)) {
        Logger.warn(`Invalid message role: ${message.role}`);
        return createErrorResponse("Invalid message role", 400, [
          {
            code: "INVALID_MESSAGE_ROLE",
            message: "Message role must be 'system', 'user', or 'assistant'",
          },
        ]);
      }
    }

    // Set default values
    const model = requestBody.model || "qwen-plus";
    const temperature = requestBody.temperature ?? 0.7;
    const max_tokens = requestBody.max_tokens ?? 2000;

    Logger.info(`Creating chat completion with model: ${model}`);

    // Create completion
    const completion = await openai.chat.completions.create({
      model,
      messages: requestBody.messages,
      temperature,
      max_tokens,
    });

    Logger.info("Chat completion created successfully");

    return createJsonResponse(
      completion,
      200,
      {},
      "Chat completion generated successfully"
    );
  } catch (error) {
    Logger.error(`Chat completion error: ${error}`);

    // Handle specific OpenAI errors
    if (error instanceof Error) {
      // Check for rate limiting
      if (error.message.includes("rate_limit")) {
        return createErrorResponse("Rate limit exceeded", 429, [
          {
            code: "RATE_LIMIT_EXCEEDED",
            message: "Too many requests. Please try again later.",
          },
        ]);
      }

      // Check for quota exceeded
      if (error.message.includes("quota")) {
        return createErrorResponse("Quota exceeded", 429, [
          {
            code: "QUOTA_EXCEEDED",
            message: "API quota has been exceeded",
          },
        ]);
      }

      // Check for invalid API key
      if (
        error.message.includes("authentication") ||
        error.message.includes("unauthorized")
      ) {
        return createErrorResponse("Authentication failed", 401, [
          {
            code: "AUTHENTICATION_FAILED",
            message: "Invalid API key or authentication failed",
          },
        ]);
      }
    }

    return createErrorResponse("Chat service error", 500, [
      {
        code: "CHAT_SERVICE_ERROR",
        message:
          error instanceof Error ? error.message : "Unknown error occurred",
      },
    ]);
  }
}

/**
 * Handle simple chat requests with a single message
 * POST /api/chat/simple
 */
export async function handleSimpleChat(req: Request): Promise<Response> {
  try {
    // Validate request method
    if (req.method !== "POST") {
      Logger.warn(`Invalid method for simple chat: ${req.method}`);
      return createErrorResponse("Method not allowed", 405, [
        {
          code: "METHOD_NOT_ALLOWED",
          message: "Only POST method is allowed for simple chat",
        },
      ]);
    }

    // Parse request body
    let requestBody: { message: string; model?: string };
    try {
      requestBody = await req.json();
    } catch (error) {
      Logger.warn(`Failed to parse simple chat request body: ${error}`);
      return createErrorResponse("Invalid request body", 400, [
        {
          code: "INVALID_JSON",
          message: "Request body must be valid JSON",
        },
      ]);
    }

    // Validate required fields
    if (!requestBody.message || typeof requestBody.message !== "string") {
      Logger.warn("Missing or invalid message in simple chat request");
      return createErrorResponse("Invalid request", 400, [
        {
          code: "MISSING_MESSAGE",
          message: "Request must include a 'message' string",
        },
      ]);
    }

    // Create messages array for the chat completion
    const messages: ChatMessage[] = [
      { role: "system", content: "You are a helpful assistant." },
      { role: "user", content: requestBody.message },
    ];

    // Create a new request for the chat completions handler
    const chatRequest = new Request(req.url, {
      method: "POST",
      headers: req.headers,
      body: JSON.stringify({
        messages,
        model: requestBody.model || "qwen-plus",
      }),
    });

    return await handleChatCompletions(chatRequest);
  } catch (error) {
    Logger.error(`Simple chat error: ${error}`);
    return createErrorResponse("Simple chat service error", 500, [
      {
        code: "SIMPLE_CHAT_ERROR",
        message:
          error instanceof Error ? error.message : "Unknown error occurred",
      },
    ]);
  }
}

/**
 * Get available chat models
 * GET /api/chat/models
 */
export function handleChatModels(): Response {
  Logger.info("Fetching available chat models");

  const models = {
    available_models: [
      {
        id: "qwen-plus",
        name: "Qwen Plus",
        description: "Advanced language model with enhanced capabilities",
        max_tokens: 8192,
        default: true,
      },
      {
        id: "qwen-turbo",
        name: "Qwen Turbo",
        description: "Fast and efficient language model",
        max_tokens: 8192,
        default: false,
      },
      {
        id: "qwen-max",
        name: "Qwen Max",
        description: "Most advanced language model with maximum capabilities",
        max_tokens: 8192,
        default: false,
      },
    ],
    default_model: "qwen-plus",
    provider: "Alibaba Cloud DashScope",
  };

  return createJsonResponse(
    models,
    200,
    {},
    "Available chat models retrieved successfully"
  );
}
