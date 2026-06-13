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