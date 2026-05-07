# AI Journalist

[![FastAPI](https://img.shields.io/badge/FastAPI-005571?style=for-the-badge&logo=fastapi)](https://fastapi.tiangolo.com/)
[![Next.js](https://img.shields.io/badge/Next.js-000000?style=for-the-badge&logo=nextdotjs)](https://nextjs.org/)
[![MongoDB](https://img.shields.io/badge/MongoDB-47A248?style=for-the-badge&logo=mongodb)](https://www.mongodb.com/)
[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg?style=for-the-badge)](https://opensource.org/licenses/MIT)

**AI Journalist** is an end-to-end intelligence engine designed for modern investigative journalism. It automates the heavy lifting of deep-dive research, narrative structuring, and editorial auditing, allowing journalists to focus on high-level analysis and verification.

By combining live web discovery, multi-model LLM orchestration (Gemini, Claude, GPT-4), and professional-grade TTS, the platform transforms a single prompt into a structured report, audio briefing, and distribution-ready social media kit.

---

## Core Architecture

The system operates as a **multi-stage investigative pipeline**, ensuring accuracy and depth through sequential processing:

1.  **Discovery**: Real-time research via SerpAPI with automated scraping of top-tier sources.
2.  **Narrative Design**: Intelligent outlining to ensure logical flow and evidence-based reporting.
3.  **Content Synthesis**: High-density writing using LiteLLM to leverage the best model for the specific tone/task.
4.  **Editorial Audit**: A dedicated audit layer that checks for bias, verifies citations, and ensures newsroom standards.
5.  **Multi-Modal Output**: Instant generation of audio briefings (Sarvam AI) and visual coverage (Gemini/DALL-E).

---

## Technology Stack

| Layer | Technologies |
| :--- | :--- |
| **Backend** | FastAPI, Python 3.10+, Pydantic v2, Motor (Async MongoDB) |
| **Frontend** | Next.js 14+, TypeScript, Tailwind CSS, Framer Motion |
| **Intelligence** | Google Gemini 1.5 Pro, Anthropic Claude 3.5, OpenAI GPT-4o |
| **Research** | SerpAPI, BeautifulSoup4, PyPDF |
| **Audio/Visual** | Sarvam AI (Bulbul v3), Pillow, Imagen/DALL-E 3 |

---

## Project Structure

```text
.
├── backend/                # FastAPI Intelligence Engine
│   ├── app/
│   │   ├── api/            # Route handlers (Auth, Journalist, Voice)
│   │   ├── core/           # Configuration & Database initialization
│   │   ├── services/       # Business logic (Orchestrator, LLM providers)
│   │   └── models/         # Pydantic schemas for request/response validation
│   └── .env                # Backend secrets
└── frontend/               # Next.js 14 Dashboard
    ├── src/
    │   ├── components/     # UI components (Bento grids, Editor, Chat)
    │   ├── services/       # API client & SSE handling
    │   └── store/          # State management (Zustand)
    └── .env.local          # Frontend environment config
```

---

## Getting Started

### 1. Prerequisites

- **Python 3.10+** & **Node.js 20+**
- **MongoDB**: A local instance or [MongoDB Atlas](https://www.mongodb.com/cloud/atlas) URI.
- **API Keys**: Gemini (Required), SerpAPI (Highly Recommended), Sarvam AI (For Audio).

### 2. Backend Setup

```bash
cd backend
python3 -m venv venv
source venv/bin/activate
pip install -r requirements.txt

# Create .env file
cp .env.example .env # or create manually
uvicorn app.main:app --reload
```

### 3. Frontend Setup

```bash
cd frontend
npm install
# Create .env.local with NEXT_PUBLIC_API_URL=http://localhost:8000
npm run dev
```

---

## Environment Configuration

### Backend (.env)
| Key | Description |
| :--- | :--- |
| `GEMINI_API_KEY` | Primary model for research and reasoning. |
| `SERPAPI_API_KEY` | Enables real-time Google Search grounding. |
| `SARVAM_API_KEY` | Required for generating audio news briefings. |
| `DATABASE_URL` | MongoDB connection string. |
| `OPENAI_API_KEY` | (Optional) Fallback for writing/image tasks. |

### Frontend (.env.local)
| Key | Description |
| :--- | :--- |
| `NEXT_PUBLIC_API_URL` | Base URL for the FastAPI backend (Default: `http://localhost:8000`). |

---

## API Overview

### `POST /api/journalist/generate-content`
The primary investigative endpoint. Uses **Server-Sent Events (SSE)** to stream the research process, providing real-time feedback as the agent discovers sources, builds the outline, and writes the final report.

### `POST /api/voice/tts`
Converts investigative reports into high-quality audio briefings optimized for professional news consumption.

---

## Contributing

We welcome contributions from journalists, engineers, and researchers. 

1. Fork the Project
2. Create your Feature Branch (`git checkout -b feature/AmazingFeature`)
3. Commit your Changes (`git commit -m 'Add some AmazingFeature'`)
4. Push to the Branch (`git push origin feature/AmazingFeature`)
5. Open a Pull Request

---

## License

Distributed under the MIT License. See `LICENSE` for more information.
