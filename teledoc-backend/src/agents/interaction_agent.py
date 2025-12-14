from src.agents.gemini_adapter import GeminiAdapter
import os

class InteractionAgent:
    def __init__(self):
        self.llm = GeminiAdapter()
        with open("src/agents/prompts/interaction_system.txt", "r") as f:
            self.template = f.read()

    def run(self, context: str, history: str, transcript: str) -> str:
        prompt = self.template.format(
            context=context,
            history=history,
            transcript=transcript
        )
        return self.llm.generate(prompt)
