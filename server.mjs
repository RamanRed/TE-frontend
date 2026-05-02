import express from "express"
import puppeteer from "puppeteer"
import cors from "cors"

const app = express()
app.use(cors({ origin: "*" }))
app.use(express.json())

// ✅ Transform YOUR JSON → UI format
function transformData(input) {
  const output = {}
  console.log(input)

  input.data.forEach(section => {
    output[section.category] = section.result.map(item => ({
      title: item.sub_category,
      description: item.cause,
      evidence: item.evidence,
      level: item.severity,
      severity: item.severity
    }))
  })

  return output
}

// ✅ Transform 5-Why JSON → UI format
function transformDataFiveWhy(input) {
  const output = {}
  console.log(input)

  output["5-Why Analysis"] = input.analysis.map(chain => ({
    title: chain.root_cause,
    description: chain.why_chain.map(step => `Why ${step.level}: ${step.question}\nAnswer: ${step.answer}`).join('\n\n'),
    evidence: `Confidence: ${Math.round(chain.confidence * 100)}%`,
    level: chain.confidence > 0.8 ? 'high' : chain.confidence > 0.5 ? 'medium' : 'low',
    severity: chain.confidence > 0.8 ? 'high' : chain.confidence > 0.5 ? 'medium' : 'low'
  }))

  return output
}
// ✅ Generate HTML UI
function generateHTML(data, problem) {
  const renderSection = (title, items) => `
    <div class="section">
      <h2>${title}</h2>
      ${items.map(item => {
        const causeLabel = item.severity.toLowerCase() === "high"
          ? "Confirmed as Cause"
          : item.severity.toLowerCase() === "medium"
            ? "Possible as Cause"
            : "Excluded as Cause"

        return `
        <div class="card">
          <div class="card-title">${item.title}</div>

          <div class="desc">${item.description}</div>

          <div class="meta">
            <span class="evidence">${item.evidence}</span>
          </div>

          <div class="footer">
            <span>${causeLabel}</span>
          </div>
        </div>
      `
      }).join("")}
    </div>
  `

  return `
  <html>
  <head>
    <style>
      body {
        font-family: Arial, sans-serif;
        background: #f5f7fa;
        padding: 20px;
      }

      h1 {
        text-align: center;
        margin-bottom: 25px;
      }

      .grid {
        display: grid;
        grid-template-columns: repeat(3, 1fr);
        gap: 20px;
      }

      .section {
        background: #fff;
        border-radius: 10px;
        padding: 15px;
        border-top: 5px solid #2b6cb0;
        box-shadow: 0 2px 6px rgba(0,0,0,0.08);
      }

      h2 {
        margin-bottom: 10px;
        color: #2b6cb0;
      }

      .card {
        border: 1px solid #ddd;
        border-radius: 8px;
        padding: 10px;
        margin-bottom: 10px;
        background: #fafafa;
      }

      .card-title {
        font-weight: bold;
        margin-bottom: 5px;
      }

      .desc {
        font-size: 13px;
        margin-bottom: 8px;
        color: #333;
      }

      .meta, .footer {
        display: flex;
        justify-content: space-between;
        align-items: center;
        font-size: 12px;
        margin-top: 5px;
      }

      .badge {
        padding: 3px 8px;
        border-radius: 6px;
        font-size: 11px;
        color: white;
      }

      .high { background: #e53e3e; }
      .medium { background: #dd6b20; }
      .low { background: #38a169; }

      .evidence {
        color: #555;
        max-width: 70%;
      }
    </style>
  </head>

  <body>
    <h1>${problem || ""}</h1>

    <div class="grid">
      ${Object.keys(data).map(section =>
        renderSection(section, data[section])
      ).join("")}
    </div>
  </body>
  </html>
  `
}

// ✅ Generate HTML UI for 5-Why
function generateHTMLFiveWhy(data, problem) {
  const chains = data["5-Why Analysis"] || []

  return `
  <html>
  <head>
    <style>
      body {
        font-family: Arial, sans-serif;
        background: #f5f7fa;
        padding: 20px;
        line-height: 1.6;
      }

      h1 {
        text-align: center;
        margin-bottom: 30px;
        color: #2b6cb0;
      }

      .chains {
        display: flex;
        flex-direction: column;
        gap: 20px;
      }

      .chain {
        background: #fff;
        border-radius: 10px;
        padding: 20px;
        border-top: 5px solid #2b6cb0;
        box-shadow: 0 2px 6px rgba(0,0,0,0.08);
      }

      .chain h3 {
        margin: 0 0 10px 0;
        color: #2b6cb0;
        font-size: 18px;
      }

      .confidence {
        font-weight: bold;
        margin-bottom: 15px;
        color: #555;
      }

      .steps {
        margin-top: 15px;
      }

      .step {
        background: #f9f9f9;
        border-left: 4px solid #ddd;
        padding: 10px 15px;
        margin-bottom: 10px;
        border-radius: 4px;
      }

      .step:last-child {
        margin-bottom: 0;
      }

      .root {
        font-weight: bold;
        font-size: 16px;
        margin-top: 15px;
        padding: 10px;
        background: #e8f4fd;
        border-radius: 4px;
        color: #2b6cb0;
      }
    </style>
  </head>

  <body>
    <h1>${problem || "5-Why Analysis"}</h1>

    <div class="chains">
      ${chains.map((chain, index) => `
        <div class="chain">
          <h3>Potential Cause ${index + 1}</h3>
          <div class="confidence">${chain.evidence}</div>
          <div class="steps">
            ${chain.description.split('\n\n').map(step => `<div class="step">${step}</div>`).join('')}
          </div>
          <div class="root">${chain.title}</div>
        </div>
      `).join('')}
    </div>
  </body>
  </html>
  `
}

// ✅ API Route
app.post("/generate", async (req, res) => {
  try {
    const rawData = req.body

    // Validate input
    if (!rawData.data || !Array.isArray(rawData.data)) {
      return res.status(400).json({ error: "Invalid input format" })
    }

    // Transform data
    const transformedData = transformData(rawData)

    // Generate HTML
    const html = generateHTML(transformedData, rawData.problem)

    // Launch browser
    const browser = await puppeteer.launch({
      args: ["--no-sandbox"]
    })

    const page = await browser.newPage()
    await page.setContent(html, { waitUntil: "networkidle0" })

    // Screenshot
    const buffer = await page.screenshot({
      fullPage: true
    })

    await browser.close()

    res.setHeader("Content-Type", "image/png")
    res.send(buffer)

  } catch (err) {
    console.error(err)
    res.status(500).json({ error: "Failed to generate image" })
  }
})

// ✅ API Route for 5-Why
app.post("/generate-five-why", async (req, res) => {
  try {
    const rawData = req.body

    // Validate input
    if (!rawData.analysis || !Array.isArray(rawData.analysis)) {
      return res.status(400).json({ error: "Invalid input format" })
    }

    // Transform data
    const transformedData = transformDataFiveWhy(rawData)

    // Generate HTML
    const html = generateHTMLFiveWhy(transformedData, rawData.problem)

    // Launch browser
    const browser = await puppeteer.launch({
      args: ["--no-sandbox"]
    })

    const page = await browser.newPage()
    await page.setContent(html, { waitUntil: "networkidle0" })

    // Screenshot
    const buffer = await page.screenshot({
      fullPage: true
    })

    await browser.close()

    res.setHeader("Content-Type", "image/png")
    res.send(buffer)

  } catch (err) {
    console.error(err)
    res.status(500).json({ error: "Failed to generate image" })
  }
})

// ✅ Start server
app.listen(4000, () => {
  console.log("Server running at http://localhost:4000")
})