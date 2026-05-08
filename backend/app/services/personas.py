
PERSONA_CONFIGS = {
    "Analytical": {
        "description": "The Economist style. Data-driven, precise, balanced. Reads like a well-researched briefing from a senior analyst.",
        "style_instructions": (
            "Lead with the most important data point. Use sophisticated vocabulary but never jargon for jargon's sake. "
            "Every claim must be anchored in evidence. Balance perspectives - always present the counterargument. "
            "Tone is calm, confident, and authoritative. No hyperbole. No alarm. Just logic and insight."
        ),
        "social_style": "Professional, data-forward, and insight-focused. Ideal for LinkedIn and industry newsletters.",
        "opening_style": "Start with a sharp statistic or institutional-level observation.",
        "quote_style": "Cite analysts, researchers, and institutional voices. Formal attribution."
    },
    "Investigative": {
        "description": "ProPublica / NYT Investigations style. Critical, tenacious, and focused on accountability and impact.",
        "style_instructions": (
            "Frame the piece around a core tension: who benefits, who suffers, who is responsible. "
            "Ask tough questions within the narrative. Expose contradictions. Find the 'what they're not saying'. "
            "Use direct, muscular language. Short sentences for impact. Longer ones to build the case."
        ),
        "social_style": "Provocative, urgency-driven, and accountability-focused. Works on Twitter/X and email newsletters.",
        "opening_style": "Start with a real-world scenario or a document / data point that reveals the problem.",
        "quote_style": "Whistleblowers, insiders, affected stakeholders. Attribution must protect or reveal credibility."
    },
    "Narrative": {
        "description": "The Atlantic / Longform style. Story-first. Immersive. People-centered.",
        "style_instructions": (
            "Open with a scene. Put people at the center. Use vivid, sensory detail to make abstract ideas tangible. "
            "Build emotional investment before delivering the insight. Think: what is the human experience of this technology/issue? "
            "Use metaphor, narrative arc, and rhythm. Data supports story - it doesn't lead it."
        ),
        "social_style": "Emotional, story-driven, and relatable. Works on Instagram captions and Facebook long-form.",
        "opening_style": "Open with a vivid scene, person, or moment that embodies the larger story.",
        "quote_style": "First-person voices, affected individuals, founders. Informal, humanizing attribution."
    },
    "Tabloid": {
        "description": "TechCrunch / Vice style. Fast, punchy, high-energy. Optimized for clicks and shares.",
        "style_instructions": (
            "Lead with the most explosive or surprising fact. Use bold section headers. Short sentences. "
            "Prioritize the wow factor: what will make someone share this immediately? "
            "Keep energy high throughout. No dry sections. Add attitude and a clear point of view."
        ),
        "social_style": "Viral, hashtag-heavy, high-energy. Built for Twitter/X, Reddit, and tech Discord servers.",
        "opening_style": "Start with the single most surprising or controversial fact in the story.",
        "quote_style": "CEOs, founders, provocateurs. Informal, quote-forward, sometimes controversial."
    }
}

DEFAULT_PERSONA = "Analytical"
