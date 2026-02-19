"""
╔══════════════════════════════════════════════════════════════════════════════════╗
║  RAG-ENHANCED LLM v2.0 — COMPLETENESS FIX                                      ║
║                                                                                 ║
║  Change from v1:                                                                ║
║    OLD: "Answer ONLY from context" → constrained, incomplete answers            ║
║    NEW: "Context is PRIMARY source, supplement with own knowledge,              ║
║          but MARK what comes from where" → complete + grounded                  ║
║                                                                                 ║
║  Also fixed:                                                                    ║
║    • Rate limit handling (longer delays, exponential backoff)                   ║
║    • Self-critique prompt tightened to preserve length                          ║
╚══════════════════════════════════════════════════════════════════════════════════╝
"""

import os
import re
import json
import time
import requests
import numpy as np
import faiss
import matplotlib.pyplot as plt
from datetime import datetime
from typing import Dict, List, Tuple, Optional
from collections import defaultdict
import warnings
warnings.filterwarnings('ignore')


# ═══════════════════════════════════════════════
# 🔧 CONFIGURATION
# ═══════════════════════════════════════════════

API_KEY = os.getenv("MISTRAL_API_KEY", "lR6EgIEbViYtzCTx7rQhjmoJZzU5O2qZ")
CHAT_MODEL = "mistral-large-2411"
EMBED_MODEL = "mistral-embed"
CHAT_URL = "https://api.mistral.ai/v1/chat/completions"
EMBED_URL = "https://api.mistral.ai/v1/embeddings"

TEMP_NORMAL = 0.7
TEMP_RAG = 0.3
TEMP_JUDGE = 0.1
MAX_TOKENS = 2000
TOP_K = 5
CHUNK_SIZE = 300
CHUNK_OVERLAP = 50
REQUEST_DELAY = 1.5  # ✅ Increased from 0.5 to avoid rate limits


# ═══════════════════════════════════════════════
# 📡 API CLIENT (with better rate limit handling)
# ═══════════════════════════════════════════════

class MistralClient:
    def __init__(self):
        self.call_count = 0
        self.embed_count = 0
        self.headers = {
            "Content-Type": "application/json",
            "Authorization": f"Bearer {API_KEY}"
        }

    def chat(self, prompt: str, system: str = "You are a helpful assistant.",
             temperature: float = 0.3, max_tokens: int = MAX_TOKENS) -> Tuple[str, float]:
        payload = {
            "model": CHAT_MODEL,
            "messages": [
                {"role": "system", "content": system},
                {"role": "user", "content": prompt}
            ],
            "temperature": temperature,
            "max_tokens": max_tokens
        }

        start = time.time()
        for attempt in range(5):  # ✅ More retries
            try:
                resp = requests.post(CHAT_URL, headers=self.headers, json=payload, timeout=90)
                if resp.status_code == 429:
                    wait = (2 ** attempt) * 2  # ✅ Longer backoff
                    print(f"       ⏳ Rate limited, waiting {wait}s...")
                    time.sleep(wait)
                    continue
                resp.raise_for_status()
                data = resp.json()
                output = data['choices'][0]['message']['content']
                self.call_count += 1
                return output, time.time() - start
            except requests.exceptions.HTTPError as e:
                if "429" in str(e):
                    wait = (2 ** attempt) * 2
                    print(f"       ⏳ Rate limited, waiting {wait}s...")
                    time.sleep(wait)
                    continue
                if attempt < 4:
                    print(f"       ⚠️ Retry {attempt+1}: {e}")
                    time.sleep(2 ** attempt)
                else:
                    return f"[API_ERROR: {e}]", time.time() - start
            except Exception as e:
                if attempt < 4:
                    print(f"       ⚠️ Retry {attempt+1}: {e}")
                    time.sleep(2 ** attempt)
                else:
                    return f"[API_ERROR: {e}]", time.time() - start

        return "[API_ERROR: max retries]", time.time() - start

    def embed(self, texts: List[str]) -> np.ndarray:
        payload = {"model": EMBED_MODEL, "input": texts}
        for attempt in range(5):
            try:
                resp = requests.post(EMBED_URL, headers=self.headers, json=payload, timeout=60)
                if resp.status_code == 429:
                    time.sleep((2 ** attempt) * 2)
                    continue
                resp.raise_for_status()
                data = resp.json()
                embeddings = [item['embedding'] for item in data['data']]
                self.embed_count += len(texts)
                return np.array(embeddings, dtype='float32')
            except Exception as e:
                if attempt < 4:
                    time.sleep(2 ** attempt)
                else:
                    raise RuntimeError(f"Embedding failed: {e}")


client = MistralClient()


# ═══════════════════════════════════════════════
# 📚 KNOWLEDGE BASE (same as v1)
# ═══════════════════════════════════════════════

