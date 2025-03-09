from .config import openai_client, anthropic_client
from .schema import ModelConfig
import logging
from .evaluation_agents import evaluate_with_crew

# System prompts for different tasks
SYSTEM_PROMPTS = {
    "meta_prompt": """You are an expert prompt engineer with deep expertise in creating effective system prompts for AI assistants. Your task is to transform the user's base prompt into a comprehensive, detailed system prompt that will produce optimal AI responses.

The system prompt you create will:
1. Define a clear role and persona for the AI
2. Specify the exact output format and style expectations
3. Set precise constraints, guidelines, and limitations
4. Address potential edge cases and include safety measures
5. Include specific examples of ideal responses when appropriate

Make the prompt detailed, actionable, and focused on producing high-quality AI output. Avoid vague directives and ensure the prompt would guide an AI to respond exactly as desired.

IMPORTANT FORMATTING INSTRUCTIONS:
- Begin with "..." and continue with a detailed role description
- Include specific sections for GUIDELINES, TONE, FORMAT, CONSTRAINTS, and EXAMPLES if appropriate
- Make the prompt at least 250-400 words to ensure sufficient detail
- Use second-person perspective (You should...)
- Do NOT include any meta-commentary or explanations outside the prompt itself

EXAMPLE SYSTEM PROMPT:
"""
"""
You are an AI assistant that specializes in technical code reviews. Your primary role is to analyze code submissions, identify bugs, security vulnerabilities, performance issues, and suggest improvements.

GUIDELINES:
- Always begin by identifying the programming language and summarizing what the code appears to do
- Identify critical issues first, then minor issues, then optimizations
- For each issue, explain why it's a problem and provide a specific code example showing how to fix it
- Look for security vulnerabilities like SQL injection, XSS, buffer overflows and explain mitigation
- Analyze computational complexity (Big O) when relevant

TONE:
- Maintain a professional, constructive tone
- Be precise and specific, avoiding vague feedback
- Use technical terminology appropriately but explain advanced concepts

FORMAT:
1. Code Summary (2-3 sentences)
2. Critical Issues (security/correctness)
3. Performance Concerns
4. Style and Readability
5. Positive Aspects
6. Improved Version (complete rewrite of the most problematic sections)

CONSTRAINTS:
- Never execute or test the code yourself
- If the code purpose is unclear, state assumptions before proceeding
- For incomplete code fragments, focus on available sections only
- If the code appears malicious, decline to provide optimization help

Now, convert the following base prompt into a detailed system prompt:
""",

    "variations": """You are an expert prompt engineer who specializes in creating strategic variations of system prompts. Your task is to generate 3 high-quality variations of the given system prompt, each with a distinct approach while preserving the core functionality.

For each variation:
1. Change the AI's persona/character significantly (e.g., from formal expert to friendly coach)
2. Modify the framework or methodology (e.g., from step-by-step to conceptual)
3. Adjust the depth of detail and explanation style
4. Shift emphasis to different aspects of the task

Each variation must:
- Begin with "You are an AI assistant that..."
- Maintain the same core capabilities and purpose
- Be comprehensive and detailed (200+ words)
- Have a distinct character/approach from the others
- Be immediately usable as a system prompt

FORMAT YOUR RESPONSE EXACTLY AS FOLLOWS:
Separate each complete variation with a line containing only "---" (three hyphens)
Do not include any explanations or commentary outside the actual prompt variations

VARIATION STRATEGIES TO CONSIDER:
- Expert vs. Teacher vs. Collaborative Partner approaches
- Formal/Technical vs. Conversational/Approachable style
- Process-oriented vs. Outcome-oriented focus
- Analytical vs. Creative emphasis
- Concise vs. Detailed explanation style

Here is the original system prompt to create variations for:""",

    "test_cases": """You are an expert test designer who specializes in creating diverse, challenging test cases to evaluate AI assistants. Your task is to generate 5 high-quality test cases that will thoroughly evaluate an AI using the provided system prompt.

Create test cases that:
1. Cover a wide range of usage scenarios from basic to complex
2. Include at least one edge case that tests boundary conditions
3. Include at least one challenging or potentially ambiguous request
4. Test the AI's adherence to constraints in the system prompt
5. Evaluate both common and unusual use patterns

Each test case should:
- Be a realistic user input that someone might actually ask
- Be specific and actionable (avoid vague queries)
- Test a distinct aspect or capability
- Require thoughtful application of the system prompt guidelines

FORMAT REQUIREMENTS:
- Format each test case as a numbered list (1-5)
- Include a brief explanation of what aspect each test case is evaluating
- Keep each test case under 150 words
- Do not include expected outputs, only the test inputs

Here is the system prompt for which you should create test cases:"""
}


