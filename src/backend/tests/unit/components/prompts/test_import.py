def test_import_optimizer():
    """Test that we can import PromptOptimizerComponent."""
    from langflow.components.prompts import PromptOptimizerComponent
    assert PromptOptimizerComponent.__name__ == "PromptOptimizerComponent" 