from pydantic import BaseModel
from typing import List, Optional, Dict, Any, Union
from datetime import datetime

# Model configuration
class ModelConfig(BaseModel):
    provider: str
    model: str
    temperature: float = 0.7
    max_tokens: int = 2048
    top_p: float = 1.0

# Meta Prompt
class CreateMetaPrompt(BaseModel):
    base_prompt: str
    meta_prompt: str
    llm_config: ModelConfig

class MetaPrompt(CreateMetaPrompt):
    id: int
    
# Prompt Variations
class CreatePromptVariation(BaseModel):
    meta_prompt_id: int
    content: str
    llm_config: ModelConfig

class PromptVariation(CreatePromptVariation):
    id: int

# Test Cases
class CreateTestCase(BaseModel):
    meta_prompt_id: int
    input: str
    llm_config: ModelConfig

class TestCase(CreateTestCase):
    id: int

# Evaluation Criteria
class CreateEvaluationCriterion(BaseModel):
    name: str
    description: str

class EvaluationCriterion(CreateEvaluationCriterion):
    id: int

# Evaluation Results
class CreateEvaluationResult(BaseModel):
    variation_id: int
    test_case_id: int
    criterion_id: int
    score: float
    response: str
    llm_config: ModelConfig

class EvaluationResult(CreateEvaluationResult):
    id: int
    created_at: datetime = datetime.now()

# Leaderboard
class LeaderboardEntry(BaseModel):
    variation_id: int
    content: str
    average_score: float
    scores: Dict[str, float]

# API Connection Testing
class TestConnectionRequest(BaseModel):
    provider: str
    model: str

class TestConnectionResponse(BaseModel):
    status: str
    message: str
    response: Optional[str] = None

# API Request/Response Models
class MetaPromptRequest(BaseModel):
    base_prompt: str
    llm_config: ModelConfig

class MetaPromptResponse(BaseModel):
    meta_prompt: str

class VariationsRequest(BaseModel):
    meta_prompt: str
    llm_config: ModelConfig

class VariationsResponse(BaseModel):
    variations: List[str]

class TestCasesRequest(BaseModel):
    meta_prompt: str
    llm_config: ModelConfig

class TestCasesResponse(BaseModel):
    test_cases: List[str]

class EvaluationRequest(BaseModel):
    response: str
    criterion: str
    llm_config: ModelConfig

class EvaluationResponse(BaseModel):
    score: float

# Add these new classes for agent evaluation
class AgentEvaluationRequest(BaseModel):
    system_prompt: str
    user_input: str
    criterion: Dict[str, Any]  # Using Dict with Any to allow flexible criterion structure
    llm_config: ModelConfig
    
    class Config:
        # Allow extra fields in case the frontend sends more data than we expect
        extra = "allow"

class AgentEvaluationResponse(BaseModel):
    score: float
    reasoning: str
    agent: str
    
    class Config:
        # Allow extra fields in case we want to add more data in the future
        extra = "allow" 