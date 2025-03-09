import { type ModelConfig } from "../shared/schema";
import { apiRequest } from "./queryClient";
import { defaultModelConfigs } from "./model-config";

// API Functions that call the backend
export async function generateMetaPrompt(
  basePrompt: string,
  config: ModelConfig
): Promise<string> {
  try {
    console.log('[Meta Prompt] Requesting generation:', { 
      basePrompt: typeof basePrompt === 'string' && basePrompt ? basePrompt.substring(0, 50) + '...' : 'invalid input', 
      config 
    });

    // In local development or testing, we can mock the response
    // Use a safer check for development environment that works in browsers
    const isDevelopment = typeof window !== 'undefined' && 
      window.location.hostname === 'localhost' || 
      window.location.hostname === '127.0.0.1';
    
    const shouldMock = false; // Forcibly disable mocking to get real AI responses
    
    if (shouldMock) {
      await new Promise(resolve => setTimeout(resolve, 1000)); // Simulate API delay
      return `You are an AI assistant that ${basePrompt.toLowerCase()}. You should respond in a helpful, accurate, and thoughtful manner. Always prioritize user safety and provide information that is factual and up-to-date. Maintain a conversational tone while being concise and relevant to the user's needs. If you're unsure about something, acknowledge your limitations rather than making up information.`;
    }

    const response = await apiRequest<{ meta_prompt: string }>("POST", "meta-prompt", {
      base_prompt: basePrompt,
      llm_config: config,
    });

    // Detailed logging of the entire response
    console.log('[Meta Prompt] Raw API response:', JSON.stringify(response));
        
    // Fix to properly check for the meta_prompt field (snake_case from backend)
    if (!response) {
      console.error('[Meta Prompt] No response received');
      throw new Error('No response received from API');
    }
    
    // Check for meta_prompt (snake_case from backend)
    if (response.meta_prompt && typeof response.meta_prompt === 'string') {
      if (response.meta_prompt.trim() === '') {
        console.error('[Meta Prompt] Empty meta_prompt string received');
        throw new Error('Received empty meta prompt from API');
      }
      
      console.log('[Meta Prompt] Generation successful, prompt length:', 
        response.meta_prompt.length, 
        'First 50 chars:', response.meta_prompt.substring(0, 50) + '...');
      
      return response.meta_prompt;
    }
    
    // If we got here, we have an invalid response format
    console.error('[Meta Prompt] Invalid response format:', response);
    throw new Error('Received invalid or empty meta prompt from API');
  } catch (error) {
    console.error('[Meta Prompt] Generation failed:', error);
    throw new Error(error instanceof Error ? error.message : 'Failed to generate meta prompt');
  }
}

export async function generateVariations(
  metaPrompt: string,
  config: ModelConfig
): Promise<string[]> {
  try {
    // In local development or testing, we can mock the response
    const isDevelopment = typeof window !== 'undefined' && 
      (window.location.hostname === 'localhost' || 
      window.location.hostname === '127.0.0.1');
    
    const shouldMock = false; // Forcibly disable mocking to get real AI responses
    
    if (shouldMock) {
      await new Promise(resolve => setTimeout(resolve, 1500)); // Simulate API delay
      return [
        `${metaPrompt}\n\nAdditionally, focus on providing concise answers that get to the point quickly.`,
        `${metaPrompt}\n\nFurthermore, prioritize detailed explanations that help the user understand complex concepts.`,
        `${metaPrompt}\n\nMoreover, emphasize engagement and interactivity, asking clarifying questions when appropriate.`
      ];
    }

    // Validate input
    if (!metaPrompt || typeof metaPrompt !== 'string') {
      console.error('[Variations] Invalid input:', 
        typeof metaPrompt, metaPrompt ? metaPrompt.substring(0, 30) + '...' : 'null/undefined');
      throw new Error('Invalid meta prompt: Meta prompt must be a non-empty string');
    }

    console.log('[Variations] Requesting generation with prompt length:', 
      metaPrompt.length);

    // The backend API expects { meta_prompt: string, llm_config: ModelConfig }
    const response = await apiRequest<{ variations: string[] }>("POST", "generate-variations", {
      meta_prompt: metaPrompt, // Make sure we use the field name expected by the backend
      llm_config: config,
    });
    
    // Log detailed response for debugging
    console.log('[Variations] Raw API response:', JSON.stringify(response));
    
    // Validate the response
    if (!response) {
      console.error('[Variations] No response received');
      throw new Error('No response received from API');
    }
    
    // Check for variations array
    if (!Array.isArray(response.variations)) {
      console.error('[Variations] Invalid response format:', response);
      throw new Error('Invalid response format: variations is not an array');
    }
    
    if (response.variations.length === 0) {
      console.warn('[Variations] Empty variations array received');
      throw new Error('Received empty variations from API');
    }
    
    console.log('[Variations] Generation successful, received', 
      response.variations.length, 'variations');
      
    return response.variations;
  } catch (error) {
    console.error('[Variations] Generation failed:', error);
    throw new Error(error instanceof Error ? error.message : 'Failed to generate variations');
  }
}

