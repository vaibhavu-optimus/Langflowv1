import pytest
from langflow.components.prompts.optimizer import PromptOptimizerComponent
from langflow.schema.message import Message


def test_prompt_optimizer_component_attributes():
    """Test the PromptOptimizerComponent attributes."""
    component = PromptOptimizerComponent()
    assert component.display_name == "Prompt Optimizer"
    assert component.name == "PromptOptimizerNode"
    
    # Check inputs
    input_names = [input.name for input in component.inputs]
    assert "base_prompt" in input_names
    assert "provider" in input_names
    assert "model" in input_names
    assert "temperature" in input_names
    assert "max_tokens" in input_names
    assert "top_p" in input_names
    assert "force_refresh" in input_names
    
    # Check outputs
    output_names = [output.name for output in component.outputs]
    assert "meta_prompt" in output_names
    assert "variations" in output_names
    assert "test_cases" in output_names
    assert "best_prompt" in output_names
    
    # Check build method
    assert hasattr(component, "build_prompt")
    
    # Check API path is set
    assert component._API_PATH == "/api/v1/optimizer"
    
    # Check API helper method exists
    assert hasattr(component, "_make_api_call")

def test_optimizer_refresh_mechanism():
    """Test the refresh mechanism of the PromptOptimizerComponent."""
    component = PromptOptimizerComponent()
    
    # Initially all results should be None
    assert component._meta_prompt_result is None
    assert component._variations_result is None
    assert component._test_cases_result is None
    assert component._best_prompt_result is None
    
    # Test that force_refresh triggers cache clearing
    component._meta_prompt_result = Message(text="Test meta prompt")
    component._attributes = {"force_refresh": True}
    assert component._should_refresh() is True 