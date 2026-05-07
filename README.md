# 🕵️‍♂️ AI Journalist

> **High-Performance, Stateless Intelligence Engine for Investigative Journalism.**

AI Journalist is a state-of-the-art backend system designed to automate the deep-dive research and writing process for modern investigative journalists. It leverages advanced LLMs (Gemini, Claude, GPT-4o) and specialized TTS (Sarvam Bulbul v3) to transform raw topics into polished, audited reports and audio briefings.

---

## 🚀 Key Features

- **🔍 Multi-Stage Investigative Pipeline**:
  - **Research**: Real-time web discovery via **SerpAPI** and automated deep-article scraping.
  - **Structuring**: Intelligent narrative flow design.
  - **Writing**: High-density reporting using LiteLLM (OpenAI, Anthropic, Mistral, etc.).
  - **Auditing**: Professional newsroom-style editorial audit.
- **🎙️ Voice Briefings**: Instant audio news briefings powered by **Sarvam AI Bulbul v3** (en-IN).
- **🎨 Visual Coverage**: Automated cover image generation using **Gemini Image** or **DALL-E 3**.
- **📱 Social Distribution Kit**: Automated generation of X threads, LinkedIn posts, and newsletter blurbs.
- **🌐 Multilingual Support**: On-the-fly translation for global reach.
- **⚡ Stateless & Minimalist**: Zero Technical Debt. No database requirements. No persistent sessions. Pure API speed.

---

## 🛠️ Technology Stack

- **Core**: [FastAPI](https://fastapi.tiangolo.com/) (Python 3.10+)
- **Intelligence**: [LiteLLM](https://docs.litellm.ai/) & [Google GenAI](https://ai.google.dev/)
- **Research**: Google Search Grounding & [SerpAPI](https://serpapi.com/)
- **Audio**: [Sarvam AI](https://www.sarvam.ai/) (Bulbul v3 TTS)
- **Validation**: [Pydantic v2](https://docs.pydantic.dev/) & `pydantic-settings`
- **Images**: [Pillow](https://python-pillow.org/) (Optimization) & Gemini/DALL-E

---

## 📂 Project Structure

The project follows a clean, production-ready modular architecture:

```text
backend/
├── app/
│   ├── main.py            # API Entry Point & Middleware
│   ├── api/               # Route Handlers (Journalist, Voice)
│   ├── core/              # Centralized Settings (Settings, Banner)
│   ├── models/            # Pydantic Schemas
│   └── services/          # Flat Service Layer (Orchestrator, LLM, Gemini)
├── .env                   # Environment Secrets
└── requirements.txt       # Optimized Dependencies
```

---

## ⚙️ Getting Started

### 1. Prerequisites
- Python 3.10 or higher
- [SerpAPI Key](https://serpapi.com/) (Optional, for advanced web search)
- [Gemini API Key](https://aistudio.google.com/)
- [OpenAI API Key](https://platform.openai.com/) (Optional, for fallback writing/images)
- [Sarvam API Key](https://dashboard.sarvam.ai/) (For Audio Briefings)

### 2. Installation
```bash
# Clone the repository
git clone <your-repo-url>
cd AI-Journalist/backend

# Create and activate virtual environment
python3 -m venv venv
source venv/bin/activate  # On Windows: venv\Scripts\activate

# Install dependencies
pip install -r requirements.txt
```

### 3. Environment Configuration
Create a `.env` file in the `backend/` root:
```env
GEMINI_API_KEY=your_key_here
OPENAI_API_KEY=your_key_here
SARVAM_API_KEY=your_key_here
SERPAPI_API_KEY=your_key_here
CORS_ORIGINS=http://localhost:3000
ENVIRONMENT=development
```

### 4. Running the Server
```bash
uvicorn app.main:app --reload
```
The API will be available at `http://127.0.0.1:8000` with interactive docs at `/docs`.

---

## 📡 API Endpoints

### Journalist Pipeline
- `POST /api/journalist/generate-content`: Start the full SSE generation pipeline.
- `POST /api/journalist/translate`: Translate article content.
- `POST /api/journalist/generate-image`: Create a cover photo.
- `POST /api/journalist/generate-social-kit`: Generate distribution assets.

### Voice Services
- `POST /api/voice/tts`: Direct text-to-speech briefing generation.

---

## ⚖️ License
MIT License. Optimized for high-performance AI integration.
