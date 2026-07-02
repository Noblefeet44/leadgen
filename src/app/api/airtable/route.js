import { NextResponse } from "next/server";
import Airtable from "airtable";

export async function POST(req) {
  try {
    let { leads, token, baseId, tableName } = await req.json();
    
    token = token || process.env.AIRTABLE_PAT;
    baseId = baseId || process.env.AIRTABLE_BASE_ID;
    tableName = tableName || process.env.AIRTABLE_TABLE_NAME;

    if (!leads || !token || !baseId || !tableName) {
      return NextResponse.json({ error: "Missing required Airtable configuration or leads data." }, { status: 400 });
    }

    // Configure Airtable
    Airtable.configure({
      endpointUrl: "https://api.airtable.com",
      apiKey: token
    });
    
    const base = Airtable.base(baseId);
    const table = base(tableName);

    // Prepare records
    // Airtable create() takes up to 10 records at a time
    const records = leads.map(lead => ({
      fields: {
        "Name": lead.name || "",
        "Job Title": lead.job_title || "",
        "Company": lead.company?.name || "",
        "Email": lead.email || "",
        "LinkedIn": lead.linkedin || "",
        "Country": lead.country || ""
      }
    }));

    // Process in chunks of 10
    const chunkSize = 10;
    let createdCount = 0;
    
    for (let i = 0; i < records.length; i += chunkSize) {
      const chunk = records.slice(i, i + chunkSize);
      await new Promise((resolve, reject) => {
        table.create(chunk, (err, createdRecords) => {
          if (err) {
            console.error("Airtable creation error:", err);
            return reject(err);
          }
          createdCount += createdRecords.length;
          resolve();
        });
      });
    }

    return NextResponse.json({ success: true, count: createdCount });

  } catch (error) {
    console.error("Airtable Sync Error:", error);
    return NextResponse.json({ error: error.message || "Airtable sync failed" }, { status: 500 });
  }
}
