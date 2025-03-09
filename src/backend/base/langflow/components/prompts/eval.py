from langchain_core.tools import StructuredTool

from langflow.base.agents.agent import LCToolsAgentComponent
from langflow.base.models.model_input_constants import (
    ALL_PROVIDER_FIELDS,
    MODEL_DYNAMIC_UPDATE_FIELDS,
    MODEL_PROVIDERS_DICT,
)
from langflow.base.models.model_utils import get_model_name
from langflow.components.helpers import CurrentDateComponent
from langflow.components.helpers.memory import MemoryComponent
from langflow.components.langchain_utilities.tool_calling import ToolCallingAgentComponent
from langflow.custom.utils import update_component_build_config
from langflow.io import BoolInput, DropdownInput, Output
from langflow.logging import logger
from langflow.schema.dotdict import dotdict
from langflow.schema.message import Message


def set_advanced_true(component_input):
    component_input.advanced = True
    return component_input


class MetaComponent(ToolCallingAgentComponent):
    display_name: str = "Prompt Evaluator"
    description: str = "Define the agent's instructions, then enter a task to complete using tools."
    icon = "🏆"
    beta = True
    name = "Prompt Evaluator"

    memory_inputs = [set_advanced_true(component_input) for component_input in MemoryComponent().inputs]

    inputs = [
        DropdownInput(
            name="agent_llm",
            display_name="Model Provider",
            info="The provider of the language model that the agent will use to generate responses.",
            options=[*sorted(MODEL_PROVIDERS_DICT.keys()), "Custom"],
            value="OpenAI",
            real_time_refresh=True,
            input_types=[],
        ),
        *MODEL_PROVIDERS_DICT["OpenAI"]["inputs"],
        *LCToolsAgentComponent._base_inputs,
        *memory_inputs,
        BoolInput(
            name="add_current_date_tool",
            display_name="Current Date",
            advanced=True,
            info="If true, will add a tool to the agent that returns the current date.",
            value=True,
        ),
    ]
    
    outputs = [Output(name="response", display_name="Response", method="message_response")]

    async def message_response(self) -> Message:
        try:
            llm_model, display_name = self.get_llm()
            if llm_model is None:
                msg = "No language model selected"
                raise ValueError(msg)
            self.model_name = get_model_name(llm_model, display_name=display_name)
        except Exception as e:
            logger.error(f"Error retrieving language model: {e}")
            raise

        try:
            self.chat_history = await self.get_memory_data()
        except Exception as e:
            logger.error(f"Error retrieving chat history: {e}")
            raise

        if self.add_current_date_tool:
            try:
                if not isinstance(self.tools, list):  # type: ignore[has-type]
                    self.tools = []
                # Convert CurrentDateComponent to a StructuredTool
                current_date_tool = (await CurrentDateComponent().to_toolkit()).pop(0)
                if isinstance(current_date_tool, StructuredTool):
                    self.tools.append(current_date_tool)
                else:
                    msg = "CurrentDateComponent must be converted to a StructuredTool"
                    raise TypeError(msg)
            except Exception as e:
                logger.error(f"Error adding current date tool: {e}")
                raise

        if not self.tools:
            msg = "Tools are required to run the agent."
            logger.error(msg)
            raise ValueError(msg)

        # Hardcoded System Prompt
        system_prompt = (
            "You are a helpful assistant that takes in the test cases, and variational meta prompts,"
            "runs the test cases as user inputs against variational meta prompts as the system prompts."
            " and give the BEST system prompt as output. MAKE SURE YOU DONT TAMPER THE INPUT META PROMPTS."
            " AND GIVE ONLY THE BEST ONE AS THE OUTPUT."
        )

        try:
            self.set(
                llm=llm_model,
                tools=self.tools,
                chat_history=self.chat_history,
                input_value=self.input_value,
                system_prompt=system_prompt,  # Hardcoded prompt
            )
            agent = self.create_agent_runnable()
        except Exception as e:
            logger.error(f"Error setting up the agent: {e}")
            raise

        return await self.run_agent(agent)

    async def get_memory_data(self):
        memory_kwargs = {
            component_input.name: getattr(self, f"{component_input.name}") for component_input in self.memory_inputs
        }
        memory_kwargs = {k: v for k, v in memory_kwargs.items() if v}
        return await MemoryComponent().set(**memory_kwargs).retrieve_messages()

    def get_llm(self):
        if isinstance(self.agent_llm, str):
            try:
                provider_info = MODEL_PROVIDERS_DICT.get(self.agent_llm)
                if provider_info:
                    component_class = provider_info.get("component_class")
                    display_name = component_class.display_name
                    inputs = provider_info.get("inputs")
                    prefix = provider_info.get("prefix", "")
                    return (
                        self._build_llm_model(component_class, inputs, prefix),
                        display_name,
                    )
            except Exception as e:
                msg = f"Error building {self.agent_llm} language model"
                raise ValueError(msg) from e
        return self.agent_llm, None

    def _build_llm_model(self, component, inputs, prefix=""):
        model_kwargs = {input_.name: getattr(self, f"{prefix}{input_.name}") for input_ in inputs}
        return component.set(**model_kwargs).build_model()
