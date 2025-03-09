from abc import ABC, abstractmethod
from typing import List, Dict, Optional, Any, Union
from datetime import datetime
from .schema import (
    MetaPrompt, CreateMetaPrompt,
    PromptVariation, CreatePromptVariation,
    TestCase, CreateTestCase,
    EvaluationCriterion, CreateEvaluationCriterion,
    EvaluationResult, CreateEvaluationResult,
    LeaderboardEntry
)

class IStorage(ABC):
    # Meta Prompts
    @abstractmethod
    async def create_meta_prompt(self, data: CreateMetaPrompt) -> MetaPrompt:
        pass
    
    @abstractmethod
    async def get_meta_prompt(self, id: int) -> Optional[MetaPrompt]:
        pass
    
    @abstractmethod
    async def get_all_meta_prompts(self) -> List[MetaPrompt]:
        pass
    
    # Variations
    @abstractmethod
    async def create_variation(self, data: CreatePromptVariation) -> PromptVariation:
        pass
    
    @abstractmethod
    async def get_variation(self, id: int) -> Optional[PromptVariation]:
        pass
    
    @abstractmethod
    async def get_variations_for_meta_prompt(self, meta_prompt_id: int) -> List[PromptVariation]:
        pass
    
    @abstractmethod
    async def update_variation(self, id: int, content: str) -> PromptVariation:
        pass
    
    @abstractmethod
    async def delete_variation(self, id: int) -> None:
        pass
    
    # Test Cases
    @abstractmethod
    async def create_test_case(self, data: CreateTestCase) -> TestCase:
        pass
    
    @abstractmethod
    async def get_test_case(self, id: int) -> Optional[TestCase]:
        pass
    
    @abstractmethod
    async def get_test_cases_for_meta_prompt(self, meta_prompt_id: int) -> List[TestCase]:
        pass
    
    @abstractmethod
    async def update_test_case(self, id: int, input: str) -> TestCase:
        pass
    
    @abstractmethod
    async def delete_test_case(self, id: int) -> None:
        pass
    
    # Evaluation Criteria
    @abstractmethod
    async def create_criterion(self, data: CreateEvaluationCriterion) -> EvaluationCriterion:
        pass
    
    @abstractmethod
    async def get_criterion(self, id: int) -> Optional[EvaluationCriterion]:
        pass
    
    @abstractmethod
    async def get_all_criteria(self) -> List[EvaluationCriterion]:
        pass
    
    @abstractmethod
    async def update_criterion(self, id: int, data: Dict[str, Any]) -> EvaluationCriterion:
        pass
    
    @abstractmethod
    async def delete_criterion(self, id: int) -> None:
        pass
    
    # Evaluation Results
    @abstractmethod
    async def create_evaluation_result(self, data: CreateEvaluationResult) -> EvaluationResult:
        pass
    
    @abstractmethod
    async def get_evaluation_result(self, id: int) -> Optional[EvaluationResult]:
        pass
    
    @abstractmethod
    async def get_results_for_variation(self, variation_id: int) -> List[EvaluationResult]:
        pass
    
    @abstractmethod
    async def get_results_for_test_case(self, test_case_id: int) -> List[EvaluationResult]:
        pass
    
    # Leaderboard
    @abstractmethod
    async def get_leaderboard(self, meta_prompt_id: int) -> List[LeaderboardEntry]:
        pass


