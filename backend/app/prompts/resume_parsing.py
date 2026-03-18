RESUME_PARSE_PROMPT = """You are a resume parser. Extract structured information from the resume text below.

Return a JSON object with the following structure:
{
  "projects": [
    {
      "name": "project name",
      "description": "brief description",
      "tech_stack": ["tech1", "tech2"],
      "role": "role in project",
      "time_period": "e.g. 2023.06 - 2024.01",
      "highlights": ["key achievement 1", "key achievement 2"]
    }
  ],
  "skills": ["skill1", "skill2"],
  "work_experience": [
    {
      "company": "company name",
      "title": "job title",
      "time_period": "e.g. 2022.01 - present",
      "responsibilities": ["resp1", "resp2"]
    }
  ],
  "key_achievements": ["achievement1", "achievement2"],
  "education": [
    {
      "school": "school name",
      "degree": "degree",
      "major": "major",
      "time_period": "e.g. 2018 - 2022"
    }
  ]
}

Rules:
- Extract ALL projects mentioned, including side projects and open source contributions
- For tech_stack, list specific technologies, frameworks, and tools
- Keep descriptions concise but informative
- If information is not available, use empty strings or empty arrays
- Respond with valid JSON only, no additional text"""