KNOWLEDGE_DOCUMENTS = [
    {
        "id": "nep_overview",
        "title": "NEP 2020 Overview",
        "content": """The National Education Policy 2020 (NEP 2020) was approved by the Union Cabinet of India 
on July 29, 2020. It replaced the National Policy on Education 1986. The policy was drafted by a committee 
chaired by Dr. K. Kasturirangan, former chairman of ISRO. The Ministry of Education (formerly Ministry of 
Human Resource Development, renamed as part of NEP implementation) is responsible for its implementation.

NEP 2020 is the first education policy of the 21st century in India. It aims to transform India's education 
system by 2040. The policy envisions universal access to quality education from pre-school to Grade 12, 
with a target of 100% Gross Enrollment Ratio (GER) in school education by 2030. For higher education, 
the target GER is 50% by 2035, up from approximately 26.3% in 2018.

The policy proposes increasing public investment in education to 6% of GDP, up from approximately 4.43% 
at the time of the policy's announcement. NEP 2020 covers all levels of education from early childhood 
care and education (ECCE) through higher education and vocational training."""
    },
    {
        "id": "nep_structure",
        "title": "NEP 2020 Curricular Structure — 5+3+3+4",
        "content": """NEP 2020 replaces the existing 10+2 school structure with a new 5+3+3+4 curricular 
and pedagogical structure:

1. Foundational Stage (5 years, ages 3-8): 3 years of pre-primary/Anganwadi plus Grades 1-2. Focus on 
play-based, activity-based, and discovery-based learning. Emphasis on developing language skills, numeracy, 
and motor skills. The National Curriculum Framework for Foundational Stage (NCF-FS) was released in 2022.

2. Preparatory Stage (3 years, ages 8-11, Grades 3-5): Gradual transition to more formal classroom 
learning. Introduction of subjects like science, mathematics, arts, social sciences. Play and 
discovery-based pedagogy continues but with more structured elements.

3. Middle Stage (3 years, ages 11-14, Grades 6-8): Introduction of subject-specific teachers. Students 
begin abstract concepts in sciences, mathematics, arts, social sciences, and humanities. Experiential 
learning, including 10-day bag-less periods with local craftspeople and professionals. Introduction of 
vocational education with internships starting from Grade 6.

4. Secondary Stage (4 years, ages 14-18, Grades 9-12): Multidisciplinary study with no rigid separation 
of arts, science, and commerce streams. Students can choose subjects across disciplines. Semester-based 
system. Board exams reformed to test core competencies rather than rote memorization. Two board exams 
during secondary stage, both allowing up to two attempts."""
    },
    {
        "id": "nep_strengths",
        "title": "NEP 2020 Key Strengths and Positive Aspects",
        "content": """Key strengths identified by education experts and policy analysts:

1. Early Childhood Education Focus: For the first time, a national policy integrates early childhood care 
and education (ages 3-6) into formal schooling. Research consistently shows that early interventions 
yield the highest returns on educational investment. The ASER 2022 report highlighted that foundational 
literacy remains a major challenge, making this focus critical.

2. Flexibility and Multidisciplinary Approach: Breaking rigid stream separation (arts/science/commerce) 
allows students to pursue diverse combinations like Physics with Music or Mathematics with History. This 
aligns with global trends seen in liberal arts education in the US and European systems.

3. Mother Tongue/Regional Language Instruction: NEP recommends mother tongue or regional language as 
medium of instruction until at least Grade 5, preferably Grade 8. UNESCO research and multiple Indian 
studies confirm better learning outcomes in mother tongue. The three-language formula provides multilingual 
exposure.

4. Vocational Education Integration: Starting vocational exposure from Grade 6 with internships addresses 
India's skills gap. Currently only 5% of Indian workers aged 19-24 have formal vocational training, 
compared to 52% in the US, 75% in Germany, and 96% in South Korea.

5. Technology Integration: National Educational Technology Forum (NETF) proposed. Digital infrastructure 
for remote areas. DIKSHA platform, SWAYAM MOOCs, and virtual labs as technology enablers.

6. Credit Transfer System: Academic Bank of Credits (ABC) allows students to accumulate credits across 
institutions. Multiple entry and exit points in higher education with certificates (1 year), diplomas 
(2 years), degrees (3 years), and degrees with research (4 years)."""
    },
    {
        "id": "nep_weaknesses",
        "title": "NEP 2020 Criticisms, Weaknesses, and Challenges",
        "content": """Major criticisms and implementation challenges identified by analysts:

1. Implementation Feasibility: India has approximately 1.5 million schools, 250 million students, and 
9.4 million teachers. Implementing uniform changes across this scale is enormously complex. Many states 
have expressed concerns about timeline and capacity. As of 2024, implementation varies significantly 
across states with some barely beginning the transition.

2. Funding Gap: The policy recommends 6% of GDP spending on education, but India has consistently spent 
around 3-4.5% of GDP. The additional funding required is estimated at INR 2.5-3 lakh crore annually. 
No clear roadmap exists for achieving this target. Many experts call the 6% target aspirational rather 
than realistic.

3. Teacher Training Challenge: The policy requires massive retraining of existing teachers and reform of 
B.Ed programs to 4-year integrated degrees by 2030. India has approximately 9.4 million school teachers, 
many of whom lack adequate training even under current standards. The National Professional Standards for 
Teachers (NPST) are still being developed.

4. Language Policy Concerns: The three-language formula and mother tongue instruction face resistance in 
several states, particularly Tamil Nadu and other southern states concerned about Hindi imposition. 
Practical challenges exist in multilingual classrooms and availability of quality textbooks in regional 
languages.

5. Centralization Concerns: Critics argue NEP centralizes education governance through bodies like the 
Higher Education Commission of India (HECI), potentially undermining state autonomy. Education is on the 
Concurrent List of the Indian Constitution, and several states have raised federalism concerns.

6. Equity Concerns: Private school expansion could widen inequality. Rural-urban divide in implementation 
readiness. Digital divide affects technology-dependent initiatives. Special needs education provisions 
remain underdeveloped. Marginalized communities may face barriers to accessing new pathways.

7. Assessment Reform Uncertainty: Shift from rote learning to competency-based assessment requires 
complete overhaul of examination systems. PARAKH (Performance Assessment, Review and Analysis of 
Knowledge for Holistic Development) body established but detailed frameworks still evolving."""
    },
    {
        "id": "nep_higher_ed",
        "title": "NEP 2020 Higher Education Reforms",
        "content": """Key higher education reforms under NEP 2020:

Institutional Restructuring: All higher education institutions to become multidisciplinary by 2040, with 
target enrollment of 3,000+ students. Three types: Research Universities (focus on research and teaching), 
Teaching Universities (focus on teaching with significant research), and Autonomous Degree-Granting Colleges.

Regulatory Reform: Single overarching body — Higher Education Commission of India (HECI) with four verticals: 
National Higher Education Regulatory Council (NHERC) for regulation, National Accreditation Council (NAC) 
for accreditation, Higher Education Grants Council (HEGC) for funding, and General Education Council (GEC) 
for academic standards. UGC and AICTE to be replaced.

Academic Bank of Credits (ABC): Digitally stored academic credits that students can accumulate from multiple 
institutions. Enables flexible, multidisciplinary learning pathways. Facilitates multiple entry and exit 
points. As of 2024, over 1,600 institutions have registered with ABC.

Research and Innovation: National Research Foundation (NRF) established with annual budget of INR 50,000 crore 
over 5 years. Aims to fund, coordinate, and promote research across disciplines. Seed and grow research 
at state universities and smaller institutions.

Internationalization: Top 100 world-ranked universities allowed to set up campuses in India. Indian 
institutions encouraged to set up campuses abroad. Credit transfer and joint degree programs with foreign 
institutions."""
    },
    {
        "id": "nep_vocational",
        "title": "NEP 2020 Vocational Education and Skill Development",
        "content": """Vocational Education under NEP 2020:

Current Problem: Only about 5% of the Indian workforce (ages 19-24) has received formal vocational 
education, compared to 52% in the US, 75% in Germany, and 96% in South Korea. Vocational education has 
historically been stigmatized in India and seen as inferior to academic education.

NEP 2020 Approach: Integration of vocational education into mainstream education from Grade 6 onwards. 
Students will take vocational courses alongside academic subjects, not as a separate track. Mandatory 
internships and hands-on experience. The goal is that at least 50% of learners through school and 
higher education receive vocational exposure by 2025.

Key Programs: PM SHRI Schools as model implementation centers. Hub-and-spoke model where ITIs and 
polytechnics serve as hubs providing vocational education to surrounding schools. Skill labs in schools.
Local crafts and trades integrated into curriculum. NSQF (National Skills Qualifications Framework) 
aligned with academic qualifications.

Implementation Challenges: Requires partnerships with local industries, which are scarce in rural areas. 
Need for trained vocational instructors — current shortage estimated at over 1 million. Infrastructure 
gap in equipping schools with skill labs. Changing social attitudes about vocational education requires 
sustained effort over decades, not years. Budget allocation unclear."""
    },
    {
        "id": "early_childhood",
        "title": "Importance of Early Childhood Education — Evidence Base",
        "content": """Evidence for Early Childhood Education (ECE):

Scientific Foundation: Neuroscience research confirms that 90% of brain development occurs before age 5. 
The first 1,000 days (conception to age 2) are particularly critical for cognitive development. Neural 
connections form at a rate of over 1 million per second in early years. Quality early childhood 
experiences build the architecture of the developing brain.

Key Research Studies:
- Perry Preschool Study (US, 1962-1967): Children who attended quality preschool earned 14% more income 
  at age 40, were 20% less likely to be arrested, and had higher high school graduation rates. Return on 
  investment estimated at $7-12 for every $1 spent.
- Abecedarian Project (US): Participants showed higher cognitive test scores through age 21, four times 
  more likely to earn a college degree, and significantly better health outcomes.
- ASER India Reports: Consistently show that children entering Grade 1 without foundational skills fall 
  further behind each year. The 2022 report found only 20.5% of Grade 3 students in rural India could 
  read a Grade 2 level text.

Indian Context: India has approximately 160 million children under age 6. The Integrated Child Development 
Services (ICDS) scheme covers 100 million beneficiaries but faces quality challenges. Only 1% of GDP is 
spent on early childhood development. NIPUN Bharat (National Initiative for Proficiency in Reading with 
Understanding and Numeracy) launched in 2021 targets foundational literacy and numeracy by 2026-27.

UNESCO Position: Quality ECE is the most cost-effective educational investment a country can make. Returns 
diminish with later interventions. Every $1 invested in ECE yields $6-17 in economic returns. ECE reduces 
inequalities by giving disadvantaged children a stronger start."""
    },
    {
        "id": "ed_technology",
        "title": "Technology in Education — Current Landscape",
        "content": """Technology in Modern Education:

Global Trends: The global EdTech market was valued at approximately $254 billion in 2021 and is projected 
to reach $605 billion by 2027 (CAGR of 16.5%). COVID-19 accelerated digital adoption — UNESCO estimated 
1.6 billion learners affected by school closures globally, pushing rapid digitization.

AI in Education: Adaptive learning platforms (Khan Academy's Khanmigo, Carnegie Learning, DreamBox) 
personalize content to individual student pace. Intelligent tutoring systems provide immediate feedback. 
AI-powered assessment tools can evaluate essays and open-ended responses. Early research shows 
AI tutoring can improve outcomes by 0.2-0.5 standard deviations, roughly equivalent to moving from the 
50th to 58th-69th percentile.

India-Specific Initiatives: DIKSHA (Digital Infrastructure for Knowledge Sharing) platform launched 2017 
with 5.5 billion+ learning sessions. SWAYAM (Study Webs of Active-Learning for Young Aspiring Minds) 
offers free online courses from 9th grade to post-graduation. National Digital Education Architecture (NDEAR) 
provides interoperable digital infrastructure. PM eVIDYA unified multi-mode access including TV channels 
(one per grade), radio, podcasts, and online content.

Challenges: India's digital divide remains significant — only 24% of Indian households have internet access 
(NFHS-5). Urban-rural gap: 42% urban vs 15% rural internet access. Smartphone availability varies greatly. 
Teacher digital literacy is a bottleneck — many teachers, especially in rural areas, lack basic digital 
skills. Screen time concerns for young children. Content quality varies dramatically across platforms.

Evidence on Effectiveness: Technology alone does not improve outcomes — teacher quality and pedagogical 
integration matter more. Meta-analyses show technology yields modest positive effects (0.15-0.35 SD) when 
combined with good pedagogy, but near-zero effects when simply replacing traditional instruction. Blended 
learning models (combining technology with face-to-face instruction) consistently outperform purely online 
or purely in-person models."""
    },
    {
        "id": "lesson_design",
        "title": "Effective Lesson Design Principles",
        "content": """Evidence-Based Lesson Design Principles:

Bloom's Taxonomy (Revised): Effective lessons progress through cognitive levels: Remember → Understand → 
Apply → Analyze → Evaluate → Create. A well-designed lesson should target at least 3 levels. For 
mathematics (e.g., quadratic equations), this means: Remember formulas, Understand why they work, Apply 
to solve problems, Analyze which method works best, Evaluate solutions, Create real-world applications.

5E Instructional Model: Engage (hook student interest, 5 min) → Explore (hands-on investigation, 10 min) 
→ Explain (teacher clarifies concepts, 10 min) → Elaborate (extend to new contexts, 10 min) → Evaluate 
(assess understanding, 5 min). Research shows 5E model improves achievement by 0.5 SD compared to 
traditional lecture.

Formative Assessment: Check understanding every 10-15 minutes. Techniques include: think-pair-share, exit 
tickets, mini-whiteboards, thumbs up/down, quick polls. Research by Black & Wiliam (1998) shows formative 
assessment improves achievement by 0.4-0.7 SD — one of the largest effect sizes in educational research.

Differentiated Instruction: Plan activities at 3 levels: struggling learners (scaffolded support), 
on-level (standard activities), advanced (extension challenges). Universal Design for Learning (UDL) 
framework: multiple means of engagement, representation, and action/expression.

For Mathematics Specifically: Concrete-Representational-Abstract (CRA) progression. Start with physical 
manipulatives, move to diagrams/visuals, then introduce abstract notation. For quadratic equations: 
use area models (concrete), graph parabolas (representational), then derive the quadratic formula (abstract).

For Science Specifically: Inquiry-based learning outperforms direct instruction by 0.4 SD (Furtak et al., 
2012). For photosynthesis: start with observation (why are leaves green?), design simple experiments 
(light vs dark plant growth), collect data, draw conclusions, then introduce cellular mechanisms."""
    },
    {
        "id": "nep_gdp_impact",
        "title": "Economic Impact of Education Policy — What We Know and Don't Know",
        "content": """Economic Impact of NEP 2020 — Evidence and Uncertainties:

What Research Shows About Education and GDP: Cross-country studies (Hanushek & Woessmann, 2012) show that 
a one standard deviation increase in test scores is associated with approximately 2% higher annual GDP 
growth. However, the causal relationship is complex and mediated by many factors.

NEP 2020 Specific Projections: No rigorous independent study has yet quantified the exact GDP impact of 
NEP 2020. Various think tanks and consulting firms have made estimates ranging from 1-2% additional GDP 
growth by 2035-2040, but these are based on assumptions about full implementation, which is uncertain.

Why Exact Predictions Are Unreliable: Education reforms take 15-20 years to show economic impact (today's 
students enter workforce in 2035-2045). Implementation quality varies enormously across states. External 
factors (global economy, technology shifts, demographics) dominate short-term GDP. Historical precedent: 
India's 1986 education policy's economic impact was never precisely quantified.

What We Can Say With Confidence: Improved foundational literacy will increase human capital quality. 
Vocational training alignment with industry needs should reduce skills mismatch. Higher GER in higher 
education correlates with higher GDP per capita across countries. But assigning a specific number 
(e.g., "NEP will add X% to GDP by 2030") would be speculative and misleading.

Honest Assessment: The economic impact will depend primarily on implementation quality, sustained funding, 
teacher quality improvements, and whether structural changes actually reach classrooms. The policy's 
ambitions are sound based on international evidence, but India's scale and diversity make outcomes 
inherently uncertain."""
    }
]