class MemStorage(IStorage):
    def __init__(self):
        self.meta_prompts: Dict[int, MetaPrompt] = {}
        self.variations: Dict[int, PromptVariation] = {}
        self.test_cases: Dict[int, TestCase] = {}
        self.criteria: Dict[int, EvaluationCriterion] = {}
        self.results: Dict[int, EvaluationResult] = {}
        self.current_ids = {
            "meta_prompt": 1,
            "variation": 1,
            "test_case": 1,
            "criterion": 1,
            "result": 1,
        }

    # Meta Prompts
    async def create_meta_prompt(self, data: CreateMetaPrompt) -> MetaPrompt:
        id = self.current_ids["meta_prompt"]
        self.current_ids["meta_prompt"] += 1
        
        # Support both Pydantic v1 and v2
        try:
            # Try Pydantic v2 method first
            data_dict = data.model_dump()
        except AttributeError:
            try:
                # Fall back to Pydantic v1 method
                data_dict = data.dict()
            except Exception as e:
                # Last resort fallback - manually convert to dict
                print(f"Warning: Pydantic serialization failed: {e}")
                data_dict = {
                    "base_prompt": getattr(data, "base_prompt", ""),
                    "meta_prompt": getattr(data, "meta_prompt", ""),
                    "llm_config": getattr(data, "llm_config", {})
                }
                
        meta_prompt = MetaPrompt(id=id, **data_dict)
        self.meta_prompts[id] = meta_prompt
        return meta_prompt

    async def get_meta_prompt(self, id: int) -> Optional[MetaPrompt]:
        return self.meta_prompts.get(id)

    async def get_all_meta_prompts(self) -> List[MetaPrompt]:
        return list(self.meta_prompts.values())

    # Variations
    async def create_variation(self, data: CreatePromptVariation) -> PromptVariation:
        id = self.current_ids["variation"]
        self.current_ids["variation"] += 1
        
        # Support both Pydantic v1 and v2
        try:
            # Try Pydantic v2 method first
            data_dict = data.model_dump()
        except AttributeError:
            try:
                # Fall back to Pydantic v1 method
                data_dict = data.dict()
            except Exception as e:
                # Last resort fallback - manually convert to dict
                print(f"Warning: Pydantic serialization failed: {e}")
                data_dict = {
                    "meta_prompt_id": getattr(data, "meta_prompt_id", 0),
                    "content": getattr(data, "content", ""),
                    "llm_config": getattr(data, "llm_config", {})
                }
                
        variation = PromptVariation(id=id, **data_dict)
        self.variations[id] = variation
        return variation

    async def get_variation(self, id: int) -> Optional[PromptVariation]:
        return self.variations.get(id)

    async def get_variations_for_meta_prompt(self, meta_prompt_id: int) -> List[PromptVariation]:
        return [v for v in self.variations.values() if v.meta_prompt_id == meta_prompt_id]

    async def update_variation(self, id: int, content: str) -> PromptVariation:
        variation = self.variations.get(id)
        if not variation:
            raise ValueError(f"Variation with id {id} not found")
        
        updated_variation = PromptVariation(
            id=variation.id,
            meta_prompt_id=variation.meta_prompt_id,
            content=content,
            llm_config=variation.llm_config
        )
        self.variations[id] = updated_variation
        return updated_variation

    async def delete_variation(self, id: int) -> None:
        if id in self.variations:
            del self.variations[id]

    # Test Cases
    async def create_test_case(self, data: CreateTestCase) -> TestCase:
        id = self.current_ids["test_case"]
        self.current_ids["test_case"] += 1
        
        # Support both Pydantic v1 and v2
        try:
            # Try Pydantic v2 method first
            data_dict = data.model_dump()
        except AttributeError:
            try:
                # Fall back to Pydantic v1 method
                data_dict = data.dict()
            except Exception as e:
                # Last resort fallback - manually convert to dict
                print(f"Warning: Pydantic serialization failed: {e}")
                data_dict = {
                    "meta_prompt_id": getattr(data, "meta_prompt_id", 0),
                    "input": getattr(data, "input", ""),
                    "llm_config": getattr(data, "llm_config", {})
                }
                
        test_case = TestCase(id=id, **data_dict)
        self.test_cases[id] = test_case
        return test_case

    async def get_test_case(self, id: int) -> Optional[TestCase]:
        return self.test_cases.get(id)

    async def get_test_cases_for_meta_prompt(self, meta_prompt_id: int) -> List[TestCase]:
        return [tc for tc in self.test_cases.values() if tc.meta_prompt_id == meta_prompt_id]

    async def update_test_case(self, id: int, input: str) -> TestCase:
        test_case = self.test_cases.get(id)
        if not test_case:
            raise ValueError(f"Test case with id {id} not found")
        
        updated_test_case = TestCase(
            id=test_case.id,
            meta_prompt_id=test_case.meta_prompt_id,
            input=input,
            llm_config=test_case.llm_config
        )
        self.test_cases[id] = updated_test_case
        return updated_test_case

    async def delete_test_case(self, id: int) -> None:
        if id in self.test_cases:
            del self.test_cases[id]

    # Evaluation Criteria
    async def create_criterion(self, data: CreateEvaluationCriterion) -> EvaluationCriterion:
        id = self.current_ids["criterion"]
        self.current_ids["criterion"] += 1
        
        # Support both Pydantic v1 and v2
        try:
            # Try Pydantic v2 method first
            data_dict = data.model_dump()
        except AttributeError:
            try:
                # Fall back to Pydantic v1 method
                data_dict = data.dict()
            except Exception as e:
                # Last resort fallback - manually convert to dict
                print(f"Warning: Pydantic serialization failed: {e}")
                data_dict = {
                    "name": getattr(data, "name", ""),
                    "description": getattr(data, "description", "")
                }
                
        criterion = EvaluationCriterion(id=id, **data_dict)
        self.criteria[id] = criterion
        return criterion

    async def get_criterion(self, id: int) -> Optional[EvaluationCriterion]:
        return self.criteria.get(id)

    async def get_all_criteria(self) -> List[EvaluationCriterion]:
        return list(self.criteria.values())

    async def update_criterion(self, id: int, data: Dict[str, Any]) -> EvaluationCriterion:
        criterion = self.criteria.get(id)
        if not criterion:
            raise ValueError(f"Criterion with id {id} not found")
        
        updated_criterion = EvaluationCriterion(
            id=criterion.id,
            name=data.get("name", criterion.name),
            description=data.get("description", criterion.description)
        )
        self.criteria[id] = updated_criterion
        return updated_criterion

    async def delete_criterion(self, id: int) -> None:
        if id in self.criteria:
            del self.criteria[id]

    # Evaluation Results
    async def create_evaluation_result(self, data: CreateEvaluationResult) -> EvaluationResult:
        id = self.current_ids["result"]
        self.current_ids["result"] += 1
        
        # Support both Pydantic v1 and v2
        try:
            # Try Pydantic v2 method first
            data_dict = data.model_dump()
        except AttributeError:
            try:
                # Fall back to Pydantic v1 method
                data_dict = data.dict()
            except Exception as e:
                # Last resort fallback - manually convert to dict
                print(f"Warning: Pydantic serialization failed: {e}")
                data_dict = {
                    "variation_id": getattr(data, "variation_id", 0),
                    "test_case_id": getattr(data, "test_case_id", 0),
                    "criterion_id": getattr(data, "criterion_id", 0),
                    "score": getattr(data, "score", 0.0),
                    "response": getattr(data, "response", ""),
                    "llm_config": getattr(data, "llm_config", {})
                }
                
        result = EvaluationResult(
            id=id,
            created_at=datetime.now(),
            **data_dict
        )
        self.results[id] = result
        return result

    async def get_evaluation_result(self, id: int) -> Optional[EvaluationResult]:
        return self.results.get(id)

    async def get_results_for_variation(self, variation_id: int) -> List[EvaluationResult]:
        return [r for r in self.results.values() if r.variation_id == variation_id]

    async def get_results_for_test_case(self, test_case_id: int) -> List[EvaluationResult]:
        return [r for r in self.results.values() if r.test_case_id == test_case_id]

    # Leaderboard
    async def get_leaderboard(self, meta_prompt_id: int) -> List[LeaderboardEntry]:
        # Get all variations for this meta prompt
        variations = await self.get_variations_for_meta_prompt(meta_prompt_id)
        
        # Initialize leaderboard entries
        leaderboard: List[LeaderboardEntry] = []
        
        # For each variation, calculate average score
        for variation in variations:
            # Get all results for this variation
            results = await self.get_results_for_variation(variation.id)
            
            if not results:
                continue
                
            # Group results by criterion
            criterion_scores: Dict[str, List[float]] = {}
            for result in results:
                criterion = await self.get_criterion(result.criterion_id)
                if criterion:
                    criterion_name = criterion.name
                    if criterion_name not in criterion_scores:
                        criterion_scores[criterion_name] = []
                    criterion_scores[criterion_name].append(result.score)
            
            # Calculate average score for each criterion
            scores: Dict[str, float] = {}
            for criterion_name, scores_list in criterion_scores.items():
                scores[criterion_name] = sum(scores_list) / len(scores_list)
            
            # Calculate overall average score
            all_scores = [score for scores_list in criterion_scores.values() for score in scores_list]
            average_score = sum(all_scores) / len(all_scores) if all_scores else 0
            
            # Create leaderboard entry
            entry = LeaderboardEntry(
                variation_id=variation.id,
                content=variation.content,
                average_score=average_score,
                scores=scores
            )
            leaderboard.append(entry)
        
        # Sort leaderboard by average score (descending)
        leaderboard.sort(key=lambda entry: entry.average_score, reverse=True)
        
        return leaderboard


# Create a global instance
storage = MemStorage() 