from crewai import Agent, Task, Crew, Process
from langchain.tools import Tool
from src.config import get_settings
import os
from duckduckgo_search import DDGS
from langchain_google_genai import ChatGoogleGenerativeAI
from src.tools.file_tools import analyze_file_wrapper

# Configure Gemini for CrewAI
settings = get_settings()
os.environ["GOOGLE_API_KEY"] = settings.GEMINI_API_KEY

# Instantiate LLM explicitly
llm = ChatGoogleGenerativeAI(
    model="gemini-flash-latest",
    verbose=True,
    temperature=0.5,
    google_api_key=settings.GEMINI_API_KEY
)

# Custom Tool Wrapper
def web_search(query: str):
    try:
        with DDGS() as ddgs:
            results = list(ddgs.text(query, max_results=3))
            return str(results)
    except Exception as e:
        return f"Search failed: {str(e)}"

# File Analysis Tool Wrapper for CrewAI
def analyze_file(file_id: str):
    import asyncio
    # CrewAI tools are synchronous, so we need to run the async wrapper here
    try:
        loop = asyncio.get_event_loop()
    except RuntimeError:
        loop = asyncio.new_event_loop()
        asyncio.set_event_loop(loop)
    
    if loop.is_running():
        # If loop is running (e.g. inside FastAPI), we might need to handle this differently
        # For now, let's assume this runs in a thread or separate process if needed, 
        # or use a sync version of the tool. 
        # Ideally, we should use async tools, but CrewAI support is mixed.
        # Let's try to run it.
        import nest_asyncio
        nest_asyncio.apply()
        return loop.run_until_complete(analyze_file_wrapper(file_id))
    else:
        return loop.run_until_complete(analyze_file_wrapper(file_id))

