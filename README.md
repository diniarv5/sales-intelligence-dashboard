# 📊 AI Sales Intelligence Dashboard

An AI-powered Business Intelligence Dashboard designed to support data-driven decision making through interactive analytics, anomaly detection, executive reporting, and AI-generated business insights.

## 🚀 Overview

This project combines traditional Business Intelligence techniques with Large Language Models (LLM) to help users analyze sales performance, identify business anomalies, and generate actionable recommendations.

The dashboard provides:

- Executive business summary
- Key performance indicators (KPIs)
- Sales performance analytics
- Business anomaly detection
- AI-generated insights and recommendations
- Interactive Tableau dashboard
- AI business assistant powered by Groq LLM

---

## ✨ Features

### 📈 Executive Dashboard

Provides a high-level overview of business performance, including:

- Total Sales
- Total Profit
- Profit Margin
- Total Orders
- Total Customers
- Business Health Score

### 📊 Interactive Analytics

Built using D3.js visualizations:

- Sales Trend Analysis
- Profit by Territory
- Top Subcategory Profit
- Territory Contribution Analysis

### 🚨 Anomaly Detection

Automatically highlights unusual business conditions such as:

- Revenue concentration risks
- Declining territory performance
- Low-margin product segments
- Profitability anomalies

### 🤖 AI Business Insights

Generates executive-level business insights and recommendations based on dashboard metrics.

Example outputs:

- Revenue concentration analysis
- Territory performance recommendations
- Product opportunity identification
- Business risk assessment

### 💬 AI Assistant

Users can ask natural language questions such as:

- Which territory generates the highest profit?
- What is the biggest business risk?
- Which products should be prioritized?
- How can profit margins be improved?

Powered by:

- Groq API
- Llama 3.1 8B

### 📉 Tableau Dashboard

Interactive Tableau Public dashboard for advanced exploration and reporting.

---

## 🛠️ Technology Stack

### Frontend

- HTML5
- CSS3
- JavaScript (ES6)

### Data Visualization

- D3.js
- Tableau Public

### Artificial Intelligence

- Groq API
- Llama 3.1 8B

### Deployment

- Vercel

---

## 📂 Project Structure

```text
project/
│
├── api/
│   └── chat.js
│
├── css/
│   ├── style.css
│   └── tableau.css
│
├── js/
│   ├── app.js
│   └── ai.js
│
├── index.html
├── tableau.html
├── vercel.json
├── .env
└── README.md
```

---

## ⚙️ Installation

Clone the repository:

```bash
git clone https://github.com/yourusername/ai-sales-intelligence-dashboard.git
```

Move into the project folder:

```bash
cd ai-sales-intelligence-dashboard
```

Install dependencies:

```bash
npm install
```

Create a `.env` file:

```env
GROQ_API_KEY=your_groq_api_key
```

Run locally:

```bash
vercel dev
```

---

## 🌐 Deployment

This project is deployed using Vercel.

Required Environment Variables:

```env
GROQ_API_KEY=your_groq_api_key
```

Deploy:

```bash
vercel
```

---

## 📸 Dashboard Modules

### Executive Business Summary

Provides a concise overview of business performance and health.

### KPI Monitoring

Tracks key business metrics in real time.

### Business Anomaly Monitoring

Detects unusual patterns and performance risks.

### Sales Performance Analytics

Visualizes trends, territory performance, and product profitability.

### AI Business Insights

Transforms analytical findings into actionable recommendations.

### AI Assistant

Natural language interface for business analysis.

---

## 🎯 Business Value

This dashboard helps organizations:

- Monitor sales performance
- Improve decision making
- Detect business risks early
- Identify growth opportunities
- Generate executive-level insights
- Reduce manual reporting efforts

---

## 👨‍💻 Author

Developed as a Business Intelligence and Data Analytics project combining:

- Data Visualization
- Business Intelligence
- Artificial Intelligence
- Executive Reporting

---

## 📄 License

This project is intended for educational and portfolio purposes.