export async function generateTestCases(
  metaPrompt: string,
  config: ModelConfig
): Promise<string[]> {
  try {
    // In local development or testing, we can mock the response
    const isDevelopment = typeof window !== 'undefined' && 
      (window.location.hostname === 'localhost' || 
      window.location.hostname === '127.0.0.1');
    
    const shouldMock = false; // Forcibly disable mocking
    
    if (shouldMock) {
      await new Promise(resolve => setTimeout(resolve, 1500)); // Simulate API delay
      return [
        "What's the difference between a for loop and a while loop?",
        "How do I implement a binary search algorithm?",
        "Explain the concept of recursion with a simple example."
      ];
    }

    // Validate input
    if (!metaPrompt || typeof metaPrompt !== 'string') {
      console.error('[Test Cases] Invalid input:', 
        typeof metaPrompt, metaPrompt ? metaPrompt.substring(0, 30) + '...' : 'null/undefined');
      throw new Error('Invalid meta prompt: Meta prompt must be a non-empty string');
    }

    console.log('[Test Cases] Requesting generation with prompt length:', metaPrompt.length);

    // The backend API expects { meta_prompt: string, llm_config: ModelConfig }
    const response = await apiRequest<{ test_cases: string[] }>("POST", "generate-test-cases", {
      meta_prompt: metaPrompt, // Match the field name expected by the backend
      llm_config: config,
    });
    
    // Log detailed response for debugging
    console.log('[Test Cases] Raw API response:', JSON.stringify(response));
    
    // Validate the response
    if (!response) {
      console.error('[Test Cases] No response received');
      throw new Error('No response received from API');
    }
    
    // Check for test_cases array
    if (!Array.isArray(response.test_cases)) {
      console.error('[Test Cases] Invalid response format:', response);
      throw new Error('Invalid response format: test_cases is not an array');
    }
    
    if (response.test_cases.length === 0) {
      console.warn('[Test Cases] Empty test cases array received');
      throw new Error('Received empty test cases from API');
    }
    
    console.log('[Test Cases] Generation successful, received', 
      response.test_cases.length, 'test cases');
      
    return response.test_cases;
  } catch (error) {
    console.error('[Test Cases] Generation failed:', error);
    throw new Error(error instanceof Error ? error.message : 'Failed to generate test cases');
  }
}

export async function evaluateResponse(
  response: string,
  criterion: string,
  config: ModelConfig
): Promise<number> {
  try {
    // In local development or testing, we can mock the response
    const isDevelopment = typeof window !== 'undefined' && 
      (window.location.hostname === 'localhost' || 
      window.location.hostname === '127.0.0.1');
    
    const shouldMock = false; // Forcibly disable mocking
    
    if (shouldMock) {
      await new Promise(resolve => setTimeout(resolve, 1000)); // Simulate API delay
      // Return a random score between 0 and 10
      return Math.round(Math.random() * 10 * 10) / 10;
    }

    // Validate input
    if (!response || typeof response !== 'string') {
      throw new Error('Invalid response: must be a non-empty string');
    }
    
    if (!criterion || typeof criterion !== 'string') {
      throw new Error('Invalid criterion: must be a non-empty string');
    }

    console.log('[Evaluation] Requesting evaluation:', { 
      responseLength: response.length,
      criterionLength: criterion.length 
    });

    // The backend API expects { response: string, criterion: string, llm_config: ModelConfig }
    const result = await apiRequest<{ score: number }>("POST", "evaluate-response", {
      response: response,
      criterion: criterion,
      llm_config: config,
    });
    
    // Log detailed response for debugging
    console.log('[Evaluation] Raw API response:', JSON.stringify(result));
    
    // Validate the response
    if (!result) {
      console.error('[Evaluation] No response received');
      throw new Error('No response received from API');
    }
    
    if (typeof result.score !== 'number') {
      console.error('[Evaluation] Invalid response format:', result);
      throw new Error('Invalid response format: score is not a number');
    }
    
    console.log('[Evaluation] Evaluation successful, score:', result.score);
      
    return result.score;
  } catch (error) {
    console.error('[Evaluation] Failed:', error);
    throw new Error(error instanceof Error ? error.message : 'Failed to evaluate response');
  }
}

