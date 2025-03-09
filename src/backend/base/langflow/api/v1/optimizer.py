from fastapi import APIRouter, Request, Response, HTTPException, Body
import os
from datetime import datetime
from typing import Dict, Any

from .ai_providers import (
    generate_meta_prompt,
    generate_variations,
    generate_test_cases,
    evaluate_response,
    evaluate_with_agents
)
from .config import has_valid_api_keys
from .schema import (
    ModelConfig,
    TestConnectionRequest,
    TestConnectionResponse,
    MetaPromptRequest,
    MetaPromptResponse,
    VariationsRequest,
    VariationsResponse,
    TestCasesRequest,
    TestCasesResponse,
    EvaluationRequest,
    EvaluationResponse,
    AgentEvaluationRequest,
    AgentEvaluationResponse,
    CreateMetaPrompt,
    CreatePromptVariation,
    CreateTestCase
)
from .storage import storage

# Create the router
router = APIRouter(prefix="/optimizer")


# Debug endpoint to verify API is working
@router.get("/debug")
async def debug_endpoint(request: Request):
    print("[Debug] API request received:", {
        "path": request.url.path,
        "method": request.method,
        "headers": dict(request.headers),
    })
    return {
        "status": "API is working",
        "timestamp": datetime.now().isoformat(),
        "path": request.url.path
    }


# API Keys endpoint
@router.get("/keys")
async def get_api_keys(response: Response):
    try:
        api_keys = {
            "VITE_OPENAI_API_KEY": os.getenv("OPENAI_API_KEY"),
            "VITE_ANTHROPIC_API_KEY": os.getenv("ANTHROPIC_API_KEY"),
            "VITE_GOOGLE_API_KEY": os.getenv("GOOGLE_API_KEY"),
        }

        response.headers["Access-Control-Expose-Headers"] = "X-API-Keys"
        response.headers["X-API-Keys"] = str(api_keys)
        return {"status": "ok"}
    except Exception as e:
        print("[API Keys] Error:", str(e))
        raise HTTPException(
            status_code=500,
            detail={
                "error": "Failed to process API keys",
                "timestamp": datetime.now().isoformat()
            }
        )


# Diagnostic endpoint to test AI connection
@router.post("/test-ai-connection")
async def test_ai_connection(request: TestConnectionRequest):
    try:
        print(f"[test-ai-connection] Testing with provider: {request.provider}, model: {request.model}")
        
        # Simple test prompt
        test_prompt = "Create a system prompt for a boxing coach AI assistant."
        
        # Create a model config
        model_config = ModelConfig(
            provider=request.provider,
            model=request.model,
            temperature=0.7,
            max_tokens=500,
            top_p=1.0
        )
        
        # Generate a meta prompt as a test
        response_text = await generate_meta_prompt(test_prompt, model_config)
        
        return TestConnectionResponse(
            status="success",
            message=f"Successfully connected to {request.provider} API",
            response=response_text
        )
        
    except Exception as e:
        print(f"[test-ai-connection] Error: {str(e)}")
        return TestConnectionResponse(
            status="error",
            message=f"Failed to connect to {request.provider} API: {str(e)}",
        )


# Meta prompt generation endpoint
@router.post("/meta-prompt")
async def create_meta_prompt(request: MetaPromptRequest):
    """Generate a meta prompt from a base prompt."""
    try:
        meta_prompt = await generate_meta_prompt(
            request.base_prompt, 
            request.llm_config
        )
        
        # Validate the meta prompt
        if not meta_prompt or not isinstance(meta_prompt, str) or not meta_prompt.strip():
            raise ValueError("Generated meta prompt is empty or invalid")

        # Store the meta prompt - create a proper Pydantic model
        meta_prompt_data = CreateMetaPrompt(
            base_prompt=request.base_prompt,
            meta_prompt=meta_prompt,
            llm_config=request.llm_config
        )
        await storage.create_meta_prompt(meta_prompt_data)
        
        # Log success response for debugging
        print(f"[meta-prompt] Successfully generated meta prompt (length: {len(meta_prompt)})")
        
        return MetaPromptResponse(meta_prompt=meta_prompt)
    except Exception as e:
        print(f"[generate-meta-prompt] Error: {str(e)}")
        raise HTTPException(
            status_code=500,
            detail={
                "error": f"Failed to generate meta prompt: {str(e)}",
                "timestamp": datetime.now().isoformat()
            }
        )