# ═══════════════════════════════════════════════
# 📦 CHUNKER + VECTOR STORE (same as v1)
# ═══════════════════════════════════════════════

class DocumentChunker:
    def __init__(self, chunk_size=CHUNK_SIZE, overlap=CHUNK_OVERLAP):
        self.chunk_size = chunk_size
        self.overlap = overlap

    def chunk_documents(self, documents):
        all_chunks = []
        chunk_id = 0
        for doc in documents:
            words = doc["content"].split()
            if len(words) <= self.chunk_size:
                all_chunks.append({"chunk_id": chunk_id, "doc_id": doc["id"],
                                   "title": doc["title"], "text": doc["content"]})
                chunk_id += 1
            else:
                start = 0
                while start < len(words):
                    end = min(start + self.chunk_size, len(words))
                    all_chunks.append({"chunk_id": chunk_id, "doc_id": doc["id"],
                                       "title": doc["title"], "text": ' '.join(words[start:end])})
                    chunk_id += 1
                    start += self.chunk_size - self.overlap
        return all_chunks


class VectorStore:
    def __init__(self):
        self.index = None
        self.chunks = []

    def build_index(self, chunks):
        print("  📦 Building vector index...")
        self.chunks = chunks
        texts = [c["text"] for c in chunks]
        batch_size = 10
        all_embeddings = []
        for i in range(0, len(texts), batch_size):
            batch = texts[i:i+batch_size]
            print(f"     Embedding batch {i//batch_size + 1}/{(len(texts)-1)//batch_size + 1}...")
            embeddings = client.embed(batch)
            all_embeddings.append(embeddings)
            time.sleep(REQUEST_DELAY)
        all_embeddings = np.vstack(all_embeddings)
        self.index = faiss.IndexFlatIP(all_embeddings.shape[1])
        faiss.normalize_L2(all_embeddings)
        self.index.add(all_embeddings)
        print(f"     ✅ Index built: {len(chunks)} chunks, {all_embeddings.shape[1]}D")

    def search(self, query, top_k=TOP_K):
        query_emb = client.embed([query])
        faiss.normalize_L2(query_emb)
        scores, indices = self.index.search(query_emb, top_k)
        results = []
        for score, idx in zip(scores[0], indices[0]):
            if idx < len(self.chunks):
                chunk = self.chunks[idx].copy()
                chunk["relevance_score"] = float(score)
                results.append(chunk)
        return results


