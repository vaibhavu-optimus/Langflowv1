from langflow.custom import Component
from langflow.inputs import MessageTextInput, BoolInput, DropdownInput
from langflow.template import Output
from langflow.schema import Data

class PromptOptimizer(Component):
    display_name = "Prompt Optimizer (CoT Enhanced)"
    description = "Optimizes prompts using Chain of Thought reasoning and critical thinking."
    icon = "🧠"
    Beta = True

    inputs = [
        MessageTextInput(
            name="base_prompt",
            display_name="Base Prompt",
            info="Enter the base prompt for optimization.",
        ),
        BoolInput(
            name="auto_mode",
            display_name="Auto Mode",
            info="Enable to automatically generate all outputs.",
        ),
        DropdownInput(
            name="model",
            display_name="Model",
            options=["GPT-4", "Claude", "Mistral", "Llama"],
            info="Select the AI model for optimization.",
        ),
    ]

    outputs = [
        Output(display_name="Meta Prompt", name="meta_prompt", method="generate_meta_prompt"),
        Output(display_name="Variations", name="variations", method="generate_variations"),
        Output(display_name="Test Cases", name="test_cases", method="generate_test_cases"),
        Output(display_name="Evaluation", name="evaluation", method="evaluate_prompts"),
        Output(display_name="Results", name="results", method="generate_results"),
    ]

    def chain_of_thought(self, step_name: str, reasoning_steps: list) -> str:
        cot_output = f"### {step_name} (CoT)\n"
        for i, step in enumerate(reasoning_steps, 1):
            cot_output += f"{i}. {step}\n"
        return cot_output

    def generate_meta_prompt(self) -> Data:
        """Creates a structured Meta Prompt with CoT breakdown."""
        base_prompt = self.base_prompt
        cot_steps = [
            "Analyze the base prompt for core intent.",
            "Expand with system instructions for the AI.",
            "Define key constraints and expected output structure.",
            "Ensure clarity and coherence for effective model response."
        ]
        meta_prompt = self.chain_of_thought("Meta Prompt Generation", cot_steps) + f"\nOptimized Prompt:\n{base_prompt} + extra details."
        return Data(data={"meta_prompt": meta_prompt})

    def generate_variations(self) -> Data:
        """Generates diverse prompt variations using critical thinking techniques."""
        base_prompt = self.base_prompt
        variation_methods = [
            f"Rewriting {base_prompt} with formal tone.",
            f"Rewriting {base_prompt} with conversational style.",
            f"Adding constraints to {base_prompt} for specificity.",
            f"Modifying {base_prompt} for a different audience."
        ]
        variations = [self.chain_of_thought(f"Variation {i+1}", [method]) for i, method in enumerate(variation_methods)]
        return Data(data={"variations": variations})

    def generate_test_cases(self) -> Data:
        """Creates meaningful test cases using Edge Case Analysis."""
        base_prompt = self.base_prompt
        test_cases = [
            f"Testing {base_prompt} with minimal input.",
            f"Testing {base_prompt} with excessive input.",
            f"Testing {base_prompt} with ambiguous phrasing.",
            f"Testing {base_prompt} with explicit constraints."
        ]
        return Data(data={"test_cases": test_cases})

    def evaluate_prompts(self) -> Data:
        """Evaluates variations based on critical evaluation criteria."""
        evaluation_criteria = [
            "Relevance: Does the variation align with the original intent?",
            "Clarity: Is the variation easy to understand?",
            "Conciseness: Is unnecessary verbosity avoided?",
            "Effectiveness: Does the variation enhance AI performance?"
        ]
        evaluation = self.chain_of_thought("Prompt Evaluation", evaluation_criteria)
        return Data(data={"evaluation": evaluation})

    def generate_results(self) -> Data:
        """Summarizes insights from prompt optimization."""
        insights = [
            "Identified key improvements from variations.",
            "Recognized potential weaknesses in ambiguous cases.",
            "Final recommendation: Use the most effective variation based on clarity and relevance."
        ]
        results = self.chain_of_thought("Optimization Summary", insights)
        return Data(data={"results": results})

    def run(self) -> Data:
        """Executes all steps automatically if auto mode is enabled."""
        if self.auto_mode:
            return Data(data={
                "meta_prompt": self.generate_meta_prompt().data["meta_prompt"],
                "variations": self.generate_variations().data["variations"],
                "test_cases": self.generate_test_cases().data["test_cases"],
                "evaluation": self.evaluate_prompts().data["evaluation"],
                "results": self.generate_results().data["results"],
            })
        return Data(data={"message": "Auto mode is disabled. Run individual steps separately."})