class MedicalCrew:
    def __init__(self, patient_id: str, history_str: str, transcript: str, attachment_ids: list[str] = [], extended_context: str = ""):
        self.patient_id = patient_id
        self.history_str = history_str
        self.transcript = transcript
        self.attachment_ids = attachment_ids
        self.extended_context = extended_context

    def run(self):
        # 1. Medical Researcher Agent
        # Responsible for gathering relevant medical info from history and web if needed.
        researcher = Agent(
            role='Medical Researcher',
            goal='Analyze patient history, chat transcript, and attached files (images, docs) to identify key symptoms and potential conditions.',
            backstory='You are an expert medical researcher. You verify patient history, analyze medical images/documents, and cross-reference symptoms with the latest medical literature.',
            verbose=True,
            allow_delegation=False,
            tools=[
                Tool(
                    name="Web Search",
                    func=web_search,
                    description="Search the web for medical conditions, symptoms, and treatments."
                ),
                Tool(
                    name="File Analysis",
                    func=analyze_file,
                    description="Analyze an attached file (Image, PDF, Excel) given its file_id. Use this to extract findings from X-rays, reports, or data sheets."
                )
            ],
            llm=llm
        )

        # 2. Medical Analyst Agent
        # Responsible for the actual diagnosis based on researcher's findings.
        analyst = Agent(
            role='Senior Diagnostician',
            goal='Formulate a comprehensive diagnosis based on the research findings. Identify primary hypothesis, differentials, and red flags.',
            backstory='You are a seasoned doctor with decades of experience. You are cautious, thorough, and always prioritize patient safety.',
            verbose=True,
            allow_delegation=False,
            llm=llm
        )

        # 3. Medical Scribe Agent
        # Responsible for formatting the report.
        scribe = Agent(
            role='Medical Scribe',
            goal='Compile the diagnosis and research into a structured medical report. Ensure all required sections (Symptoms, Diagnosis, Rationale, Web Info) are present.',
            backstory='You are a professional medical scribe. You ensure reports are clear, accurate, and follow the standard format.',
            verbose=True,
            allow_delegation=False,
            llm=llm
        )

        # Tasks
        files_info = f"Attached Files: {', '.join(self.attachment_ids)}" if self.attachment_ids else "No attached files."
        
        task_research = Task(
            description=f"""
            Analyze the following patient data:
            Patient History: {self.history_str}
            Extended Historical Context (Past Chats/Files): {self.extended_context}
            Chat Transcript: {self.transcript}
            {files_info}
            
            1. Extract all reported symptoms.
            2. Identify relevant medical history.
            3. **CRITICAL**: If there are attached files, use the 'File Analysis' tool to analyze EACH file_id. Incorporate findings (e.g., fracture in X-ray, high values in blood test PDF) into your summary.
            4. **Web Search Policy**: Do NOT use Web Search for common conditions or if you have sufficient internal knowledge. Only use it if the symptoms are extremely rare, complex, or if you need specific recent medical literature that you do not possess.
            5. Summarize the key findings, including any insights from the files and HISTORICAL CONTEXT. Explicitly mention if a finding comes from a past chat.
            """,
            agent=researcher,
            expected_output="A detailed summary of symptoms, relevant history, file analysis findings (if any), and web research."
        )

        task_diagnosis = Task(
            description="""
            Based on the research summary, formulate a diagnosis and treatment plan.
            1. Identify the Primary Hypothesis (most likely condition) with a confidence score (0-1).
            2. List Differential Diagnoses (other possibilities).
            3. Identify any Red Flags (urgent warnings).
            4. Explain the Rationale (why this diagnosis?).
            5. Determine Urgency. MUST be exactly ONE of these words: "Routine", "Urgent", "Emergency".
            6. Recommend a CURE / TREATMENT PLAN (medications, lifestyle changes, home remedies, when to see a doctor).
            """,
            agent=analyst,
            context=[task_research],
            expected_output="A structured diagnosis with primary hypothesis, differentials, red flags, rationale, urgency, and treatment plan."
        )

        task_report = Task(
            description="""
            Create an EXTREMELY DETAILED and COMPREHENSIVE medical report based on the diagnosis and research.
            
            The output MUST be a valid JSON object with the following structure:
            {
                "doctor_report": {
                    "patient_id": "...",
                    "chief_complaint": "...",
                    "history_of_present_illness": "...",
                    "pertinent_history": ["..."],
                    "assessment": {
                        "primary_diagnosis": {"name": "...", "confidence": 0.0},
                        "differentials": [{"name": "...", "confidence": 0.0}]
                    },
                    "red_flags": ["..."],
                    "urgency": "...",
                    "plan_recommendations": ["..."],
                    "treatment_plan": "...", 
                    "keywords": ["..."],
                    "llm_rationale": "...",
                    "analyzed_files": ["file_id or description..."]
                },
                "patient_summary": "...",
                "chat_title": "...",
                "keywords": ["..."]
            }
            
            CONTENT GUIDELINES:
            1. **Treatment Plan**: This is CRITICAL. Provide a detailed, step-by-step cure/treatment plan. Include medications (generic names), lifestyle changes, home remedies, and specific warning signs to watch for. DO NOT be vague.
            2. **Rationale**: Explain the diagnosis in depth. Connect the symptoms to the conclusion.
            3. **Web/File Info**: Explicitly mention if external data or FILE FINDINGS were used.
            4. **Completeness**: Do not summarize too much. The doctor needs ALL the details.
            5. **Chat Title**: A single line summarizing the problem (max 10 words). Example: "Persistent Headache with Nausea" or "Acute Lower Back Pain".
            6. **Urgency**: Ensure the urgency field in doctor_report is exactly ONE word: "Routine", "Urgent", or "Emergency".
            """,
            agent=scribe,
            context=[task_diagnosis, task_research],
            expected_output="A comprehensive JSON object containing the full medical report with detailed treatment plan."
        )

        crew = Crew(
            agents=[researcher, analyst, scribe],
            tasks=[task_research, task_diagnosis, task_report],
            verbose=True,
            process=Process.sequential
        )

        result = crew.kickoff()
        return result

