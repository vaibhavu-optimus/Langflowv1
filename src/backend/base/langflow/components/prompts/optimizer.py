from langflow.custom import Component
from langflow.inputs.inputs import StrInput, FloatInput, IntInput, BoolInput
from langflow.io import MessageTextInput, Output, PromptInput
from langflow.schema.message import Message
import httpx
import json
from typing import Dict, List, Any, Optional
import asyncio
import os

class PromptOptimizerComponent(Component):
    display_name: str = "Prompt Optimizer"
    description: str = "Optimize prompts by generating variations, creating test cases, and evaluating them."
    icon = "prompts"
    trace_type = "optimizer"
    name = "PromptOptimizerNode"

    inputs = [
        PromptInput(name="base_prompt", display_name="Base Prompt"),
        StrInput(name="provider", display_name="AI Provider", value="openai"),
        StrInput(name="model", display_name="Model", value="gpt-4"),
        FloatInput(name="temperature", display_name="Temperature", value=0.7),
        IntInput(name="max_tokens", display_name="Max Tokens", value=2048),
        FloatInput(name="top_p", display_name="Top P", value=1.0),
        BoolInput(name="force_refresh", display_name="Force Refresh", value=False, advanced=True),
    ]

    outputs = [
        Output(display_name="Meta Prompt", name="meta_prompt", method="get_meta_prompt"),
        Output(display_name="Variations", name="variations", method="get_variations"),
        Output(display_name="Test Cases", name="test_cases", method="get_test_cases"),
        Output(display_name="Best Prompt", name="best_prompt", method="get_best_prompt"),
    ]

    # Store results
    _meta_prompt_result = None
    _variations_result = None
    _test_cases_result = None
    _best_prompt_result = None
    
    # Store last used attributes for change detection
    _last_attributes = {}
    
    # API endpoints
    _API_PATH = "/api/v1/optimizer"
    
    async def build_prompt(self) -> Message:
        """Main method to run the entire optimization pipeline and return the best prompt."""
        # Check if we need to force a refresh or if critical attributes changed
        if self._should_refresh():
            await self._clear_cache()
            
        # Store current attributes for future change detection
        self._update_last_attributes()
            
        # Run the optimization pipeline
        await self._run_full_optimization()
        
        # Return the best prompt as the main output
        if self._best_prompt_result:
            return self._best_prompt_result
        return Message(text="Optimization not completed yet.")
    
    def _should_refresh(self) -> bool:
        """Check if we should refresh the cached results."""
        # Force refresh if requested
        if self._attributes.get("force_refresh", False):
            return True
            
        # Check if critical attributes changed
        critical_attrs = ["base_prompt", "provider", "model", "temperature", "max_tokens", "top_p"]
        for attr in critical_attrs:
            if self._attributes.get(attr) != self._last_attributes.get(attr):
                return True
                
        return False
        
    def _update_last_attributes(self):
        """Store current attributes for future change detection."""
        self._last_attributes = {
            "base_prompt": self._attributes.get("base_prompt"),
            "provider": self._attributes.get("provider"),
            "model": self._attributes.get("model"),
            "temperature": self._attributes.get("temperature"),
            "max_tokens": self._attributes.get("max_tokens"),
            "top_p": self._attributes.get("top_p"),
        }
        
    async def _clear_cache(self):
        """Clear all cached results."""
        self._meta_prompt_result = None
        self._variations_result = None
        self._test_cases_result = None
        self._best_prompt_result = None
    
    async def _run_full_optimization(self):
        """Run the full optimization workflow."""
        # Skip if we already have all results
        if (self._meta_prompt_result and self._variations_result and 
            self._test_cases_result and self._best_prompt_result):
            return
            
        # Get meta prompt
        if not self._meta_prompt_result:
            self._meta_prompt_result = await self._fetch_meta_prompt()
            
        if not self._meta_prompt_result or "Error" in self._meta_prompt_result.text:
            return
        
        # Get variations
        if not self._variations_result:
            self._variations_result = await self._fetch_variations(self._meta_prompt_result)
            
        if not self._variations_result or "Error" in self._variations_result.text:
            return
        
        # Get test cases
        if not self._test_cases_result:
            self._test_cases_result = await self._fetch_test_cases(self._meta_prompt_result)
            
        if not self._test_cases_result or "Error" in self._test_cases_result.text:
            return
        
        # Get best prompt through evaluation
        if not self._best_prompt_result:
            self._best_prompt_result = await self._evaluate_prompts(
                self._variations_result, 
                self._test_cases_result
            )

    async def get_meta_prompt(self) -> Message:
        """Return the meta prompt if already generated, or generate it."""
        if self._should_refresh():
            await self._clear_cache()
            self._update_last_attributes()
            
        if self._meta_prompt_result:
            return self._meta_prompt_result
        return await self._fetch_meta_prompt()
    
    async def _make_api_call(self, endpoint: str, json_data: Dict) -> httpx.Response:
        """Make a POST request to the optimizer API using the internal FastAPI client."""
        try:
            from fastapi.testclient import TestClient
            from langflow.api.v1.optimizer import router
            
            # Use FastAPI test client for direct API calls
            client = TestClient(router)
            response = client.post(endpoint, json=json_data)
            return response
        except ImportError:
            # Fallback to httpx if TestClient is not available
            url = f"http://localhost:7860{self._API_PATH}{endpoint}"
            async with httpx.AsyncClient() as client:
                return await client.post(url, json=json_data)
    
    async def _fetch_meta_prompt(self) -> Message:
        """Generate a meta prompt based on the base prompt."""
        base_prompt = self._attributes.get("base_prompt")
        if not base_prompt:
            return Message(text="No base prompt provided.")

        llm_config = self._get_llm_config()
        
        try:
            response = await self._make_api_call(
                "/meta-prompt",
                {
                    "base_prompt": base_prompt,
                    "llm_config": llm_config
                }
            )
            
            if response.status_code == 200:
                meta_prompt = response.json().get("meta_prompt", "")
                return Message(text=meta_prompt)
            else:
                return Message(text=f"Error generating meta prompt: {response.text}")
        except Exception as e:
            return Message(text=f"Error: {str(e)}")

    async def get_variations(self) -> Message:
        """Return prompt variations if already generated, or generate them."""
        if self._should_refresh():
            await self._clear_cache()
            self._update_last_attributes()
            
        if self._variations_result:
            return self._variations_result
        
        meta_prompt = await self.get_meta_prompt()
        return await self._fetch_variations(meta_prompt)
    
    async def _fetch_variations(self, meta_prompt: Message) -> Message:
        """Generate prompt variations based on the meta prompt."""
        if not meta_prompt or not meta_prompt.text:
            return Message(text="No meta prompt available.")

        llm_config = self._get_llm_config()
        
        try:
            response = await self._make_api_call(
                "/generate-variations",
                {
                    "meta_prompt": meta_prompt.text,
                    "llm_config": llm_config
                }
            )
            
            if response.status_code == 200:
                variations = response.json().get("variations", [])
                formatted_variations = "\n\n===== VARIATIONS =====\n\n"
                for i, variation in enumerate(variations, 1):
                    formatted_variations += f"Variation {i}:\n{variation}\n\n"
                return Message(text=formatted_variations)
            else:
                return Message(text=f"Error generating variations: {response.text}")
        except Exception as e:
            return Message(text=f"Error: {str(e)}")

    async def get_test_cases(self) -> Message:
        """Return test cases if already generated, or generate them."""
        if self._should_refresh():
            await self._clear_cache()
            self._update_last_attributes()
            
        if self._test_cases_result:
            return self._test_cases_result
        
        meta_prompt = await self.get_meta_prompt()
        return await self._fetch_test_cases(meta_prompt)
    
    async def _fetch_test_cases(self, meta_prompt: Message) -> Message:
        """Generate test cases based on the meta prompt."""
        if not meta_prompt or not meta_prompt.text:
            return Message(text="No meta prompt available.")

        llm_config = self._get_llm_config()
        
        try:
            response = await self._make_api_call(
                "/generate-test-cases",
                {
                    "meta_prompt": meta_prompt.text,
                    "llm_config": llm_config
                }
            )
            
            if response.status_code == 200:
                test_cases = response.json().get("test_cases", [])
                formatted_test_cases = "\n\n===== TEST CASES =====\n\n"
                for i, test_case in enumerate(test_cases, 1):
                    formatted_test_cases += f"Test Case {i}:\n{test_case}\n\n"
                return Message(text=formatted_test_cases)
            else:
                return Message(text=f"Error generating test cases: {response.text}")
        except Exception as e:
            return Message(text=f"Error: {str(e)}")

    async def get_best_prompt(self) -> Message:
        """Return the best prompt if already evaluated, or evaluate and return it."""
        if self._should_refresh():
            await self._clear_cache()
            self._update_last_attributes()
            
        if self._best_prompt_result:
            return self._best_prompt_result
        
        # If not already evaluated, run the evaluation
        variations_msg = await self.get_variations()
        test_cases_msg = await self.get_test_cases()
        return await self._evaluate_prompts(variations_msg, test_cases_msg)
    
    async def _evaluate_prompts(self, variations_msg: Message, test_cases_msg: Message) -> Message:
        """Evaluate prompt variations and return the best one."""
        if "Error" in variations_msg.text or "Error" in test_cases_msg.text:
            return Message(text="Could not evaluate prompts due to errors in generation.")
        
        # Parse variations from the formatted text
        variations_text = variations_msg.text
        variation_parts = variations_text.split("Variation ")[1:]
        variations = []
        for part in variation_parts:
            if ":" in part:
                variation_content = part.split(":", 1)[1].strip()
                variations.append(variation_content.split("\n\n")[0])
        
        # Parse test cases from the formatted text
        test_cases_text = test_cases_msg.text
        test_case_parts = test_cases_text.split("Test Case ")[1:]
        test_cases = []
        for part in test_case_parts:
            if ":" in part:
                test_case_content = part.split(":", 1)[1].strip()
                test_cases.append(test_case_content.split("\n\n")[0])
        
        if not variations or not test_cases:
            return Message(text="No variations or test cases to evaluate.")
        
        # Evaluate variations against test cases
        llm_config = self._get_llm_config()
        scores = {}
        
        try:
            for i, variation in enumerate(variations):
                variation_scores = []
                for test_case in test_cases:
                    # Generate a response using the variation and test case
                    response = await self._make_api_call(
                        "/generate-ai-response",
                        {
                            "prompt": variation,
                            "input": test_case,
                            "llm_config": llm_config
                        }
                    )
                    
                    if response.status_code != 200:
                        continue
                        
                    ai_response = response.json().get("response", "")
                    
                    # Evaluate the response
                    eval_response = await self._make_api_call(
                        "/evaluate-response",
                        {
                            "response": ai_response,
                            "criterion": "Quality and relevance of the response",
                            "llm_config": llm_config
                        }
                    )
                    
                    if eval_response.status_code == 200:
                        score = eval_response.json().get("score", 0)
                        variation_scores.append(score)
                
                if variation_scores:
                    avg_score = sum(variation_scores) / len(variation_scores)
                    scores[i] = avg_score
            
            # Find the best variation
            if scores:
                best_variation_idx = max(scores, key=scores.get)
                best_variation = variations[best_variation_idx]
                
                result = f"===== EVALUATION RESULTS =====\n\n"
                for idx, score in scores.items():
                    result += f"Variation {idx+1}: Score {score:.2f}\n"
                
                result += f"\n===== BEST PROMPT =====\n\n{best_variation}"
                
                return Message(text=result)
            else:
                return Message(text="Could not determine the best prompt due to evaluation errors.")
        except Exception as e:
            return Message(text=f"Error during evaluation: {str(e)}")

    def _get_llm_config(self) -> Dict[str, Any]:
        """Get LLM configuration from component attributes."""
        return {
            "provider": self._attributes.get("provider", "openai"),
            "model": self._attributes.get("model", "gpt-4"),
            "temperature": float(self._attributes.get("temperature", 0.7)),
            "max_tokens": int(self._attributes.get("max_tokens", 2048)),
            "top_p": float(self._attributes.get("top_p", 1.0))
        } 