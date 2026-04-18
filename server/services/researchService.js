const axios = require('axios');
const xml2js = require('xml2js');

class ResearchService {
  constructor() {
    this.parser = new xml2js.Parser({ explicitArray: false });
  }

  /**
   * PubMed API Integration with structured filters
   */
  async fetchPubMed(params, limit = 100) {
    const { searchTerm, filters } = params;
    try {
      // Build advanced term if filters exist
      let term = searchTerm;
      if (filters?.condition) term += ` AND (${filters.condition}[MeSH Terms])`;
      if (filters?.yearStart) term += ` AND (${filters.yearStart}:${filters.yearEnd || 2026}[Date - Publication])`;

      const searchUrl = `https://eutils.ncbi.nlm.nih.gov/entrez/eutils/esearch.fcgi?db=pubmed&term=${encodeURIComponent(term)}&retmax=${limit}&sort=pub+date&retmode=json`;
      const searchResponse = await axios.get(searchUrl);
      const idList = searchResponse.data.esearchresult.idlist;

      if (!idList || idList.length === 0) return [];

      const fetchUrl = `https://eutils.ncbi.nlm.nih.gov/entrez/eutils/efetch.fcgi?db=pubmed&id=${idList.join(',')}&retmode=xml`;
      const fetchResponse = await axios.get(fetchUrl);
      
      const parsedData = await this.parser.parseStringPromise(fetchResponse.data);
      const articles = parsedData.PubmedArticleSet.PubmedArticle;
      
      const articleArray = Array.isArray(articles) ? articles : [articles];

      return articleArray.map(item => {
        const article = item.MedlineCitation.Article;
        return {
          title: article.ArticleTitle,
          abstract: article.Abstract?.AbstractText || "No abstract available",
          authors: Array.isArray(article.AuthorList?.Author) 
            ? article.AuthorList.Author.map(a => `${a.LastName} ${a.Initials}`).join(', ')
            : article.AuthorList?.Author ? `${article.AuthorList.Author.LastName} ${article.AuthorList.Author.Initials}` : "Unknown",
          year: article.Journal.JournalIssue.PubDate.Year || "Unknown",
          source: "PubMed",
          url: `https://pubmed.ncbi.nlm.nih.gov/${item.MedlineCitation.PMID._ || item.MedlineCitation.PMID}/`,
          doi: article.ELocationID?._ || article.ELocationID || ""
        };
      });
    } catch (error) {
      console.error("PubMed Error:", error.message);
      return [];
    }
  }

  /**
   * Helper to reconstruct OpenAlex inverted abstract index
   */
  reconstructAbstract(index) {
    if (!index) return "No abstract available";
    try {
      const words = [];
      Object.entries(index).forEach(([word, positions]) => {
        positions.forEach(pos => { words[pos] = word; });
      });
      return words.join(' ').slice(0, 500);
    } catch (e) { return "Abstract processing error"; }
  }

  /**
   * OpenAlex API Integration with filters
   */
  async fetchOpenAlex(params, limit = 100) {
    const { searchTerm, filters } = params;
    try {
      let filterString = "";
      if (filters?.yearStart) filterString += `&filter=from_publication_date:${filters.yearStart}-01-01`;
      
      const url = `https://api.openalex.org/works?search=${encodeURIComponent(searchTerm)}${filterString}&per-page=${limit}&sort=relevance_score:desc`;
      const response = await axios.get(url);
      
      return response.data.results.map(work => ({
        title: work.display_name,
        abstract: this.reconstructAbstract(work.abstract_inverted_index),
        authors: work.authorships.map(a => a.author.display_name).join(', '),
        year: work.publication_year,
        source: "OpenAlex",
        url: work.doi || work.id,
        relevance: work.relevance_score
      }));
    } catch (error) {
      console.error("OpenAlex Error:", error.message);
      return [];
    }
  }

  /**
   * ClinicalTrials.gov API v2 with structured query
   */
  async fetchClinicalTrials(params, limit = 100) {
    const { searchTerm, filters } = params;
    try {
      // Build v2 query params
      const cond = filters?.condition || searchTerm;
      const status = filters?.status || "RECRUITING";
      const intervention = filters?.intervention ? `&query.intr=${encodeURIComponent(filters.intervention)}` : "";

      const url = `https://clinicaltrials.gov/api/v2/studies?query.cond=${encodeURIComponent(cond)}${intervention}&filter.overallStatus=${status}&pageSize=${limit}&format=json`;
      const response = await axios.get(url);
      
      return response.data.studies.map(study => {
        const protocol = study.protocolSection;
        return {
          title: protocol.identificationModule.briefTitle,
          status: protocol.statusModule.overallStatus,
          eligibility: protocol.eligibilityModule?.eligibilityCriteria || "See full trial for details",
          location: protocol.contactsLocationsModule?.locations?.[0]?.facility || "Multiple Locations",
          contact: protocol.contactsLocationsModule?.centralContacts?.[0]?.email || "Contact investigator",
          source: "ClinicalTrials.gov",
          url: `https://clinicaltrials.gov/study/${protocol.identificationModule.nctId}`
        };
      });
    } catch (error) {
      console.error("ClinicalTrials Error:", error.message);
      return [];
    }
  }

  /**
   * Intelligent Ranking System (Depth then Precision)
   */
  rankResults(results, params) {
    const { filters } = params;
    const { publications, clinicalTrials } = results;
    const { condition, intervention } = filters || {};

    const score = (item) => {
      let s = 0;
      const title = (item.title || "").toLowerCase();
      const abstract = (item.abstract || "").toLowerCase();
      
      if (condition && (title.includes(condition.toLowerCase()) || abstract.includes(condition.toLowerCase()))) s += 40;
      if (intervention && (title.includes(intervention.toLowerCase()) || abstract.includes(intervention.toLowerCase()))) s += 30;
      
      // Recency boost (last 3 years)
      const currentYear = new Date().getFullYear();
      if (item.year && (currentYear - parseInt(item.year)) <= 3) s += 5;

      // Source credibility boost (PubMed preferred for medicine)
      if (item.source === "PubMed") s += 3;
      
      return s;
    };

    // Sort and slice to top 8 (as per Project.md expectations)
    return {
      publications: publications.sort((a, b) => score(b) - score(a)).slice(0, 8),
      clinicalTrials: clinicalTrials.sort((a, b) => score(b) - score(a)).slice(0, 8)
    };
  }

  /**
   * Aggregated Deep Retrieval + Ranking
   */
  async searchAll(structuredParams) {
    // Increased limit for "Depth First" (Broad candidate pool 50-300 as per Project.md)
    const deepLimit = 200;

    const [pubmed, openalex, trials] = await Promise.all([
      this.fetchPubMed(structuredParams, deepLimit),
      this.fetchOpenAlex(structuredParams, deepLimit),
      this.fetchClinicalTrials(structuredParams, deepLimit)
    ]);

    const aggregated = {
      publications: [...pubmed, ...openalex],
      clinicalTrials: trials
    };

    // Apply ranking and filtering
    return this.rankResults(aggregated, structuredParams);
  }
}

module.exports = new ResearchService();
