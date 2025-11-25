"""
Document Agent Prompt Templates

Reusable prompt components for document analysis.
Optimized for Gemini Pro multimodal capabilities.
"""

from typing import Dict, List, Optional

# Base document analysis prompt
DOCUMENT_ANALYSIS_PROMPT = """You are a document analysis specialist for SYNAPSE.

**Your Role:**
- Analyze documents thoroughly and extract key information
- Answer questions accurately based on document content
- Generate study materials from documents
- Identify important concepts and relationships

**Analysis Approach:**
1. Understand the document's purpose and structure
2. Extract key concepts, definitions, and facts
3. Identify relationships between ideas
4. Structure information logically
5. Generate educational materials
"""

# Document type-specific prompts
DOCUMENT_TYPE_PROMPTS = {
    "textbook": """
**Textbook Analysis Guidelines:**
- Identify learning objectives from chapter
- Extract key terms and definitions
- Note formulas, theorems, or principles
- Map chapter structure and flow
- Identify practice problems and solutions
- Extract diagrams and their explanations
- Note summary sections and review questions
""",

    "research_paper": """
**Research Paper Analysis Guidelines:**
- Extract research question and hypothesis
- Summarize methodology
- Identify key findings and results
- Note limitations and caveats
- Extract implications and future work
- Identify references to key papers
- Assess statistical significance
""",

    "study_guide": """
**Study Guide Analysis Guidelines:**
- Extract all key concepts
- Identify topics by priority
- Note recommended study approaches
- Extract practice questions
- Identify prerequisite knowledge
- Map concept dependencies
""",

    "lecture_notes": """
**Lecture Notes Analysis Guidelines:**
- Identify main topics covered
- Extract key points from each section
- Note examples and case studies
- Identify unclear or incomplete sections
- Extract questions raised
- Note references to readings
""",
}

# Analysis depth levels
ANALYSIS_DEPTH_LEVELS = {
    "quick_summary": """
Provide a brief summary (2-3 paragraphs):
- Main topic and purpose
- Key takeaways (3-5 points)
- Relevance to learning goals
""",

    "detailed_analysis": """
Provide a comprehensive analysis:
- Executive summary
- Detailed breakdown of all sections
- Key concepts with definitions
- Important facts and figures
- Relationships between concepts
- Study material suggestions
""",

    "concept_extraction": """
Extract all educational concepts:
- List every important term with definition
- Identify all principles and rules
- Extract formulas and equations
- Note examples and applications
- Map concept relationships
- Rate importance (critical/important/supporting)
""",
}

# Question answering strategies
QA_STRATEGIES = {
    "direct_answer": """
Answer the question directly and concisely:
1. State the answer clearly
2. Provide supporting evidence from document
3. Cite specific page/section numbers
4. Offer to elaborate if needed
""",

    "explanatory_answer": """
Provide a detailed explanatory answer:
1. State the answer
2. Explain the reasoning
3. Provide context from document
4. Connect to related concepts
5. Cite specific sources
6. Suggest follow-up questions
""",

    "comparative_answer": """
Compare multiple perspectives or approaches:
1. Present different viewpoints from document
2. Explain similarities and differences
3. Note advantages/disadvantages
4. Provide synthesis or recommendation
5. Cite all relevant sections
""",
}


def get_document_prompt_with_context(
    document_info: Dict,
    query: Optional[str] = None,
    analysis_type: str = "detailed_analysis"
) -> str:
    """
    Build document analysis prompt with context

    Args:
        document_info: Document metadata
        query: Optional user query
        analysis_type: Type of analysis needed

    Returns:
        Complete document analysis prompt
    """
    doc_title = document_info.get('title', 'Unknown Document')
    doc_type = document_info.get('type', 'unknown')
    doc_pages = document_info.get('pages', 'unknown')
    doc_subject = document_info.get('subject', 'unknown')

    prompt = DOCUMENT_ANALYSIS_PROMPT + "\n\n"

    # Add document context
    prompt += f"""**Current Document:**
- Title: {doc_title}
- Type: {doc_type}
- Pages: {doc_pages}
- Subject: {doc_subject}
"""

    # Add type-specific guidelines
    type_prompt = DOCUMENT_TYPE_PROMPTS.get(doc_type)
    if type_prompt:
        prompt += "\n" + type_prompt + "\n"

    # Add analysis depth instructions
    depth_prompt = ANALYSIS_DEPTH_LEVELS.get(
        analysis_type,
        ANALYSIS_DEPTH_LEVELS["detailed_analysis"]
    )
    prompt += "\n**Analysis Instructions:**\n" + depth_prompt + "\n"

    # Add query if provided
    if query:
        prompt += f"\n**User Query:** {query}\n"
        prompt += "\nAddress this specific query while providing comprehensive context.\n"

    return prompt


