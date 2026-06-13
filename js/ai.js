async function askGroq(
    question,
    dashboardData
) {

    const context = `

    Total Sales:
    ${(
            dashboardData.kpis.totalSales /
            1000000
        ).toFixed(2)}M

    Total Profit:
    ${(
            dashboardData.kpis.totalProfit /
            1000000
        ).toFixed(2)}M

    Profit Margin:
    ${dashboardData.kpis.profitMargin}%

    Top Category:
    ${dashboardData.topCategory.name}

    Top Territory:
    ${dashboardData.topTerritory.name}

    Top SubCategory:
    ${dashboardData.topSubCategory.name}

    Business Risks:
    ${dashboardData.alerts
            .map(a => a.title)
            .join(", ")}

    Key Insights:
    ${dashboardData.insights.join(", ")}

    `;

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

    return result.answer;

}