# Prompt variations endpoint
@router.post("/generate-variations")
async def create_variations(request: VariationsRequest):
    """Generate variations of a prompt."""
    try:
        variations = await generate_variations(
            request.meta_prompt, 
            request.llm_config
        )
        return VariationsResponse(variations=variations)
    except Exception as e:
        print(f"[generate-variations] Error: {str(e)}")
        raise HTTPException(
            status_code=500,
            detail={
                "error": f"Failed to generate variations: {str(e)}",
                "timestamp": datetime.now().isoformat()
            }
        )


# Test cases endpoint
@router.post("/generate-test-cases")
async def create_test_cases(request: TestCasesRequest):
    """Generate test cases for a prompt."""
    try:
        test_cases = await generate_test_cases(
            request.meta_prompt, 
            request.llm_config
        )
        return TestCasesResponse(test_cases=test_cases)
    except Exception as e:
        print(f"[generate-test-cases] Error: {str(e)}")
        raise HTTPException(
            status_code=500,
            detail={
                "error": f"Failed to generate test cases: {str(e)}",
                "timestamp": datetime.now().isoformat()
            }
        )


# Evaluation endpoint
@router.post("/evaluate-response")
async def create_evaluation(request: EvaluationRequest):
    """Evaluate an AI response against a criterion."""
    try:
        score = await evaluate_response(
            request.response, 
            request.criterion, 
            request.llm_config
        )
        return EvaluationResponse(score=score)
    except Exception as e:
        print(f"[evaluate-response] Error: {str(e)}")
        raise HTTPException(
            status_code=500,
            detail={
                "error": f"Failed to evaluate response: {str(e)}",
                "timestamp": datetime.now().isoformat()
            }
        )


# Meta prompts endpoints
@router.get("/meta-prompt")
async def get_all_meta_prompts():
    try:
        meta_prompts = await storage.get_all_meta_prompts()
        return {"meta_prompts": meta_prompts}
    except Exception as e:
        print(f"[get-meta-prompts] Error: {str(e)}")
        raise HTTPException(
            status_code=500, 
            detail={
                "error": f"Failed to retrieve meta prompts: {str(e)}",
                "timestamp": datetime.now().isoformat()
            }
        )


@router.get("/meta-prompt/{meta_prompt_id}")
async def get_meta_prompt(meta_prompt_id: int):
    try:
        meta_prompt = await storage.get_meta_prompt(meta_prompt_id)
        if not meta_prompt:
            raise HTTPException(
                status_code=404,
                detail={
                    "error": f"Meta prompt with id {meta_prompt_id} not found",
                    "timestamp": datetime.now().isoformat()
                }
            )
        return meta_prompt
    except HTTPException:
        raise
    except Exception as e:
        print(f"[get-meta-prompt] Error: {str(e)}")
        raise HTTPException(
            status_code=500,
            detail={
                "error": f"Failed to retrieve meta prompt: {str(e)}",
                "timestamp": datetime.now().isoformat()
            }
        )


# Variations endpoints
@router.post("/variations")
async def create_variation(data: Dict[str, Any] = Body(...)):
    try:
        # Convert to proper Pydantic model
        variation_data = CreatePromptVariation(
            meta_prompt_id=data.get("meta_prompt_id"),
            content=data.get("content"),
            llm_config=data.get("llm_config")
        )
        variation = await storage.create_variation(variation_data)
        return variation
    except Exception as e:
        print(f"[create-variation] Error: {str(e)}")
        raise HTTPException(
            status_code=500,
            detail={
                "error": f"Failed to create variation: {str(e)}",
                "timestamp": datetime.now().isoformat()
            }
        )


@router.get("/variations/{variation_id}")
async def get_variation(variation_id: int):
    try:
        variation = await storage.get_variation(variation_id)
        if not variation:
            raise HTTPException(
                status_code=404,
                detail={
                    "error": f"Variation with id {variation_id} not found",
                    "timestamp": datetime.now().isoformat()
                }
            )
        return variation
    except HTTPException:
        raise
    except Exception as e:
        print(f"[get-variation] Error: {str(e)}")
        raise HTTPException(
            status_code=500,
            detail={
                "error": f"Failed to retrieve variation: {str(e)}",
                "timestamp": datetime.now().isoformat()
            }
        )


@router.get("/meta-prompt/{meta_prompt_id}/variations")
async def get_variations_for_meta_prompt(meta_prompt_id: int):
    try:
        variations = await storage.get_variations_for_meta_prompt(meta_prompt_id)
        return {"variations": variations}
    except Exception as e:
        print(f"[get-variations] Error: {str(e)}")
        raise HTTPException(
            status_code=500,
            detail={
                "error": f"Failed to retrieve variations: {str(e)}",
                "timestamp": datetime.now().isoformat()
            }
        )


