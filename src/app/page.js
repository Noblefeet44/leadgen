"use client";

import { useState, useEffect } from "react";
import { Search, Download, Settings, Cloud, Loader2, Sparkles, Database } from "lucide-react";

export default function Dashboard() {
  // Settings State
  const [showSettings, setShowSettings] = useState(false);
  const [geminiKey, setGeminiKey] = useState("");
  const [vibeKey, setVibeKey] = useState("");
  const [airtableToken, setAirtableToken] = useState("");
  const [airtableBaseId, setAirtableBaseId] = useState("");
  const [airtableTable, setAirtableTable] = useState("");

  // Search State
  const [prompt, setPrompt] = useState("");
  const [leadCount, setLeadCount] = useState(10);
  const [isLoading, setIsLoading] = useState(false);
  const [results, setResults] = useState([]);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  
  // Airtable Sync State
  const [isSyncing, setIsSyncing] = useState(false);

  useEffect(() => {
    // Load saved settings
    setGeminiKey(localStorage.getItem("geminiKey") || "");
    setVibeKey(localStorage.getItem("vibeKey") || "");
    setAirtableToken(localStorage.getItem("airtableToken") || "");
    setAirtableBaseId(localStorage.getItem("airtableBaseId") || "");
    setAirtableTable(localStorage.getItem("airtableTable") || "Leads");
  }, []);

  const saveSettings = () => {
    localStorage.setItem("geminiKey", geminiKey);
    localStorage.setItem("vibeKey", vibeKey);
    localStorage.setItem("airtableToken", airtableToken);
    localStorage.setItem("airtableBaseId", airtableBaseId);
    localStorage.setItem("airtableTable", airtableTable);
    setShowSettings(false);
    setSuccess("Settings saved successfully.");
    setTimeout(() => setSuccess(""), 3000);
  };

  const handleSearch = async () => {
    if (!prompt) return setError("Please enter a search prompt.");
    if (!geminiKey || !vibeKey) return setError("Please configure API keys in Settings first.");

    setIsLoading(true);
    setError("");
    setResults([]);

    try {
      const res = await fetch("/api/prospect", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ prompt, count: leadCount, geminiKey, vibeKey })
      });
      
      const data = await res.json();
      
      if (!res.ok) {
        throw new Error(data.error || "Failed to fetch leads");
      }
      
      setResults(data.leads || []);
    } catch (err) {
      setError(err.message);
    } finally {
      setIsLoading(false);
    }
  };

  const handleExportCSV = () => {
    if (!results.length) return;
    
    const headers = ["Name", "Job Title", "Company", "Email", "LinkedIn", "Country"];
    const csvContent = [
      headers.join(","),
      ...results.map(r => [
        `"${r.name || ""}"`,
        `"${r.job_title || ""}"`,
        `"${r.company?.name || ""}"`,
        `"${r.email || ""}"`,
        `"${r.linkedin || ""}"`,
        `"${r.country || ""}"`
      ].join(","))
    ].join("\n");

    const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" });
    const link = document.createElement("a");
    const url = URL.createObjectURL(blob);
    link.setAttribute("href", url);
    link.setAttribute("download", "vibe_leads.csv");
    link.style.visibility = "hidden";
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const handleSyncAirtable = async () => {
    if (!results.length) return;
    if (!airtableToken || !airtableBaseId || !airtableTable) {
      return setError("Please configure Airtable settings first.");
    }

    setIsSyncing(true);
    setError("");
    setSuccess("");

    try {
      const res = await fetch("/api/airtable", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          leads: results,
          token: airtableToken,
          baseId: airtableBaseId,
          tableName: airtableTable
        })
      });

      const data = await res.json();
      
      if (!res.ok) throw new Error(data.error || "Failed to sync with Airtable");
      
      setSuccess(`Successfully synced ${data.count} leads to Airtable!`);
      setTimeout(() => setSuccess(""), 5000);
    } catch (err) {
      setError(err.message);
    } finally {
      setIsSyncing(false);
    }
  };

  return (
    <div className="container animate-in">
      <header style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "2rem" }}>
        <div>
          <h1 className="text-gradient" style={{ display: "flex", alignItems: "center", gap: "10px", fontSize: "2rem" }}>
            <Sparkles size={32} /> Vibe Prospecting
          </h1>
          <p style={{ color: "var(--text-muted)", marginTop: "0.5rem" }}>
            AI-powered lead generation dashboard
          </p>
        </div>
        <button className="btn" onClick={() => setShowSettings(!showSettings)}>
          <Settings size={20} /> Settings
        </button>
      </header>

      {error && <div style={{ background: "rgba(239, 68, 68, 0.2)", border: "1px solid #ef4444", padding: "12px", borderRadius: "8px", marginBottom: "1rem", color: "#fca5a5" }}>{error}</div>}
      {success && <div style={{ background: "rgba(34, 197, 94, 0.2)", border: "1px solid #22c55e", padding: "12px", borderRadius: "8px", marginBottom: "1rem", color: "#86efac" }}>{success}</div>}

      {showSettings ? (
        <div className="glass-panel" style={{ padding: "2rem", marginBottom: "2rem" }}>
          <h2 style={{ marginBottom: "1.5rem" }}>Configuration</h2>
          <div className="grid grid-cols-2">
            <div>
              <label style={{ display: "block", marginBottom: "0.5rem", fontSize: "0.9rem", color: "var(--text-muted)" }}>Gemini API Key</label>
              <input type="password" value={geminiKey} onChange={e => setGeminiKey(e.target.value)} className="input-field" placeholder="AI Studio Key for prompt translation" />
            </div>
            <div>
              <label style={{ display: "block", marginBottom: "0.5rem", fontSize: "0.9rem", color: "var(--text-muted)" }}>Vibe Prospecting API Key</label>
              <input type="password" value={vibeKey} onChange={e => setVibeKey(e.target.value)} className="input-field" placeholder="Explorium / Vibe API Key" />
            </div>
            <div>
              <label style={{ display: "block", marginBottom: "0.5rem", fontSize: "0.9rem", color: "var(--text-muted)" }}>Airtable PAT</label>
              <input type="password" value={airtableToken} onChange={e => setAirtableToken(e.target.value)} className="input-field" placeholder="Airtable Personal Access Token" />
            </div>
            <div>
              <label style={{ display: "block", marginBottom: "0.5rem", fontSize: "0.9rem", color: "var(--text-muted)" }}>Airtable Base ID</label>
              <input type="text" value={airtableBaseId} onChange={e => setAirtableBaseId(e.target.value)} className="input-field" placeholder="e.g. appXXXXXXXXXXXXXX" />
            </div>
            <div>
              <label style={{ display: "block", marginBottom: "0.5rem", fontSize: "0.9rem", color: "var(--text-muted)" }}>Airtable Table Name</label>
              <input type="text" value={airtableTable} onChange={e => setAirtableTable(e.target.value)} className="input-field" placeholder="Default: Leads" />
            </div>
          </div>
          <div style={{ marginTop: "1.5rem", display: "flex", justifyContent: "flex-end" }}>
            <button className="btn btn-primary" onClick={saveSettings}>Save Settings</button>
          </div>
        </div>
      ) : null}

      <div className="glass-panel" style={{ padding: "2rem", marginBottom: "2rem" }}>
        <div style={{ marginBottom: "1.5rem" }}>
          <label style={{ display: "block", marginBottom: "0.5rem", fontWeight: "600" }}>Describe your ideal leads</label>
          <textarea 
            className="input-field" 
            style={{ minHeight: "100px", resize: "vertical" }}
            placeholder="e.g. Find me software engineering managers at tech companies in San Francisco with revenue over $1M..."
            value={prompt}
            onChange={e => setPrompt(e.target.value)}
          />
        </div>
        
        <div style={{ display: "flex", alignItems: "center", gap: "2rem", flexWrap: "wrap" }}>
          <div style={{ flex: 1, minWidth: "200px" }}>
            <label style={{ display: "flex", justifyContent: "space-between", marginBottom: "0.5rem", fontSize: "0.9rem", color: "var(--text-muted)" }}>
              <span>Target Lead Count</span>
              <span>{leadCount} leads</span>
            </label>
            <input 
              type="range" 
              min="1" 
              max="500" 
              value={leadCount} 
              onChange={e => setLeadCount(parseInt(e.target.value))} 
              style={{ width: "100%", accentColor: "var(--brand-primary)" }}
            />
          </div>
          
          <button 
            className="btn btn-primary" 
            style={{ padding: "12px 32px", fontSize: "1.1rem" }}
            onClick={handleSearch}
            disabled={isLoading}
          >
            {isLoading ? <><Loader2 className="animate-spin" /> Searching...</> : <><Search /> Generate Leads</>}
          </button>
        </div>
      </div>

      {results.length > 0 && (
        <div className="glass-panel animate-in" style={{ padding: "2rem" }}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "1.5rem" }}>
            <h2 style={{ display: "flex", alignItems: "center", gap: "8px" }}>
              <Database size={24} color="var(--brand-primary)" /> Found {results.length} Leads
            </h2>
            <div style={{ display: "flex", gap: "10px" }}>
              <button className="btn" onClick={handleExportCSV}>
                <Download size={18} /> Export CSV
              </button>
              <button className="btn btn-primary" onClick={handleSyncAirtable} disabled={isSyncing}>
                {isSyncing ? <Loader2 size={18} className="animate-spin" /> : <Cloud size={18} />} 
                Sync to Airtable
              </button>
            </div>
          </div>
          
          <div style={{ overflowX: "auto", background: "rgba(0,0,0,0.2)", borderRadius: "var(--radius-md)" }}>
            <table style={{ width: "100%", borderCollapse: "collapse", textAlign: "left" }}>
              <thead>
                <tr style={{ borderBottom: "1px solid var(--border-glass)" }}>
                  <th style={{ padding: "12px 16px", color: "var(--text-muted)", fontWeight: "600" }}>Name</th>
                  <th style={{ padding: "12px 16px", color: "var(--text-muted)", fontWeight: "600" }}>Job Title</th>
                  <th style={{ padding: "12px 16px", color: "var(--text-muted)", fontWeight: "600" }}>Company</th>
                  <th style={{ padding: "12px 16px", color: "var(--text-muted)", fontWeight: "600" }}>Location</th>
                </tr>
              </thead>
              <tbody>
                {results.map((lead, idx) => (
                  <tr key={idx} style={{ borderBottom: "1px solid var(--border-glass)", background: idx % 2 === 0 ? "transparent" : "rgba(255,255,255,0.02)" }}>
                    <td style={{ padding: "12px 16px", fontWeight: "500" }}>{lead.name || "N/A"}</td>
                    <td style={{ padding: "12px 16px", color: "var(--text-muted)" }}>{lead.job_title || "N/A"}</td>
                    <td style={{ padding: "12px 16px" }}>{lead.company?.name || "N/A"}</td>
                    <td style={{ padding: "12px 16px", color: "var(--text-muted)" }}>{lead.country || "N/A"}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
      
      <style dangerouslySetInnerHTML={{__html: `
        .animate-spin {
          animation: spin 1s linear infinite;
        }
        @keyframes spin {
          from { transform: rotate(0deg); }
          to { transform: rotate(360deg); }
        }
      `}} />
    </div>
  );
}
