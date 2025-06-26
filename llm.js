const { GoogleGenerativeAI } = require('@google/generative-ai');
require('dotenv').config();
const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY || 'AIzaSyAO4Ws-bwVE09LBVtDDbB1P7UtoQvopeP4');
const { extractSchema } = require('./schema');


async function generateQueryFromPrompt(prompt) {
  try {
    const schemaText = await extractSchema();
    const finalPrompt = `
      You are a MSSQL expert. Generate only valid MSSQL SELECT query.

      User prompt: "${prompt}"

      Schema:
      \n\n${schemaText}\n\n
      - Only return SELECT queries.
      - No comments, no markdown.
      - No INSERT, DELETE, or UPDATE.
      - Ensure correct syntax.
      - Avoid explanations.
    `;
    //console.log('user promt + table schema:',finalPrompt);
    //console.dir(finalPrompt, { depth: null, colors: true });

    console.dir(finalPrompt, { depth: null, maxArrayLength: null });

    const model = genAI.getGenerativeModel({ model: 'gemini-1.5-flash' });
    const result = await model.generateContent(finalPrompt);
    let query = (await result.response.text()).trim();
    console.log('Query :',query.replace(/```sql|```/g, '').trim());
    return query.replace(/```sql|```/g, '').trim();
  } catch (err) {
    console.error('❌ Error generating query:', err.message);
    throw new Error('Failed to generate SQL query.');
  }
}
/*
async function generateHTMLFromData(prompt, data) {






  try {
    const model = genAI.getGenerativeModel({ model: 'gemini-1.5-flash' });
    const htmlPrompt = `
      You are a frontend developer. Render an HTML view based on this prompt and JSON data.
      Prompt: "${prompt}"
      Data: ${JSON.stringify(data, null, 2)}

      Return standalone HTML only. No explanations. Include CSS/JS if needed.
      if you showing inly place amoun
    `;

    const result = await model.generateContent(htmlPrompt);
    let html = (await result.response.text()).trim();
    return html.replace(/^```html/, '').replace(/```$/, '').trim();
  } catch (err) {
    console.error('❌ Error generating HTML:', err.message);
    throw new Error('Failed to generate HTML.');
  }
}
*/


async function generateHTMLFromData(prompt, data) {
  const dataString = JSON.stringify(data);
  const MAX_DATA_SIZE = 1000;

  if (dataString.length <= MAX_DATA_SIZE) {
    try {
      const model = genAI.getGenerativeModel({ model: 'gemini-1.5-flash' });

      const htmlPrompt = `
        You are a frontend developer. Render an HTML view based on this prompt and JSON data.
        Prompt: "${prompt}"
        Data: ${JSON.stringify(data, null, 2)}

        Return standalone HTML only. No explanations. Include CSS/JS if needed.
        If you're showing only place and amount, format them properly.
      `;

      const result = await model.generateContent(htmlPrompt);
      let html = (await result.response.text()).trim();
      return html.replace(/^```html/, '').replace(/```$/, '').trim();
    } catch (err) {
      console.error('❌ Error generating HTML:', err.message);
      throw new Error('Failed to generate HTML.');
    }
  } else {
    // Manually generate HTML table for large data
    return generateHTMLTable(data);
  }
}

// Helper function to create an HTML table manually
function generateHTMLTable(data) {
  if (!Array.isArray(data) || data.length === 0) {
    return '<p>No data available to display.</p>';
  }

  const headers = Object.keys(data[0]);

  let table = `
    <table border="1" cellpadding="8" cellspacing="0" style="width: 100%; border-collapse: collapse;">
      <thead>
        <tr>
          ${headers.map(h => `<th style="background-color: #f2f2f2;">${h}</th>`).join('')}
        </tr>
      </thead>
      <tbody>
        ${data.map(row => `
          <tr>
            ${headers.map(h => `<td>${row[h] !== undefined ? row[h] : ''}</td>`).join('')}
          </tr>
        `).join('')}
      </tbody>
    </table>
  `;

  return table;
}

module.exports = { generateQueryFromPrompt, generateHTMLFromData };