def get_multimodal_analysis_prompt(
    has_images: bool = False,
    has_tables: bool = False,
    has_equations: bool = False
) -> str:
    """
    Build prompt for multimodal document analysis

    Args:
        has_images: Document contains images/diagrams
        has_tables: Document contains tables
        has_equations: Document contains equations

    Returns:
        Multimodal analysis prompt
    """
    prompt = "**Multimodal Analysis:**\n\n"

    if has_images:
        prompt += """**Image/Diagram Analysis:**
- Describe visual content in detail
- Explain what the image illustrates
- Connect images to text content
- Extract labels and captions
- Note educational value
- Suggest how to study from visuals

"""

    if has_tables:
        prompt += """**Table Analysis:**
- Extract all data from tables
- Identify trends and patterns
- Note column headers and units
- Calculate key statistics
- Explain table's purpose
- Create summary statements

"""

    if has_equations:
        prompt += """**Equation Analysis:**
- Transcribe equations accurately
- Explain variable meanings
- Describe what equation calculates
- Provide example calculations
- Note conditions/constraints
- Explain practical applications

"""

    return prompt


def get_study_material_generation_prompt(
    material_type: str,
    concept_list: List[str]
) -> str:
    """
    Build prompt for generating study materials

    Args:
        material_type: flashcards/quiz/summary/notes
        concept_list: List of concepts to cover

    Returns:
        Material generation prompt
    """
    concepts_str = "\n".join(f"- {concept}" for concept in concept_list)

    prompts = {
        "flashcards": f"""
Generate flashcards for these concepts:
{concepts_str}

For each concept create:
- Front: Clear question or term
- Back: Concise, accurate answer
- Example: Concrete example
- Mnemonic: Memory aid (if helpful)
""",

        "quiz": f"""
Generate quiz questions covering:
{concepts_str}

Create diverse question types:
- Multiple choice (with plausible distractors)
- True/false (with explanations)
- Short answer (testing deep understanding)

For each question provide:
- Clear question text
- Correct answer
- Detailed explanation
- Difficulty level
- Relevant page reference
""",

        "summary": f"""
Create a structured summary covering:
{concepts_str}

Summary should include:
- Overview paragraph
- Key points for each concept
- Important definitions
- Critical relationships
- Examples and applications
- Practice suggestions
""",

        "notes": f"""
Generate comprehensive study notes for:
{concepts_str}

Notes should include:
- Hierarchical structure
- Clear headings and subheadings
- Bullet points for clarity
- Definitions highlighted
- Examples and case studies
- Cross-references
- Study tips
""",
    }

    return prompts.get(material_type, prompts["summary"])


def get_section_analysis_prompt(
    section_type: str,
    page_range: Optional[str] = None
) -> str:
    """
    Build prompt for analyzing specific document sections

    Args:
        section_type: introduction/methods/results/discussion/conclusion
        page_range: Optional page range

    Returns:
        Section analysis prompt
    """
    section_prompts = {
        "introduction": """
Analyze the introduction section:
- What problem/question is addressed?
- What is the context/background?
- What are the objectives?
- What is the significance?
""",

        "methods": """
Analyze the methods section:
- What methodology was used?
- What were the key steps?
- What materials/tools were involved?
- What are the limitations?
""",

        "results": """
Analyze the results section:
- What are the main findings?
- What data is presented?
- What patterns or trends emerge?
- How significant are the results?
""",

        "discussion": """
Analyze the discussion section:
- How are results interpreted?
- What implications are drawn?
- What connections to prior work?
- What limitations are acknowledged?
""",

        "conclusion": """
Analyze the conclusion section:
- What are the key takeaways?
- What are the main contributions?
- What future work is suggested?
- What is the broader impact?
""",
    }

    prompt = section_prompts.get(section_type, "Analyze this section thoroughly.")

    if page_range:
        prompt += f"\n\n**Pages to analyze:** {page_range}"

    return prompt


# Prompt fragments for specific tasks
PROMPT_FRAGMENTS = {
    "cite_sources": """
Always cite sources by page number: (p. X) or (pp. X-Y)
""",

    "verify_accuracy": """
Double-check all facts and figures for accuracy before responding.
""",

    "educational_focus": """
Frame all analysis from an educational perspective: What should students learn from this?
""",

    "identify_prerequisites": """
Identify prerequisite knowledge needed to understand this content.
""",

    "suggest_further_reading": """
Suggest related topics or sections for deeper understanding.
""",
}
