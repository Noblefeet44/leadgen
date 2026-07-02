import { NextResponse } from "next/server";
import { GoogleGenerativeAI } from "@google/generative-ai";

export async function POST(req) {
  try {
    let { prompt, count, geminiKey, vibeKey } = await req.json();
    
    geminiKey = geminiKey || process.env.GEMINI_API_KEY;
    vibeKey = vibeKey || process.env.VIBE_API_KEY;

    if (!prompt || !geminiKey || !vibeKey) {
      return NextResponse.json({ error: "Missing required fields or API keys." }, { status: 400 });
    }

    // Initialize Gemini
    const genAI = new GoogleGenerativeAI(geminiKey);
    // Use gemini-2.5-flash as the fast reliable model
    const model = genAI.getGenerativeModel({ model: "gemini-2.5-flash" });

    // Step 1: Translate natural language to Vibe Prospecting structured filters
    const sysPrompt = `
      You are an expert lead generation AI. 
      Convert the user's natural language request into a JSON object representing the 'filters' object for the Vibe Prospecting API (/v1/prospects).
      
      Supported filter fields include:
      - job_title: { "values": ["title1", "title2"], "include_related_job_titles": true/false }
      - company_country_code: { "values": ["US", "GB", etc (alpha-2 codes)] }
      - company_name: { "values": ["Meta", "Google"] }
      - company_revenue: { "values": ["0-500K", "500K-1M", "1M-5M", "5M-10M", "10M-25M", "25M-75M", "75M-200M", "200M-500M", "500M-1B", "1B-10B", "10B-100B"] }
      - linkedin_category: { "values": ["software development", "retail"] }
      - has_website: { "value": true/false }

      Output ONLY valid JSON.
    `;

    const chatResponse = await model.generateContent(
      sysPrompt + "\n\nUser request: " + prompt
    );
    
    let filterJsonText = chatResponse.response.text();
    // clean up any markdown formatting
    filterJsonText = filterJsonText.replace(/```json/g, "").replace(/```/g, "").trim();
    
    let filters = {};
    try {
      filters = JSON.parse(filterJsonText);
    } catch (e) {
      console.error("Gemini output parsing failed:", filterJsonText);
      return NextResponse.json({ error: "Failed to parse AI translated filters." }, { status: 500 });
    }

    // If Gemini nested it under a "filters" key, extract it
    const actualFilters = filters.filters ? filters.filters : filters;

    // Step 2: Fetch leads from Vibe Prospecting API
    const vibePayload = {
      mode: "full",
      size: Math.min(count || 10, 500),
      page_size: Math.min(count || 10, 500),
      filters: actualFilters
    };

    const vibeResponse = await fetch("https://api.explorium.ai/v1/prospects", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "api_key": vibeKey
      },
      body: JSON.stringify(vibePayload)
    });

    if (!vibeResponse.ok) {
      const errText = await vibeResponse.text();
      console.error("Vibe API Error:", errText);
      return NextResponse.json({ error: "Vibe Prospecting API failed: " + errText }, { status: vibeResponse.status });
    }

    const vibeData = await vibeResponse.json();
    
    // Normalize response for frontend
    const leads = (vibeData.prospects || []).map(p => ({
      name: p.person?.name || "Unknown",
      job_title: p.person?.job_title || "",
      company: p.company || {},
      email: p.person?.email || "",
      linkedin: p.person?.linkedin_url || "",
      country: p.company?.location?.country_code || ""
    }));

    return NextResponse.json({ leads, filters_applied: filters });

  } catch (error) {
    console.error("Prospect API Error:", error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
