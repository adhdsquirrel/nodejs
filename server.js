const express = require('express');
const cors = require('cors');
const fetch = require('node-fetch');
const app = express();

app.use(cors());
app.use(express.json());
app.use(express.static('public'));

// Sample documentation database
const documentDatabase = [
  {
    model: 'Canon imageRUNNER C5560i',
    errorCode: 'E000-0001',
    issue: 'Paper jam in tray 1',
    solution: 'Open tray 1, remove any visible paper. Check feed rollers for wear. Clean pickup roller with damp cloth. Reset error code by pressing Stop button for 3 seconds.'
  },
  {
    model: 'Xerox WorkCentre 7845',
    errorCode: 'E016-359',
    issue: 'Fuser unit temperature error',
    solution: 'Turn off machine and wait 30 minutes to cool. Check fuser unit connections. Verify thermistor is properly seated. If error persists, replace fuser unit (part #008R13063).'
  },
  {
    model: 'HP LaserJet M633',
    errorCode: '49.4C02',
    issue: 'Firmware error',
    solution: 'Power cycle the device. Remove all network cables and USB connections. Turn on device. If error clears, reconnect cables one at a time. Update firmware to latest version.'
  },
  {
    model: 'Ricoh MP C6004',
    errorCode: 'SC542',
    issue: 'Polygon motor error',
    solution: 'Turn off main power switch. Wait 10 seconds. Turn back on. If error persists, check polygon motor connections. Inspect laser unit for obstructions.'
  }
];

// Secure API endpoint
app.post('/api/search', async (req, res) => {
  const { query } = req.body;
  
  if (!query) {
    return res.status(400).json({ error: 'Query is required' });
  }

  try {
    const apiKey = process.env.ANTHROPIC_API_KEY;
    
    if (!apiKey) {
      return res.status(500).json({ 
        error: 'API key not configured. Add ANTHROPIC_API_KEY to Railway variables.' 
      });
    }

    const response = await fetch("https://api.anthropic.com/v1/messages", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "x-api-key": apiKey,
        "anthropic-version": "2023-06-01"
      },
      body: JSON.stringify({
        model: "claude-sonnet-4-20250514",
        max_tokens: 1500,
        messages: [
          {
            role: "user",
            content: `You are a copier service technician AI assistant. Based on the following service manual documentation, provide troubleshooting steps for this query: "${query}"

Documentation:
${documentDatabase.map(doc => `
Model: ${doc.model}
Error Code: ${doc.errorCode}
Issue: ${doc.issue}
Solution: ${doc.solution}
---`).join('\n')}

Provide a clear, step-by-step response. If you find a matching error code or similar issue, reference it. If no exact match, provide general troubleshooting guidance.

Format your response as JSON with this structure:
{
  "relevantDocs": ["model names or error codes that match"],
  "confidence": "high/medium/low",
  "solution": "step-by-step solution",
  "additionalNotes": "any warnings or additional context"
}`
          }
        ]
      })
    });

    const data = await response.json();
    const textContent = data.content?.find(item => item.type === 'text')?.text || '';
    
    const jsonMatch = textContent.match(/\{[\s\S]*\}/);
    if (jsonMatch) {
      const parsed = JSON.parse(jsonMatch[0]);
      res.json(parsed);
    } else {
      res.json({
        relevantDocs: [],
        confidence: 'medium',
        solution: textContent,
        additionalNotes: ''
      });
    }
  } catch (error) {
    console.error('Error:', error);
    res.status(500).json({
      error: 'Failed to process request',
      details: error.message
    });
  }
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});
