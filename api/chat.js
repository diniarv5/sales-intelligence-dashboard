export default async function handler(
    req,
    res
) {

    if (req.method !== "POST") {

        return res
            .status(405)
            .json({
                error:
                    "Method not allowed"
            });

    }

    try {

        const {
            question,
            context
        } = req.body;

        const response =
            await fetch(
                "https://api.groq.com/openai/v1/chat/completions",
                {
                    method: "POST",

                    headers: {

                        "Content-Type":
                            "application/json",

                        Authorization:
                            `Bearer ${process.env.GROQ_API_KEY}`
                    },

                    body: JSON.stringify({

                        model:
                            "llama-3.1-8b-instant",

                        temperature:
                            0.3,

                        max_tokens:
                            300,

                        messages: [

                            {
                                role: "system",

                                content:
                                    "Kamu adalah AI Business Analyst."
                            },

                            {
                                role: "user",

                                content:
                                    context +
                                    "\n\n" +
                                    question
                            }

                        ]
                    })
                }
            );

        const data =
            await response.json();

        res.status(200).json(data);

    }

    catch (error) {

        res.status(500).json({
            error:
                error.message
        });

    }

}
function localBusinessAnswer(question, data) {

    const q = question.toLowerCase();

    // Territory profit terendah

    if (
        q.includes("profit terendah") &&
        q.includes("wilayah")
    ) {

        const lowest =
            [...data.territoryProfit]
                .sort((a, b) =>
                    a.Profit - b.Profit
                )[0];

        return `
📊 Insight

Wilayah dengan profit terendah adalah
<b>${lowest.Territory}</b>.

📌 Evidence

Profit sebesar
<b>$${Math.round(lowest.Profit).toLocaleString()}</b>

🚀 Recommendation

Lakukan evaluasi strategi penjualan
dan efektivitas promosi di wilayah ini.
`;
    }

    // Territory tertinggi

    if (
        q.includes("profit tertinggi") &&
        q.includes("wilayah")
    ) {

        const top =
            data.territoryProfit[0];

        return `
📊 Insight

Wilayah dengan profit tertinggi adalah
<b>${top.Territory}</b>.

📌 Evidence

Profit mencapai
<b>$${Math.round(top.Profit).toLocaleString()}</b>

🚀 Recommendation

Replikasi strategi wilayah ini
ke territory lainnya.
`;
    }

    // Top category

    if (
        q.includes("kategori") &&
        (
            q.includes("terbaik") ||
            q.includes("tertinggi")
        )
    ) {

        return `
📊 Insight

Kategori terbaik adalah
<b>${data.topCategory.name}</b>.

📌 Evidence

Berkontribusi sebesar
<b>${data.topCategory.percentage}%</b>
terhadap revenue.

🚀 Recommendation

Pertahankan investasi dan promosi
pada kategori ini.
`;
    }

    return null;
}