@router.patch("/variations/{variation_id}")
async def update_variation(variation_id: int, data: Dict[str, str] = Body(...)):
    try:
        if "content" not in data:
            raise HTTPException(
                status_code=400,
                detail={
                    "error": "Content is required",
                    "timestamp": datetime.now().isoformat()
                }
            )
        
        variation = await storage.update_variation(variation_id, data["content"])
        return variation
    except HTTPException:
        raise
    except Exception as e:
        print(f"[update-variation] Error: {str(e)}")
        raise HTTPException(
            status_code=500,
            detail={
                "error": f"Failed to update variation: {str(e)}",
                "timestamp": datetime.now().isoformat()
            }
        )


@router.delete("/variations/{variation_id}")
async def delete_variation(variation_id: int):
    try:
        await storage.delete_variation(variation_id)
        return {"status": "success"}
    except Exception as e:
        print(f"[delete-variation] Error: {str(e)}")
        raise HTTPException(
            status_code=500,
            detail={
                "error": f"Failed to delete variation: {str(e)}",
                "timestamp": datetime.now().isoformat()
            }
        )


# Test cases endpoints
@router.post("/test-cases")
async def create_test_case(data: Dict[str, Any] = Body(...)):
    try:
        # Convert to proper Pydantic model
        test_case_data = CreateTestCase(
            meta_prompt_id=data.get("meta_prompt_id"),
            input=data.get("input"),
            llm_config=data.get("llm_config")
        )
        test_case = await storage.create_test_case(test_case_data)
        return test_case
    except Exception as e:
        print(f"[create-test-case] Error: {str(e)}")
        raise HTTPException(
            status_code=500,
            detail={
                "error": f"Failed to create test case: {str(e)}",
                "timestamp": datetime.now().isoformat()
            }
        )


@router.get("/test-cases/{test_case_id}")
async def get_test_case(test_case_id: int):
    try:
        test_case = await storage.get_test_case(test_case_id)
        if not test_case:
            raise HTTPException(
                status_code=404,
                detail={
                    "error": f"Test case with id {test_case_id} not found",
                    "timestamp": datetime.now().isoformat()
                }
            )
        return test_case
    except HTTPException:
        raise
    except Exception as e:
        print(f"[get-test-case] Error: {str(e)}")
        raise HTTPException(
            status_code=500,
            detail={
                "error": f"Failed to retrieve test case: {str(e)}",
                "timestamp": datetime.now().isoformat()
            }
        )


@router.get("/meta-prompts/{meta_prompt_id}/test-cases")
async def get_test_cases_for_meta_prompt(meta_prompt_id: int):
    try:
        test_cases = await storage.get_test_cases_for_meta_prompt(meta_prompt_id)
        return {"test_cases": test_cases}
    except Exception as e:
        print(f"[get-test-cases] Error: {str(e)}")
        raise HTTPException(
            status_code=500,
            detail={
                "error": f"Failed to retrieve test cases: {str(e)}",
                "timestamp": datetime.now().isoformat()
            }
        )


# Leaderboard endpoint
@router.get("/meta-prompts/{meta_prompt_id}/leaderboard")
async def get_leaderboard(meta_prompt_id: int):
    try:
        leaderboard = await storage.get_leaderboard(meta_prompt_id)
        return {"leaderboard": leaderboard}
    except Exception as e:
        print(f"[get-leaderboard] Error: {str(e)}")
        raise HTTPException(
            status_code=500,
            detail={
                "error": f"Failed to retrieve leaderboard: {str(e)}",
                "timestamp": datetime.now().isoformat()
            }
        )


@router.post("/generate-ai-response")
async def generate_ai_response(data: Dict[str, Any] = Body(...)):
    """
    Generate an AI response based on a system prompt and user input.
    
    This endpoint generates a response using an AI model based on the provided:
    - systemPrompt: The system instructions for the AI
    - userInput: The user's input/question
    - llm_config: The model configuration to use
    
    Returns the generated AI response.
    """
    try:
        system_prompt = data.get("systemPrompt")
        user_input = data.get("userInput")
        llm_config = data.get("llm_config")
        
        if not system_prompt or not user_input or not llm_config:
            raise HTTPException(status_code=400, detail="Missing required fields")
        
        # In a real implementation, you would use an LLM provider to generate a response
        # This is a simplified mock implementation for now
        # You can expand this to use the appropriate AI provider based on the llm_config
        
        # Call your AI provider lib/function here
        # response = call_ai_provider(system_prompt, user_input, llm_config)
        
        # For now, return a mock response
        mock_response = f"This is a response to '{user_input}' using the system prompt guidelines."
        
        return {
            "response": mock_response,
            "model": llm_config.get("model", "unknown"),
            "timestamp": datetime.now().isoformat()
        }
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to generate AI response: {str(e)}")