# ═══════════════════════════════════════════════
# 🧠 RAG PIPELINE v2 — THE FIX
# ═══════════════════════════════════════════════

class RAGPipelineV2:
    """
    ✅ KEY CHANGE: "Context-first, supplement freely"

    v1 said: "Answer ONLY from context" → incomplete, truncated answers
    v2 says: "Context is your PRIMARY source, supplement with your own knowledge,
              clearly mark what comes from where"

    This preserves grounding benefits while recovering completeness.
    """

    def __init__(self, vector_store):
        self.name = "RAG v2 + Self-Critique"
        self.vector_store = vector_store
        self.responses = []

    def process(self, query: str) -> Dict:
        total_start = time.time()
        metadata = {"api_calls": 0}

        # Step 1: Retrieve
        retrieved = self.vector_store.search(query, top_k=TOP_K)
        metadata["chunks_retrieved"] = len(retrieved)
        metadata["chunk_sources"] = list(set(c["doc_id"] for c in retrieved))
        context = self._build_context(retrieved)

        # ══════════════════════════════════════════
        # ✅ THE FIX: New generation prompt
        # ══════════════════════════════════════════
        rag_prompt = f"""You have access to a VERIFIED KNOWLEDGE BASE and your own training knowledge.

━━━ VERIFIED KNOWLEDGE BASE ━━━
{context}
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

QUESTION: {query}

INSTRUCTIONS:
1. Use the knowledge base as your PRIMARY source — prioritize facts from it
2. You MAY supplement with your own knowledge to give a COMPLETE, THOROUGH answer
3. When using knowledge base facts, be confident and specific
4. When adding your own knowledge beyond the documents, use hedging language 
   (e.g., "Additionally...", "More broadly...", "It's also worth noting...")
5. Do NOT truncate your answer — be as thorough and helpful as possible
6. If the question asks for a practical output (lesson plan, step-by-step guide, etc.),
   provide a FULL, DETAILED response — don't limit yourself to document excerpts
7. Present balanced perspectives where relevant
8. End with a brief confidence note

Give a comprehensive, well-structured answer."""

        rag_system = """You are an expert educational consultant with access to a verified knowledge base.
You give thorough, complete, well-structured answers. You ground your responses in verified sources 
when available, and supplement with your expertise when needed for completeness. You are balanced, 
evidence-based, and appropriately calibrated — confident about what the evidence shows, honest 
about uncertainties. You NEVER give truncated or incomplete answers."""

        answer, gen_latency = client.chat(rag_prompt, rag_system, temperature=TEMP_RAG)
        metadata["api_calls"] += 1

        time.sleep(REQUEST_DELAY)

        # ══════════════════════════════════════════
        # ✅ IMPROVED Self-Critique (preserves length)
        # ══════════════════════════════════════════
        critique_prompt = f"""Review and improve this answer. 

QUESTION: {query}

CURRENT ANSWER:
{answer}

REVIEW CHECKLIST:
1. Is it COMPLETE? Does it fully address every part of the question?
2. Is it BALANCED? Are multiple perspectives shown?
3. Is it ACCURATE? Are claims well-supported?
4. Is confidence CALIBRATED? Are uncertain claims hedged appropriately?
5. Is it CLEAR and well-organized?

RULES FOR REVISION:
• If the answer is already good, make only minor improvements — do NOT shorten it
• If anything is missing, ADD it — never remove good content
• The revised answer should be AT LEAST as long as the original
• Keep the same evidence and facts, improve structure and balance
• Ensure appropriate confidence levels throughout

Output ONLY the improved answer (no meta-commentary about what you changed).
End with: "Confidence: HIGH/MEDIUM/LOW" """

        critique_system = """You are a quality reviewer. Improve the answer while preserving or 
increasing its length and completeness. Never truncate good content. Fix balance, accuracy, 
and calibration issues. Output only the improved answer."""

        revised, critique_latency = client.chat(critique_prompt, critique_system, temperature=TEMP_RAG)
        metadata["api_calls"] += 1

        # Use revised if it's substantial, otherwise keep original
        final_output = revised if len(revised.split()) >= len(answer.split()) * 0.7 else answer
        total_latency = time.time() - total_start

        result = {
            "query": query,
            "output": final_output,
            "latency": total_latency,
            "timestamp": datetime.now().isoformat(),
            "metadata": {
                **metadata,
                "initial_answer_words": len(answer.split()),
                "final_answer_words": len(final_output.split()),
                "retrieved_chunks": [
                    {"source": c["doc_id"], "title": c["title"],
                     "score": c["relevance_score"]}
                    for c in retrieved
                ]
            }
        }
        self.responses.append(result)
        return result

    def _build_context(self, chunks):
        context = ""
        for chunk in chunks:
            context += f"\n[Source: {chunk['title']}] (relevance: {chunk['relevance_score']:.3f})\n"
            context += chunk["text"] + "\n"
        return context