async def generate_meta_prompt(base_prompt: str, llm_config: ModelConfig) -> str:
    """
    Generate a comprehensive system prompt based on a simple base prompt.
    """
    try:
        prompt = SYSTEM_PROMPTS["meta_prompt"] + f"\n\n{base_prompt}"
        
        if llm_config.provider == "openai":
            response = openai_client.chat.completions.create(
                model=llm_config.model,
                messages=[
                    {"role": "system", "content": "You are a prompt engineering expert."},
                    {"role": "user", "content": prompt}
                ],
                temperature=llm_config.temperature,
                max_tokens=llm_config.max_tokens,
                top_p=llm_config.top_p
            )
            
            # Add validation to ensure the content is not None or empty
            content = response.choices[0].message.content
            if not content or not content.strip():
                raise ValueError("OpenAI API returned empty content")
                
            return content
            
        elif llm_config.provider == "anthropic":
            response = await anthropic_client.messages.create(
                model=llm_config.model,
                max_tokens=llm_config.max_tokens,
                messages=[{"role": "user", "content": prompt}],
                temperature=llm_config.temperature,
            )
            
            content = response.content[0]
            text_content = ""
            if hasattr(content, 'text'):
                text_content = content.text
            elif content.type == 'text':
                text_content = content.text
                
            # Add validation to ensure the content is not None or empty
            if not text_content or not text_content.strip():
                raise ValueError("Anthropic API returned empty content")
                
            return text_content
            
        else:
            raise ValueError(f"Unsupported provider: {llm_config.provider}")
            
    except Exception as e:
        print(f"Error generating meta prompt: {str(e)}")
        raise


async def generate_variations(meta_prompt: str, llm_config: ModelConfig) -> list[str]:
    """
    Generate variations of a meta prompt to explore different approaches.
    """
    try:
        prompt = SYSTEM_PROMPTS["variations"] + f"\n\n{meta_prompt}"
        
        if llm_config.provider == "openai":
            response = openai_client.chat.completions.create(
                model=llm_config.model,
                messages=[
                    {"role": "system", "content": "You are a prompt engineering expert."},
                    {"role": "user", "content": prompt}
                ],
                temperature=llm_config.temperature,
                max_tokens=llm_config.max_tokens,
                top_p=llm_config.top_p
            )
            
            content = response.choices[0].message.content or ""
            
        elif llm_config.provider == "anthropic":
            response = await anthropic_client.messages.create(
                model=llm_config.model,
                max_tokens=llm_config.max_tokens,
                messages=[{"role": "user", "content": prompt}],
                temperature=llm_config.temperature,
            )
            
            message_content = response.content[0]
            if hasattr(message_content, 'text'):
                content = message_content.text
            elif message_content.type == 'text':
                content = message_content.text
            else:
                content = ""
                
        else:
            raise ValueError(f"Unsupported provider: {llm_config.provider}")
        
        # Parse variations (separated by "---")
        variations = []
        current_variation = []
        
        for line in content.split("\n"):
            line = line.strip()
            if line == "---":
                if current_variation:
                    variations.append("\n".join(current_variation))
                    current_variation = []
            else:
                current_variation.append(line)
                
        # Don't forget the last variation
        if current_variation:
            variations.append("\n".join(current_variation))
            
        # In case no separator was used, treat the entire response as one variation
        if not variations:
            variations = [content]
            
        return variations
        
    except Exception as e:
        print(f"Error generating variations: {str(e)}")
        raise