# Add this new endpoint after the evaluate-response endpoint
@router.post("/evaluate-with-agents")
async def evaluate_with_agents_endpoint(request: AgentEvaluationRequest):
    """Evaluate a system prompt and user input against a criterion using multiple agent perspectives."""
    try:
        print(f"[evaluate-with-agents] Request received with criterion: {request.criterion.get('name', 'Unknown')}")
        print(f"[evaluate-with-agents] Using model: {request.llm_config.provider}-{request.llm_config.model}")
        
        # Verify input fields
        if not request.system_prompt:
            raise HTTPException(status_code=400, detail="Missing system_prompt field")
        if not request.user_input:
            raise HTTPException(status_code=400, detail="Missing user_input field")
        if not request.criterion:
            raise HTTPException(status_code=400, detail="Missing criterion field")
        
        # Call the evaluation function
        result = await evaluate_with_agents(
            request.system_prompt, 
            request.user_input, 
            request.criterion, 
            request.llm_config
        )
        
        # Log successful response
        print(f"[evaluate-with-agents] Successfully generated result with score: {result.get('score', 'unknown')}")
        
        # Create and return the response
        response = AgentEvaluationResponse(
            score=result.get('score', 7.0),
            reasoning=result.get('reasoning', 'No reasoning provided'),
            agent=result.get('agent', f"{request.llm_config.provider}-{request.llm_config.model}")
        )
        
        return response
            
    except HTTPException:
        # Re-raise HTTP exceptions
        raise
    except Exception as e:
        # Handle any other errors
        import traceback
        print(f"[evaluate-with-agents] Outer error: {str(e)}")
        print(traceback.format_exc())
        
        # Return a proper error response
        raise HTTPException(
            status_code=500,
            detail={
                "error": f"Failed to evaluate with agents: {str(e)}",
                "timestamp": datetime.now().isoformat()
            }
        )


# Add a simple test endpoint for the agent evaluation
@router.get("/test-evaluate-with-agents")
async def test_evaluate_with_agents():
    """Simple test endpoint for the agent evaluation functionality."""
    try:
        # Create test data
        system_prompt = "You are a helpful AI assistant that answers questions about programming. Always provide code examples when relevant and explain concepts step by step."
        user_input = "How do I create a loop in Python?"
        criterion = {
            "id": 1,
            "name": "Helpfulness",
            "description": "How well the prompt guides responses to be helpful and informative",
            "weight": 1.0
        }
        llm_config = ModelConfig(
            provider="openai",
            model="gpt-3.5-turbo",
            temperature=0.7,
            max_tokens=500
        )
        
        # Start time for performance measurement
        import time
        start_time = time.time()
        
        # Call the evaluation function
        result = await evaluate_with_agents(
            system_prompt,
            user_input,
            criterion,
            llm_config
        )
        
        # Calculate elapsed time
        elapsed_time = time.time() - start_time
        
        # Return the result with additional metadata
        return {
            "status": "success",
            "performance": {
                "elapsed_seconds": round(elapsed_time, 2),
                "timestamp": datetime.now().isoformat()
            },
            "test_data": {
                "system_prompt": system_prompt[:100] + "...",
                "user_input": user_input,
                "criterion": criterion,
                "model": f"{llm_config.provider}/{llm_config.model}"
            },
            "result": {
                "score": result.get("score"),
                "reasoning_excerpt": result.get("reasoning", "")[:200] + "...",
                "reasoning_length": len(result.get("reasoning", "")),
                "agent": result.get("agent")
            },
            "note": "This is a test response. Use the POST /evaluate-with-agents endpoint for actual evaluations."
        }
    except Exception as e:
        # Return detailed error info
        import traceback
        error_traceback = traceback.format_exc()
        
        return {
            "status": "error",
            "message": f"Test failed: {str(e)}",
            "traceback": error_traceback[:500] + "..." if len(error_traceback) > 500 else error_traceback
        } 