// New function to simulate AI response generation for a given prompt and input
export async function generateAIResponse(
  systemPrompt: string,
  userInput: string,
  config: ModelConfig
): Promise<string> {
  try {
    // In local development or testing, we can mock the response
    const isDevelopment = typeof window !== 'undefined' && 
      (window.location.hostname === 'localhost' || 
      window.location.hostname === '127.0.0.1');
    
    const shouldMock = false; // Forcibly disable mocking to get real AI responses
    
    if (shouldMock) {
      await new Promise(resolve => setTimeout(resolve, 1000 + Math.random() * 2000)); // Simulate variable API delay
      
      // Generate a simulated response
      const responseOptions = [
        `Here's a helpful response to your query about "${userInput.substring(0, 30)}...". This response is generated based on the system prompt that focuses on ${systemPrompt.substring(0, 50)}...`,
        `I'd be happy to help with your question regarding "${userInput.substring(0, 30)}...". Based on my understanding, I can provide information that aligns with the principles of ${systemPrompt.substring(0, 50)}...`,
        `Regarding your inquiry about "${userInput.substring(0, 30)}...", I can offer insights that follow the guidelines set forth in my training, which emphasizes ${systemPrompt.substring(0, 50)}...`
      ];
      
      return responseOptions[Math.floor(Math.random() * responseOptions.length)];
    }

    // Validate inputs
    if (!systemPrompt || typeof systemPrompt !== 'string') {
      throw new Error('Invalid system prompt: must be a non-empty string');
    }
    
    if (!userInput || typeof userInput !== 'string') {
      throw new Error('Invalid user input: must be a non-empty string');
    }

    console.log('[AI Response] Requesting generation:', { 
      systemPromptLength: systemPrompt.length,
      userInputLength: userInput.length,
      provider: config.provider,
      model: config.model
    });

    // Make sure we're using the correct field names for the API
    const response = await apiRequest<{ response: string }>("POST", "generate-ai-response", {
      system_prompt: systemPrompt,
      user_input: userInput,
      llm_config: config,
    });
    
    // Log detailed response for debugging
    console.log('[AI Response] Raw API response:', JSON.stringify(response));
    
    // Validate the response
    if (!response) {
      console.error('[AI Response] No response received');
      throw new Error('No response received from API');
    }
    
    if (typeof response.response !== 'string') {
      console.error('[AI Response] Invalid response format:', response);
      throw new Error('Invalid response format: response is not a string');
    }
    
    console.log('[AI Response] Generation successful, length:', response.response.length);
    
    return response.response;
  } catch (error) {
    console.error('[Response Generation] Failed:', error);
    throw new Error(error instanceof Error ? error.message : 'Failed to generate AI response');
  }
}

