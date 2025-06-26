const express = require('express');
const bodyParser = require('body-parser');
const cors = require('cors');
const { generateQueryFromPrompt, generateHTMLFromData } = require('./llm');
const { executeQuery } = require('./db');
const { escapeHTML } = require('./utils');
require('dotenv').config();

const app = express();
const PORT = process.env.PORT || 3000;

app.use(cors());
app.use(bodyParser.json());

app.post('/query/html', async (req, res) => {
  const userPrompt = req.body.prompt;
  if (!userPrompt) {
    res.set('Content-Type', 'text/html');
    return res.status(400).send(`
      <div style="font-family: sans-serif; color: #d32f2f; padding: 20px; text-align: center;">
        <h1>Error</h1>
        <p>Prompt is required in the request body.</p>
      </div>
    `);
  }

  try {
    const rawSql = await generateQueryFromPrompt(userPrompt);
    const result = await executeQuery(rawSql);

    if (!result || result.length === 0) {
      throw new Error('No data found matching your query.');
    }

    const htmlOutput = await generateHTMLFromData(userPrompt, result);
    res.set('Content-Type', 'text/html');
    res.status(200).send(htmlOutput);
  } catch (error) {
    console.error('❌ Error:', error.message);
    res.set('Content-Type', 'text/html');
    res.status(500).send(`
     <div style="font-family: sans-serif; color: #d32f2f; padding: 20px; text-align: center;">
  <h3>Oops! Something went wrong.</h3>
  <p>${escapeHTML(error.message)}</p>
  <p>Tip: Try rephrasing your question, for example: "What are the top selling products this month?" or "Show me sales trends for the past months."</p>
</div>

    `);
  }
});

app.listen(PORT, () => {
  console.log(`🚀 Server running at http://localhost:${PORT}`);
});