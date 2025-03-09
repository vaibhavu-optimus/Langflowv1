import sys
import os

def test_python_path():
    """Print Python path and check for the optimizer module."""
    print("Python path:")
    for path in sys.path:
        print(f"  - {path}")
    
    base_dir = os.path.abspath(os.path.join(os.path.dirname(__file__), "../../../../.."))
    print(f"Base directory: {base_dir}")
    
    # Check if the module exists directly
    optimizer_path = os.path.join(base_dir, "src/backend/base/langflow/components/prompts/optimizer.py")
    assert os.path.exists(optimizer_path), f"Optimizer module not found at {optimizer_path}"
    print(f"Optimizer module exists at {optimizer_path}")
    
    # Try to import directly with absolute import
    import importlib.util
    spec = importlib.util.spec_from_file_location("optimizer", optimizer_path)
    optimizer = importlib.util.module_from_spec(spec)
    spec.loader.exec_module(optimizer)
    print(f"Successfully imported optimizer module with class: {optimizer.PromptOptimizerComponent.__name__}")
    
    assert hasattr(optimizer, "PromptOptimizerComponent"), "Module doesn't have PromptOptimizerComponent" 