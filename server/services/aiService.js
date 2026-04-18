const Groq = require('groq-sdk');
require('dotenv').config();

const groq = new Groq({ apiKey: process.env.GROQ_API_KEY });

class AIService {
  /**
   * Intelligently expand user query and extract structured parameters
   */
  async expandQuery(userInput, context = {}, history = []) {
    const historySnippet = history.slice(-3).map(m => `${m.role}: ${m.text}`).join('\n');
    const contextStr = Object.entries(context).map(([k, v]) => `${k}: ${v}`).join(', ');
    
    try {
      const prompt = `
        You are a medical search intent analyzer. Your goal is to convert a user's natural language query and patient context into a structured search object.
        
        CONVERSATION HISTORY:
        ${historySnippet || 'None'}

        NEW USER QUERY: "${userInput}"
        PATIENT CONTEXT: "${contextStr || 'Not specified'}"
        
        Analyze the query and history to extract:
        1. "searchTerm": A broad medical keyword string for general search.
        2. "filters":
           - "condition": The primary medical condition (e.g., "Lung Cancer").
           - "intervention": Any specific drug or treatment (e.g., "Pembrolizumab").
           - "status": Trial status if mentioned (RECRUITING, COMPLETED, etc. - default to null).
           - "yearStart": Start year if a range or "latest/recent" is mentioned (default to 2020 if "recent", else null).
           - "yearEnd": End year (default null).
        
        Return ONLY a JSON object. No other text.
        Example: { "searchTerm": "lung cancer pembrolizumab", "filters": { "condition": "Lung Cancer", "intervention": "Pembrolizumab", "status": "RECRUITING", "yearStart": 2020 } }
      `;

      const completion = await groq.chat.completions.create({
        messages: [{ role: 'user', content: prompt }],
        model: 'llama-3.1-8b-instant',
        response_format: { type: "json_object" }
      });

      const structuredResponse = JSON.parse(completion.choices[0].message.content.trim());
      console.log("Structured Query Logic:", structuredResponse);
      return structuredResponse;
    } catch (error) {
      console.error("Query Expansion Error:", error.message);
      return { searchTerm: userInput, filters: {} };
    }
  }

  /**
   * Generate a structured, research-backed summary with context
   */
  async generateResearchSummary(userInput, researchData, context = {}, history = []) {
    try {
      const { publications, clinicalTrials } = researchData;
      const historySnippet = history.slice(-2).map(m => `Role: ${m.role}\nContent: ${m.text.substring(0, 300)}`).join('\n\n');
      
      const prompt = `
        You are CuraLink AI, a specialized medical research assistant. 
        
        CONVERSATION HISTORY:
        ${historySnippet || 'New Session'}

        USER QUESTION: "${userInput}"
        CONTEXT: ${JSON.stringify(context)}
        
        RESEARCH DATA (PUBLICATIONS): ${JSON.stringify(publications?.slice(0, 6).map(p => ({
          title: p.title,
          year: p.year,
          abstract: p.abstract?.substring(0, 800), // Truncate to save tokens
          authors: p.authors
        })))}
        CLINICAL TRIALS: ${JSON.stringify(clinicalTrials?.slice(0, 6).map(t => ({
          title: t.title,
          status: t.status,
          eligibility: t.eligibility?.substring(0, 500)
        })))}
        
        INSTRUCTIONS:
        1. Answer the USER QUESTION using the RESEARCH DATA and CONVERSATION HISTORY.
        2. STRUCTURE: 
           - **Condition Overview**: Summarize the current understanding of the medical condition.
           - **Key Research Insights**: Synthesize findings from the provided publications.
           - **Ongoing Clinical Trials**: Detail relevant trials, their status, and eligibility.
        3. SOURCE ATTRIBUTION (CRITICAL): For every major claim, cite using this format:
           - [Title | Authors | Year | Platform | URL | Supporting Snippet]
        4. Maintain continuity from previous turns. If they ask follow-up questions, use history for context.
        5. Generate a professional, empathetic, and research-backed response in Markdown.
      `;

      const completion = await groq.chat.completions.create({
        messages: [{ role: 'user', content: prompt }],
        model: 'llama-3.3-70b-versatile',
      });

      return completion.choices[0].message.content;
    } catch (error) {
      console.error("Summary Generation Error:", error.message);
      return "Error synthesizing data with context.";
    }
  }
}

module.exports = new AIService();
