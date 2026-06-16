function localBusinessAnswer(
    question,
    data
) {

    const q =
        question.toLowerCase();

    // profit wilayah terendah

    if (
        q.includes("profit terendah")
        &&
        q.includes("wilayah")
    ) {

        const lowest =
            [...data.territoryProfit]
                .sort(
                    (a, b) =>
                        a.Profit - b.Profit
                )[0];

        return `
📊 Insight

Wilayah dengan profit terendah adalah
${lowest.Territory}

📌 Evidence

Profit:
$${Math.round(
            lowest.Profit
        ).toLocaleString()}

🚀 Recommendation

Perlu evaluasi strategi
penjualan di wilayah ini.
`;
    }

    // profit wilayah tertinggi

    if (
        q.includes("profit tertinggi")
        &&
        q.includes("wilayah")
    ) {

        const top =
            data.territoryProfit[0];

        return `
📊 Insight

Wilayah dengan profit tertinggi adalah
${top.Territory}

📌 Evidence

Profit:
$${Math.round(
            top.Profit
        ).toLocaleString()}

🚀 Recommendation

Jadikan wilayah ini sebagai
benchmark strategi bisnis.
`;
    }

    return null;

}

async function askGroq(
    question,
    dashboardData
) {

    // =====================
    // RULE BASED ANSWER
    // =====================

    const localAnswer =
        localBusinessAnswer(
            question,
            dashboardData
        );

    if (localAnswer) {

        return localAnswer;

    }

    // =====================
    // AI CONTEXT
    // =====================

    const context = `

=== KPI ===

Total Sales:
${dashboardData.kpis.totalSales}

Total Profit:
${dashboardData.kpis.totalProfit}

Profit Margin:
${dashboardData.kpis.profitMargin}%

=== Territory Profit ===

${dashboardData.territoryProfit
            .map(t =>
                `${t.Territory}: ${Math.round(t.Profit)}`
            )
            .join("\n")}

=== Category Sales ===

${dashboardData.categorySales
            .map(c =>
                `${c.Category}: ${Math.round(c.Sales)}`
            )
            .join("\n")}

=== SubCategory Profit ===

${dashboardData.subcategoryProfit
            .map(s =>
                `${s.SubCategory}: ${Math.round(s.Profit)}`
            )
            .join("\n")}

=== Business Risks ===

${dashboardData.alerts
            .map(a => a.title)
            .join("\n")}

`;

    // =====================
    // CALL AI
    // =====================

    const response =
        await fetch(
            "/api/chat",
            {
                method: "POST",

                headers: {
                    "Content-Type":
                        "application/json"
                },

                body: JSON.stringify({
                    question,
                    context
                })
            }
        );

    const result =
        await response.json();

    console.log(result);

    return (
        result?.choices?.[0]?.message?.content
        ||
        "Tidak ada jawaban."
    );

}