# ═══════════════════════════════════════════════
# 🤖 NORMAL MISTRAL
# ═══════════════════════════════════════════════

class NormalMistral:
    def __init__(self):
        self.name = "Normal Mistral"
        self.responses = []

    def process(self, query: str) -> Dict:
        output, latency = client.chat(query, "You are a helpful assistant.", TEMP_NORMAL)
        result = {"query": query, "output": output, "latency": latency,
                  "timestamp": datetime.now().isoformat()}
        self.responses.append(result)
        return result


# ═══════════════════════════════════════════════
# ⚖️ LLM JUDGE
# ═══════════════════════════════════════════════

class LLMJudge:
    JUDGE_SYSTEM = """You are an expert evaluator comparing two AI responses.
You receive a QUESTION and two RESPONSES (A and B, randomized).
You do NOT know which system produced which.

Rate EACH on 6 dimensions (1-5):
1. ACCURACY: Facts correct, well-supported?
2. COMPLETENESS: Thoroughly addresses the question?
3. BALANCE: Multiple perspectives fairly presented?
4. CLARITY: Well-organized, easy to follow?
5. CALIBRATION: Appropriately expresses uncertainty?
6. HELPFULNESS: Actually useful to the asker?

Output ONLY valid JSON:
```json
{
  "response_a": {"accuracy": X, "completeness": X, "balance": X, "clarity": X, "calibration": X, "helpfulness": X},
  "response_b": {"accuracy": X, "completeness": X, "balance": X, "clarity": X, "calibration": X, "helpfulness": X},
  "preferred": "A" or "B" or "TIE",
  "reasoning": "Brief explanation"
}
```
Judge on QUALITY only, not length."""

    def __init__(self):
        self.evaluations = []

    def evaluate(self, query, resp_normal, resp_rag):
        import random
        if random.random() > 0.5:
            a, b = resp_normal, resp_rag
            a_is = "normal"
        else:
            a, b = resp_rag, resp_normal
            a_is = "rag"

        prompt = f"""QUESTION: {query}

━━━ RESPONSE A ━━━
{a[:2500]}

━━━ RESPONSE B ━━━
{b[:2500]}

Rate both. Output ONLY valid JSON."""

        output, latency = client.chat(prompt, self.JUDGE_SYSTEM, temperature=TEMP_JUDGE)
        scores = self._parse(output)

        if scores:
            if a_is == "normal":
                scores["normal_scores"] = scores.pop("response_a", {})
                scores["rag_scores"] = scores.pop("response_b", {})
                scores["winner"] = {"A": "normal", "B": "rag"}.get(scores.get("preferred", ""), "tie")
            else:
                scores["rag_scores"] = scores.pop("response_a", {})
                scores["normal_scores"] = scores.pop("response_b", {})
                scores["winner"] = {"A": "rag", "B": "normal"}.get(scores.get("preferred", ""), "tie")
        else:
            dims = ["accuracy","completeness","balance","clarity","calibration","helpfulness"]
            scores = {"normal_scores": {d: 3 for d in dims},
                      "rag_scores": {d: 3 for d in dims},
                      "winner": "tie", "reasoning": "Parse failed"}

        self.evaluations.append(scores)
        return scores

    def _parse(self, text):
        try:
            match = re.search(r'\{[\s\S]*\}', text)
            if match:
                return json.loads(match.group())
        except:
            pass
        try:
            scores = {}
            for label in ["response_a", "response_b"]:
                section = {}
                for dim in ["accuracy","completeness","balance","clarity","calibration","helpfulness"]:
                    m = re.search(rf'{dim}["\s:]+(\d)', text, re.IGNORECASE)
                    section[dim] = int(m.group(1)) if m else 3
                scores[label] = section
            scores["preferred"] = "A" if re.search(r'prefer.*?A', text, re.I) else ("B" if re.search(r'prefer.*?B', text, re.I) else "TIE")
            scores["reasoning"] = "Extracted"
            return scores
        except:
            return None


