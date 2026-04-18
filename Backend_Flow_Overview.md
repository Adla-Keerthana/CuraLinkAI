# 🧬 CuraLink AI: Backend Pipeline Architecture

This document provides a technical walkthrough of the CuraLink AI research engine, detailing the data flow, API stages, and processing logic.

---

## 🏛️ System Overview
The backend is built on a **Node.js/Express** architecture. It follows a "Retrieval-Augmented Generation" (RAG) pattern, where real-time data is fetched from trusted medical sources before being processed by Large Language Models (LLMs).

---

## 🛰️ The Research Pipeline (POST `/api/research`)

When a user submits a query, it triggers a three-stage pipeline.

### Stage 1: Intelligent Query Expansion
**Purpose:** Converts conversational user language into high-precision clinical search keywords.

*   **Logic Location:** `server/services/aiService.js` -> `expandQuery()`
*   **Input (Frontend):** 
    ```json
    {
      "query": "Is there progress in stage 3 lung cancer?",
      "context": { "disease": "Lung Cancer" }
    }
    ```
*   **Process:** The input is sent to the **Groq Llama 3.1 8B** model. It removes conversational filler and adds medical terminology.
*   **Output (Expanded):** `lung cancer stage 3 immunotherapy targeted therapy clinical trials 2024`

---

### Stage 2: Deep Evidence Retrieval (The Lattice)
**Purpose:** Concurrent fetching of peer-reviewed data from global medical registries.

*   **Logic Location:** `server/services/researchService.js` -> `searchAll()`
*   **Input:** `expandedQuery` (from Stage 1)
*   **Parallel Sub-Stages:**

| API Source | Input Type | Description |
| :--- | :--- | :--- |
| **PubMed (NCBI)** | Medical Keywords | Fetches formal research IDs then retrieves detailed metadata (XML). |
| **OpenAlex** | Search String | Fetches global open-access publication data with relevance scoring. |
| **ClinicalTrials.gov** | Condition Keywords | Fetches NCT IDs, recruiting status, and eligibility criteria for human trials. |

*   **Consolidated Output:** 
    ```json
    {
      "publications": [...],
      "clinicalTrials": [...]
    }
    ```

---

### Stage 3: Clinical Synthesis & Personalization
**Purpose:** Using deep-reasoning AI to synthesize thousands of words of raw data into a readable scan.

*   **Logic Location:** `server/services/aiService.js` -> `generateResearchSummary()`
*   **Input:** 
    - `userInput` (original question)
    - `researchData` (the consolidated output from Stage 2)
    - `context` (user-specific details)
*   **Process:** Data is sent to the **Groq Llama 3.3 70B** model. It is instructed to strictly follow the medical data and cite sources using `[Source: Title]`.
*   **Output:** A high-fidelity **Markdown Summary** structured with sections for Condition Overview, Key Insights, and Active Trials.

---

## 🛠️ Internal API References

### 1. PubMed Integration
*   **Input:** Query string.
*   **Endpoint 1:** `esearch.fcgi` (to get IDs).
*   **Endpoint 2:** `efetch.fcgi` (to get full article details).

### 2. ClinicalTrials.gov (v2)
*   **Input:** `query.cond` (Condition string).
*   **Output:** Protocol section, recruitment status, and location modules.

### 3. OpenAlex
*   **Input:** Search parameter.
*   **Output:** Works metadata including DOI, publication year, and authorships.

---

## 🔒 Security & Performance
- **Environment:** API keys for Groq and MongoDB are stored in `.env`.
- **Concurrency:** Data fetching happens using `Promise.all` to ensure the fastest possible synthesis time.
- **Database:** MongoDB is used to log research sessions for persistent state management.