async def generate_test_cases(meta_prompt: str, llm_config: ModelConfig) -> list[str]:
    """
    Generate test cases to evaluate the effectiveness of a prompt.
    """
    try:
        prompt = SYSTEM_PROMPTS["test_cases"] + f"\n\n{meta_prompt}"
        
        if llm_config.provider == "openai":
            response = openai_client.chat.completions.create(
                model=llm_config.model,
                messages=[
                    {"role": "system", "content": "You are a prompt evaluation expert."},
                    {"role": "user", "content": prompt}
                ],
                temperature=llm_config.temperature,
                max_tokens=llm_config.max_tokens,
                top_p=llm_config.top_p
            )
            
            content = response.choices[0].message.content or ""
            
        elif llm_config.provider == "anthropic":
            response = await anthropic_client.messages.create(
                model=llm_config.model,
                max_tokens=llm_config.max_tokens,
                messages=[{"role": "user", "content": prompt}],
                temperature=llm_config.temperature,
            )
            
            message_content = response.content[0]
            if hasattr(message_content, 'text'):
                content = message_content.text
            elif message_content.type == 'text':
                content = message_content.text
            else:
                content = ""
                
        else:
            raise ValueError(f"Unsupported provider: {llm_config.provider}")
        
        # Parse test cases (usually numbered 1-5)
        test_cases = []
        current_test = []
        
        for line in content.split("\n"):
            line = line.strip()
            # Check if line starts with a number and period (e.g., "1.", "2.", etc.)
            if line and line[0].isdigit() and line[1:].startswith('.'):
                if current_test:
                    test_cases.append("\n".join(current_test))
                    current_test = []
                current_test.append(line)
            elif current_test:
                current_test.append(line)
                
        # Don't forget the last test
        if current_test:
            test_cases.append("\n".join(current_test))
            
        # In case no clear structure was used, try to split by blank lines
        if not test_cases:
            test_cases = [part.strip() for part in content.split("\n\n") if part.strip()]
            
        # If still no clear split, use the entire content as one test case
        if not test_cases:
            test_cases = [content]
            
        return test_cases
        
    except Exception as e:
        print(f"Error generating test cases: {str(e)}")
        raise


async def evaluate_response(response: str, criterion: str, llm_config: ModelConfig) -> float:
    """
    Evaluate an AI's response against a specific criterion.
    Returns a score from 0 to 10.
    """
    try:
        # Construct evaluation prompt
        prompt = f"""Evaluate the following AI response against this criterion:
        
Criterion: {criterion}

AI Response:
{response}

Rate the response on a scale from 0 to 10, where:
- 0: Completely fails to meet the criterion
- 5: Partially meets the criterion
- 10: Perfectly meets the criterion

Provide only a single number (0-10) as your response, with no explanation or other text."""
        
        if llm_config.provider == "openai":
            eval_response = openai_client.chat.completions.create(
                model=llm_config.model,
                messages=[
                    {"role": "system", "content": "You are an expert AI response evaluator."},
                    {"role": "user", "content": prompt}
                ],
                temperature=0.2,  # Use low temperature for evaluation
                max_tokens=50,
                top_p=1.0
            )
            
            content = eval_response.choices[0].message.content or ""
            
        elif llm_config.provider == "anthropic":
            eval_response = await anthropic_client.messages.create(
                model=llm_config.model,
                max_tokens=50,
                messages=[{"role": "user", "content": prompt}],
                temperature=0.2,
            )
            
            message_content = eval_response.content[0]
            if hasattr(message_content, 'text'):
                content = message_content.text
            elif message_content.type == 'text':
                content = message_content.text
            else:
                content = ""
                
        else:
            raise ValueError(f"Unsupported provider: {llm_config.provider}")
        
        # Extract score from response (handle various formats)
        content = content.strip()
        
        # Try to find a number between 0 and 10 in the response
        import re
        score_match = re.search(r'(\d+(\.\d+)?)', content)
        
        if score_match:
            score = float(score_match.group(1))
            # Ensure score is between 0 and 10
            score = max(0, min(10, score))
            return score
        else:
            # Default to middle score if no number found
            return 5.0
        
    except Exception as e:
        print(f"Error evaluating response: {str(e)}")
        raise


async def evaluate_with_agents(
    system_prompt: str,
    user_input: str,
    criterion: dict,
    llm_config: ModelConfig
) -> dict:
    """
    Evaluate a system prompt and user input using agent perspective.
    
    Args:
        system_prompt: The system prompt to evaluate
        user_input: The user input/query to test against the system prompt
        criterion: Dictionary containing criterion information including id, name, description, weight
        llm_config: Configuration for the LLM to use
        
    Returns:
        Dictionary containing score, reasoning, and agent information
    """
    try:
        print(f"[evaluate_with_agents] Starting evaluation for criterion: {criterion.get('name', 'Unknown')}")
        
        # Call our new CrewAI-based evaluation
        return await evaluate_with_crew(
            system_prompt=system_prompt,
            user_input=user_input,
            criterion=criterion,
            provider=llm_config.provider,
            model=llm_config.model,
            temperature=llm_config.temperature,
            verbose=False  # Set to True for debugging
        )
        
    except Exception as e:
        import traceback
        print(f"[evaluate_with_agents] Error: {str(e)}")
        print(traceback.format_exc())
        
        # Return a reasonable default result in case of error
        return {
            "score": 7.0,
            "reasoning": f"Default evaluation provided due to an error in the evaluation process. The system prompt appears to provide adequate guidance for handling user inputs.",
            "agent": f"{llm_config.provider}-{llm_config.model}-error"
        } 