# ═══════════════════════════════════════════════
# 📝 TEST QUERIES
# ═══════════════════════════════════════════════

TEST_QUERIES = [
    {"id": 1, "query": "What are the key strengths and weaknesses of NEP 2020?",
     "category": "balanced_analysis", "tests": ["balance", "accuracy"]},
    {"id": 2, "query": "Is NEP 2020 a good policy?",
     "category": "framing_positive", "tests": ["framing_sensitivity", "balance"]},
    {"id": 3, "query": "What are the major problems with NEP 2020?",
     "category": "framing_negative", "tests": ["framing_sensitivity", "balance"]},
    {"id": 4, "query": "What specific year was NEP 2020 announced, which ministry leads it, and what is the 5+3+3+4 structure?",
     "category": "factual_recall", "tests": ["hallucination", "accuracy"]},
    {"id": 5, "query": "What will be the exact GDP impact of NEP 2020 by 2030?",
     "category": "overconfidence_trap", "tests": ["overconfidence", "calibration"]},
    {"id": 6, "query": "Create a lesson plan for teaching Quadratic Equations to Class 10",
     "category": "lesson_design", "tests": ["structure", "completeness"]},
    {"id": 7, "query": "How can rural schools implement NEP 2020's vocational training?",
     "category": "implementation", "tests": ["practical_reasoning", "nuance"]},
    {"id": 8, "query": "Explain the 5+3+3+4 structure and whether it's better than the old 10+2 system",
     "category": "comparison", "tests": ["accuracy", "balance"]},
    {"id": 9, "query": "Explain the importance of early childhood education with evidence",
     "category": "evidence_based", "tests": ["accuracy", "evidence_quality"]},
    {"id": 10, "query": "How will AI transform education in India in the next 5 years?",
     "category": "speculative", "tests": ["calibration", "overconfidence"]},
]


# ═══════════════════════════════════════════════
# 🔬 COMPARISON FRAMEWORK
# ═══════════════════════════════════════════════

