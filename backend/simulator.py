

import requests

MISTRAL_API_KEY = "y3KJqBO0GmQ2S0LlrqV1gB42srZQqzZf"
API_URL = "https://api.mistral.ai/v1/chat/completions"

def generate_nep_simulator(topic, grade="Class 8", subject="Physics"):
    prompt = f"""
Generate a COMPLETE standalone HTML/CSS/JS simulator for the topic: "{topic}"

Constraints:
- Zero external libraries
- Browser-runnable HTML only
- Industry / real-world aligned simulation (not toy demo)

NEP MAPPING (MANDATORY):
1. Clearly reflect NEP competencies:
   - Conceptual understanding
   - Real-world application
   - Critical thinking
   - Observation & inference
2. Include (inside HTML as comments or sections):
   - NEP Learning Outcomes
   - Real-world / industry use-case
   - What student learns by interaction
3. Suitable for {grade}, Subject: {subject}
4. Teacher can use it directly before class.

Return ONLY valid HTML code. No explanations.
"""

    payload = {
        "model": "mistral-large-2411",
        "messages": [{"role": "user", "content": prompt}],
        "temperature": 0.6
    }

    headers = {
        "Authorization": f"Bearer {MISTRAL_API_KEY}",
        "Content-Type": "application/json"
    }

    response = requests.post(API_URL, json=payload, headers=headers, timeout=50)
    return response.json()["choices"][0]["message"]["content"]


# TEST
html = generate_nep_simulator("force")
with open("nep_simulator.html", "w", encoding="utf-8") as f:
    f.write(html)