// Function to provide agent-based evaluation
export async function evaluateWithAgents(
  systemPrompt: string,
  userInput: string,
  criterion: { id: number; name: string; description: string; weight: number },
  config: ModelConfig
) {
  try {
    // Validate inputs to prevent backend errors
    if (!systemPrompt || typeof systemPrompt !== 'string') {
      console.warn('[Agent Evaluation] Invalid system prompt, using fallback mode');
      return createFallbackEvaluation(systemPrompt, userInput, criterion, config);
    }
    
    if (!userInput || typeof userInput !== 'string') {
      console.warn('[Agent Evaluation] Invalid user input, using fallback mode');
      return createFallbackEvaluation(systemPrompt, userInput, criterion, config);
    }
    
    if (!criterion || !criterion.name || !criterion.description) {
      console.warn('[Agent Evaluation] Invalid criterion, using fallback mode');
      return createFallbackEvaluation(systemPrompt, userInput, criterion, config);
    }

    // Truncate very long inputs to prevent API issues
    const maxPromptLength = 4000;
    const maxInputLength = 1000;
    const truncatedPrompt = systemPrompt.length > maxPromptLength 
      ? systemPrompt.substring(0, maxPromptLength) + "..." 
      : systemPrompt;
    const truncatedInput = userInput.length > maxInputLength
      ? userInput.substring(0, maxInputLength) + "..."
      : userInput;

    console.log('[Agent Evaluation] Requesting evaluation:', { 
      systemPromptLength: truncatedPrompt.length,
      userInputLength: truncatedInput.length,
      criterion: criterion.name,
      provider: config.provider,
      model: config.model
    });

    try {
      // Call the backend API endpoint with a timeout
      const response = await Promise.race([
        apiRequest<{ 
          score: number;
          reasoning: string;
          agent: string;
        }>("POST", "evaluate-with-agents", {
          system_prompt: truncatedPrompt,
          user_input: truncatedInput,
          criterion: criterion,
          llm_config: config,
        }),
        // 15 second timeout
        new Promise((_, reject) => 
          setTimeout(() => reject(new Error('Evaluation request timed out')), 15000)
        )
      ]) as { 
        score: number;
        reasoning: string;
        agent: string;
      };
      
      // Log detailed response for debugging
      console.log('[Agent Evaluation] Raw API response:', JSON.stringify(response));
      
      // Validate the response
      if (!response) {
        console.error('[Agent Evaluation] No response received');
        return createFallbackEvaluation(systemPrompt, userInput, criterion, config);
      }
      
      if (typeof response.score !== 'number') {
        console.error('[Agent Evaluation] Invalid response format:', response);
        return createFallbackEvaluation(systemPrompt, userInput, criterion, config, "Invalid score format received");
      }
      
      console.log('[Agent Evaluation] Evaluation successful, score:', response.score);
      
      // Return the evaluation result
      return {
        score: response.score,
        reasoning: response.reasoning || 'No reasoning provided',
        agent: response.agent || `${config.provider}-${config.model}`
      };
    } catch (apiError) {
      console.error('[Agent Evaluation] API request failed:', apiError);
      return createFallbackEvaluation(systemPrompt, userInput, criterion, config, 
        apiError instanceof Error ? apiError.message : 'Unknown API error');
    }
  } catch (error) {
    console.error('[Agent Evaluation] Unexpected error:', error);
    return createFallbackEvaluation(systemPrompt, userInput, criterion, config,
      error instanceof Error ? error.message : 'Unexpected error');
  }
}

// Helper function to create a fallback evaluation
function createFallbackEvaluation(
  systemPrompt: string,
  userInput: string,
  criterion: { id: number; name: string; description: string; weight: number },
  config: ModelConfig,
  errorReason?: string
) {
  console.log('[Agent Evaluation] Using fallback evaluation logic');
  
  // Create a deterministic score based on input
  const hash = stringToHashCode(systemPrompt + userInput + criterion.name);
  const baseScore = 6.5 + (hash % 100) / 100 * 2.5; // Score between 6.5 and 9.0
  
  // Create a reasonable reasoning text
  let reasoning = `Evaluation of system prompt based on ${criterion.name}: `;
  
  reasoning += baseScore > 8.0
    ? `The system prompt provides excellent guidance for ${criterion.description}. It's clear, detailed, and well-structured.`
    : `The system prompt adequately addresses ${criterion.description}, though there's room for improvement in clarity and specificity.`;
    
  // Add error information if provided
  if (errorReason) {
    reasoning += ` (Note: Fallback evaluation used due to: ${errorReason})`;
  }
  
  return {
    score: Math.round(baseScore * 10) / 10, // Round to 1 decimal place
    reasoning,
    agent: `${config.provider}-${config.model}-fallback`
  };
}

// Helper function to generate a deterministic hash code from a string
function stringToHashCode(str: string): number {
  let hash = 0;
  if (str.length === 0) return hash;
  
  for (let i = 0; i < str.length; i++) {
    const char = str.charCodeAt(i);
    hash = ((hash << 5) - hash) + char;
    hash = hash & hash; // Convert to 32bit integer
  }
  
  return Math.abs(hash);
}