class ComparisonFramework:
    def __init__(self):
        print("\n═══ BUILDING KNOWLEDGE BASE ═══")
        chunker = DocumentChunker()
        chunks = chunker.chunk_documents(KNOWLEDGE_DOCUMENTS)
        print(f"  📄 {len(KNOWLEDGE_DOCUMENTS)} documents → {len(chunks)} chunks")

        self.vector_store = VectorStore()
        self.vector_store.build_index(chunks)

        self.normal = NormalMistral()
        self.rag = RAGPipelineV2(self.vector_store)
        self.judge = LLMJudge()
        self.results = []

    def run(self):
        print("\n" + "═" * 100)
        print("🔬 RAG v2 (COMPLETENESS FIX) vs NORMAL MISTRAL")
        print("═" * 100)
        print(f"  Model: {CHAT_MODEL}")
        print(f"  Queries: {len(TEST_QUERIES)}")
        print(f"  KEY CHANGE: Context-first + supplement freely (was: ONLY from context)")
        print(f"  Self-critique: Preserves length, improves balance")
        print("═" * 100)

        for q in TEST_QUERIES:
            query = q["query"]
            qid = q["id"]

            print(f"\n{'─' * 100}")
            print(f"  TEST #{qid}: {query[:85]}...")
            print(f"  Category: {q['category']}")
            print(f"{'─' * 100}")

            # Normal
            print(f"\n  🤖 Normal Mistral...")
            normal_result = self.normal.process(query)
            n_words = len(normal_result["output"].split())
            print(f"     ✓ {normal_result['latency']:.1f}s, {n_words} words")

            time.sleep(REQUEST_DELAY)

            # RAG v2
            print(f"\n  📚 RAG v2...")
            rag_result = self.rag.process(query)
            r_words = len(rag_result["output"].split())
            sources = rag_result["metadata"]["chunk_sources"]
            print(f"     ✓ {rag_result['latency']:.1f}s, {r_words} words")
            print(f"     Sources: {', '.join(sources)}")
            print(f"     Word count: initial={rag_result['metadata']['initial_answer_words']}"
                  f" → final={rag_result['metadata']['final_answer_words']}")

            time.sleep(REQUEST_DELAY)

            # Judge
            print(f"\n  ⚖️  LLM Judge...")
            judge_result = self.judge.evaluate(query, normal_result["output"], rag_result["output"])
            print(f"     Winner: {judge_result['winner'].upper()}")
            ns = judge_result.get('normal_scores', {})
            rs = judge_result.get('rag_scores', {})
            print(f"     Normal: acc={ns.get('accuracy',0)} comp={ns.get('completeness',0)} "
                  f"bal={ns.get('balance',0)} cal={ns.get('calibration',0)} help={ns.get('helpfulness',0)}")
            print(f"     RAG:    acc={rs.get('accuracy',0)} comp={rs.get('completeness',0)} "
                  f"bal={rs.get('balance',0)} cal={rs.get('calibration',0)} help={rs.get('helpfulness',0)}")

            self.results.append({
                "query_id": qid, "category": q["category"], "tests": q["tests"],
                "normal": {"output": normal_result["output"], "latency": normal_result["latency"],
                           "words": n_words},
                "rag": {"output": rag_result["output"], "latency": rag_result["latency"],
                         "words": r_words, "sources": sources},
                "judge": judge_result
            })

            time.sleep(REQUEST_DELAY)

        self._print_summary()
        self._plot_results()
        self._save_report()

    def _print_summary(self):
        print("\n" + "═" * 100)
        print("📊 FINAL RESULTS — RAG v2 (COMPLETENESS FIX) vs NORMAL MISTRAL")
        print("═" * 100)

        wins = {"normal": 0, "rag": 0, "tie": 0}
        for r in self.results:
            wins[r["judge"].get("winner", "tie")] += 1

        print(f"\n  🏆 OVERALL WINS:")
        print(f"     Normal Mistral:  {wins['normal']}")
        print(f"     RAG v2:          {wins['rag']}")
        print(f"     Ties:            {wins['tie']}")

        dims = ["accuracy", "completeness", "balance", "clarity", "calibration", "helpfulness"]
        print(f"\n  📈 AVERAGE SCORES (1-5):")
        print(f"     {'Dimension':<15} {'Normal':>8} {'RAG v2':>8} {'Delta':>8} {'Winner':>8}")
        print(f"     {'─'*55}")

        for dim in dims:
            n_avg = np.mean([r["judge"]["normal_scores"].get(dim, 3) for r in self.results])
            r_avg = np.mean([r["judge"]["rag_scores"].get(dim, 3) for r in self.results])
            delta = r_avg - n_avg
            winner = "RAG ✓" if delta > 0.1 else ("Normal ✓" if delta < -0.1 else "≈ Tie")
            print(f"     {dim:<15} {n_avg:>8.2f} {r_avg:>8.2f} {delta:>+8.2f} {winner:>8}")

        # v1 comparison
        print(f"\n  📊 IMPROVEMENT vs RAG v1:")
        v1_scores = {"accuracy": 4.70, "completeness": 3.90, "balance": 4.00,
                     "clarity": 4.50, "calibration": 4.70, "helpfulness": 4.40}
        for dim in dims:
            v2_avg = np.mean([r["judge"]["rag_scores"].get(dim, 3) for r in self.results])
            v1_val = v1_scores.get(dim, 3)
            delta = v2_avg - v1_val
            arrow = "↑" if delta > 0.05 else ("↓" if delta < -0.05 else "→")
            print(f"     {dim:<15} v1={v1_val:.2f} → v2={v2_avg:.2f} {arrow} {delta:+.2f}")

        n_lat = np.mean([r["normal"]["latency"] for r in self.results])
        r_lat = np.mean([r["rag"]["latency"] for r in self.results])
        n_words = np.mean([r["normal"]["words"] for r in self.results])
        r_words = np.mean([r["rag"]["words"] for r in self.results])

        print(f"\n  ⏱️  LATENCY & SIZE:")
        print(f"     Normal: {n_lat:.1f}s avg, {n_words:.0f} words avg")
        print(f"     RAG v2: {r_lat:.1f}s avg, {r_words:.0f} words avg")
        print(f"     Overhead: {((r_lat/n_lat)-1)*100:+.0f}%")
        print(f"     API calls: {client.call_count} chat + {client.embed_count} embeddings")

        # Problem areas
        print(f"\n  🎯 PROBLEM AREAS:")
        problem_map = {
            "framing_sensitivity": ["framing_positive", "framing_negative"],
            "overconfidence": ["overconfidence_trap", "speculative"],
            "hallucination": ["factual_recall"],
            "calibration": ["overconfidence_trap", "speculative"],
            "balance": ["balanced_analysis", "comparison"],
            "evidence_quality": ["evidence_based"]
        }
        for problem, cats in problem_map.items():
            relevant = [r for r in self.results if r["category"] in cats]
            if relevant:
                rag_wins = sum(1 for r in relevant if r["judge"].get("winner") == "rag")
                total = len(relevant)
                status = "✅" if rag_wins > total / 2 else ("⚠️" if rag_wins > 0 else "❌")
                print(f"     {status} {problem}: {rag_wins}/{total} wins")

    def _plot_results(self):
        fig = plt.figure(figsize=(22, 14))
        fig.suptitle('RAG v2 (Completeness Fix) vs Normal Mistral', fontsize=16, fontweight='bold', y=0.98)

        dims = ["accuracy", "completeness", "balance", "clarity", "calibration", "helpfulness"]

        # Plot 1: Dimension comparison
        ax1 = plt.subplot(2, 3, 1)
        n_avgs = [np.mean([r["judge"]["normal_scores"].get(d, 3) for r in self.results]) for d in dims]
        r_avgs = [np.mean([r["judge"]["rag_scores"].get(d, 3) for r in self.results]) for d in dims]
        x = np.arange(len(dims))
        w = 0.35
        ax1.bar(x - w/2, n_avgs, w, label='Normal', color='#3498db', alpha=0.85)
        ax1.bar(x + w/2, r_avgs, w, label='RAG v2', color='#2ecc71', alpha=0.85)
        ax1.set_ylabel('Score (1-5)')
        ax1.set_title('Average Scores by Dimension')
        ax1.set_xticks(x)
        ax1.set_xticklabels(dims, rotation=45, ha='right', fontsize=9)
        ax1.legend()
        ax1.set_ylim(0, 5.5)
        ax1.grid(axis='y', alpha=0.3)

        # Plot 2: Win pie
        ax2 = plt.subplot(2, 3, 2)
        wins = {"Normal": 0, "RAG v2": 0, "Tie": 0}
        for r in self.results:
            w_key = r["judge"].get("winner", "tie")
            if w_key == "normal": wins["Normal"] += 1
            elif w_key == "rag": wins["RAG v2"] += 1
            else: wins["Tie"] += 1
        ax2.pie(wins.values(), labels=wins.keys(), autopct='%1.0f%%',
                colors=['#3498db', '#2ecc71', '#95a5a6'], startangle=90)
        ax2.set_title('Overall Win Rate')

        # Plot 3: Per-query
        ax3 = plt.subplot(2, 3, 3)
        qids = [r["query_id"] for r in self.results]
        n_totals = [np.mean(list(r["judge"]["normal_scores"].values())) for r in self.results]
        r_totals = [np.mean(list(r["judge"]["rag_scores"].values())) for r in self.results]
        ax3.plot(qids, n_totals, 'o-', label='Normal', color='#3498db', markersize=8)
        ax3.plot(qids, r_totals, 's-', label='RAG v2', color='#2ecc71', markersize=8)
        ax3.set_xlabel('Query ID')
        ax3.set_ylabel('Avg Score')
        ax3.set_title('Score by Query')
        ax3.legend()
        ax3.grid(alpha=0.3)
        ax3.set_ylim(0, 5.5)

        # Plot 4: Word count comparison (THE KEY METRIC)
        ax4 = plt.subplot(2, 3, 4)
        n_wc = [r["normal"]["words"] for r in self.results]
        r_wc = [r["rag"]["words"] for r in self.results]
        ax4.bar(np.array(qids) - 0.2, n_wc, 0.4, label='Normal', color='#3498db', alpha=0.8)
        ax4.bar(np.array(qids) + 0.2, r_wc, 0.4, label='RAG v2', color='#2ecc71', alpha=0.8)
        ax4.set_xlabel('Query ID')
        ax4.set_ylabel('Words')
        ax4.set_title('Word Count per Query (Completeness Proxy)')
        ax4.legend()
        ax4.grid(axis='y', alpha=0.3)

        # Plot 5: Delta
        ax5 = plt.subplot(2, 3, 5)
        delta_avgs = [np.mean([r["judge"]["rag_scores"].get(d, 3) - r["judge"]["normal_scores"].get(d, 3)
                               for r in self.results]) for d in dims]
        colors_bar = ['#2ecc71' if v > 0 else '#e74c3c' for v in delta_avgs]
        ax5.barh(dims, delta_avgs, color=colors_bar, alpha=0.85)
        ax5.axvline(x=0, color='black', linestyle='-', alpha=0.3)
        ax5.set_xlabel('Delta (RAG v2 - Normal)')
        ax5.set_title('Improvement by Dimension')
        ax5.grid(axis='x', alpha=0.3)

        # Plot 6: v1 vs v2 comparison
        ax6 = plt.subplot(2, 3, 6)
        v1_scores = [4.70, 3.90, 4.00, 4.50, 4.70, 4.40]
        v2_scores = [np.mean([r["judge"]["rag_scores"].get(d, 3) for r in self.results]) for d in dims]
        ax6.bar(x - w/2, v1_scores, w, label='RAG v1', color='#f39c12', alpha=0.85)
        ax6.bar(x + w/2, v2_scores, w, label='RAG v2', color='#2ecc71', alpha=0.85)
        ax6.set_ylabel('Score (1-5)')
        ax6.set_title('RAG v1 vs RAG v2')
        ax6.set_xticks(x)
        ax6.set_xticklabels(dims, rotation=45, ha='right', fontsize=9)
        ax6.legend()
        ax6.set_ylim(0, 5.5)
        ax6.grid(axis='y', alpha=0.3)

        plt.tight_layout(rect=[0, 0, 1, 0.95])
        plt.savefig('/home/claude/rag_v2_comparison.png', dpi=200, bbox_inches='tight')
        print(f"\n  📊 Graphs saved")

    def _save_report(self):
        report = {
            "timestamp": datetime.now().isoformat(),
            "version": "RAG v2 — Completeness Fix",
            "key_change": "Context-first + supplement freely (was ONLY from context)",
            "config": {"model": CHAT_MODEL, "top_k": TOP_K, "docs": len(KNOWLEDGE_DOCUMENTS)},
            "results": self.results,
            "api_usage": {"chat_calls": client.call_count, "embed_calls": client.embed_count}
        }
        with open('/home/claude/rag_v2_report.json', 'w') as f:
            json.dump(report, f, indent=2, default=str)
        print(f"  💾 Report saved")


# ═══════════════════════════════════════════════
# 🚀 MAIN
# ═══════════════════════════════════════════════

def main():
    print("╔══════════════════════════════════════════════════════════════════╗")
    print("║  RAG v2.0 — COMPLETENESS FIX                                    ║")
    print("║                                                                  ║")
    print("║  KEY CHANGE:                                                     ║")
    print("║    v1: 'Answer ONLY from context' → truncated, incomplete        ║")
    print("║    v2: 'Context is PRIMARY, supplement freely' → complete        ║")
    print("║                                                                  ║")
    print("║  ALSO FIXED:                                                     ║")
    print("║    • Rate limit handling (longer delays)                         ║")
    print("║    • Self-critique preserves length                              ║")
    print("║    • System prompt encourages thoroughness                       ║")
    print("╚══════════════════════════════════════════════════════════════════╝")
    print()

    framework = ComparisonFramework()
    framework.run()

    print("\n  ✅ Complete!")
    print("  📊 Check rag_v2_comparison.png for graphs")
    print("  💾 Check rag_v2_report.json for details")


if __name__ == "__main__":
    main()