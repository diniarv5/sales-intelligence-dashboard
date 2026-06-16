let dashboardData = null;
const tooltip =
    d3.select("body")
        .append("div")
        .attr("id", "tooltip")
        .style("opacity", 0);

function showTooltip(event, html) {

    tooltip
        .html(html)
        .classed("show", true)
        .style("opacity", 1)
        .style(
            "left",
            (event.pageX + 15) + "px"
        )
        .style(
            "top",
            (event.pageY - 20) + "px"
        );

}

function hideTooltip() {

    tooltip
        .classed("show", false)
        .style("opacity", 0);

}

function moveTooltip(event) {

    tooltip
        .style(
            "left",
            (event.pageX + 15) + "px"
        )
        .style(
            "top",
            (event.pageY - 20) + "px"
        );

}

// ==========================
// LOAD DASHBOARD
// ==========================

async function loadDashboard() {

    try {

        const response =
            await fetch(
                "data/sales_summary.json"
            );

        const data =
            await response.json();

        dashboardData = data;
        console.log(data);

        populateHero(data);
        populateKPI(data);
        populateAlerts(data);
        window.dashboardData = data;
        populateInsights(data);
        populateRecommendations(data);

        renderCategoryChart(data);
        renderTerritoryChart(data);
        renderSubcategoryChart(data);
        renderSalesTrend(data);
        renderScatterPlot(data);
        renderScatterPlot(data);

    } catch (error) {

        console.error(error);

    }

}

// ==========================
// SCATTER PLOT: SALES VS PROFIT
// ==========================

function renderScatterPlot(data) {

    const svg =
        d3.select(
            "#scatterChart"
        );

    svg.selectAll("*").remove();

    const width = 500;
    const height = 320;
    const margin = {
        top: 20,
        right: 30,
        bottom: 50,
        left: 60
    };

    svg.attr(
        "viewBox",
        `0 0 ${width} ${height}`
    );

    // Ambil data scatter dari JSON,
    // fallback ke salesBySubCategory
    const raw =
        data.scatterData ||
        data.salesBySubCategory ||
        [];

    if (raw.length === 0) return;

    const chartData = raw.map(d => ({
        name: d.SubCategory || d.name || "?",
        sales: +d.Sales || +d.sales || 0,
        profit: +d.Profit || +d.profit || 0
    }));

    // =====================
    // SKALA
    // =====================

    const x =
        d3.scaleLinear()
            .domain([
                0,
                d3.max(chartData, d => d.sales) * 1.1
            ])
            .range([
                margin.left,
                width - margin.right
            ]);

    const y =
        d3.scaleLinear()
            .domain([
                d3.min(chartData, d => d.profit) * 1.2,
                d3.max(chartData, d => d.profit) * 1.2
            ])
            .range([
                height - margin.bottom,
                margin.top
            ]);

    // =====================
    // ZERO LINE (profit = 0)
    // =====================

    svg.append("line")
        .attr("x1", margin.left)
        .attr("x2", width - margin.right)
        .attr("y1", y(0))
        .attr("y2", y(0))
        .attr("stroke", "#ef4444")
        .attr("stroke-width", 1)
        .attr("stroke-dasharray", "4 3")
        .attr("opacity", 0.5);

    // =====================
    // AXIS
    // =====================

    svg.append("g")
        .attr(
            "transform",
            `translate(0, ${height - margin.bottom})`
        )
        .call(
            d3.axisBottom(x)
                .ticks(5)
                .tickFormat(d =>
                    "$" + (d / 1000).toFixed(0) + "K"
                )
        )
        .selectAll("text")
        .style("font-size", "10px");

    svg.append("g")
        .attr(
            "transform",
            `translate(${margin.left}, 0)`
        )
        .call(
            d3.axisLeft(y)
                .ticks(5)
                .tickFormat(d =>
                    "$" + (d / 1000).toFixed(0) + "K"
                )
        )
        .selectAll("text")
        .style("font-size", "10px");

    // =====================
    // AXIS LABEL
    // =====================

    svg.append("text")
        .attr("x", width / 2)
        .attr("y", height - 5)
        .attr("text-anchor", "middle")
        .style("font-size", "11px")
        .style("fill", "#64748b")
        .text("Total Sales");

    svg.append("text")
        .attr(
            "transform",
            `rotate(-90)`
        )
        .attr("x", -(height / 2))
        .attr("y", 14)
        .attr("text-anchor", "middle")
        .style("font-size", "11px")
        .style("fill", "#64748b")
        .text("Total Profit");

    // =====================
    // DOTS
    // =====================

    const colorScale =
        d3.scaleOrdinal(
            d3.schemeTableau10
        );

    svg.selectAll(".scatter-dot")
        .data(chartData)
        .enter()
        .append("circle")

        .attr("class", "scatter-dot")

        .attr("cx", d => x(d.sales))

        .attr("cy", d => y(d.profit))

        .attr("r", 8)

        .attr("fill", (d, i) =>
            colorScale(i)
        )

        .attr("opacity", 0.8)

        .attr("stroke", "#ffffff")

        .attr("stroke-width", 1.5)

        .style("cursor", "pointer")

        .on("mouseover", function (event, d) {

            d3.select(this)
                .transition()
                .duration(150)
                .attr("r", 12)
                .attr("opacity", 1);

            showTooltip(event, `
                <span class="tooltip-icon">🎯</span>
                <span class="tooltip-title">
                    ${d.name}
                </span>

                <div>
                    <span class="tooltip-label">Sales</span><br>
                    <span class="tooltip-value">
                        $${Math.round(d.sales).toLocaleString()}
                    </span>
                </div>

                <div style="margin-top:6px">
                    <span class="tooltip-label">Profit</span><br>
                    <span class="${d.profit < 0 ? 'tooltip-loss' : 'tooltip-profit'}">
                        $${Math.round(d.profit).toLocaleString()}
                    </span>
                </div>
            `);

        })

        .on("mousemove", moveTooltip)

        .on("mouseout", function () {

            d3.select(this)
                .transition()
                .duration(150)
                .attr("r", 8)
                .attr("opacity", 0.8);

            hideTooltip();

        });

    // =====================
    // LABEL NAMA
    // =====================

    svg.selectAll(".scatter-label")
        .data(chartData)
        .enter()
        .append("text")

        .attr("class", "scatter-label")

        .attr("x", d => x(d.sales) + 10)

        .attr("y", d => y(d.profit) + 4)

        .style("font-size", "9px")

        .style("fill", "#475569")

        .style("font-weight", "600")

        .text(d => d.name);

}

// ==========================
// HERO SECTION
// ==========================

function populateHero(data) {

    document.getElementById(
        "hookTitle"
    ).innerText =
        data.hook ||
        "Sales Performance Overview";

    document.getElementById(
        "executiveSummary"
    ).innerText =
        data.executiveSummary ||
        "Executive summary not available.";

    const margin =
        data.kpis?.profitMargin || 0;

    const health =
        Math.min(
            100,
            Math.round(margin * 4)
        );

    document.getElementById(
        "businessHealth"
    ).innerText =
        health + "%";

    // Animate the ring
    const radius = 60;
    const circumference = 2 * Math.PI * radius;

    healthRing.style.strokeDasharray =
        circumference;

    healthRing.style.strokeDashoffset =
        circumference -
        (health / 100) * circumference;

    // Health status text
    const statusEl = document.getElementById("healthStatus");
    if (statusEl) {
        if (health >= 80) {
            statusEl.textContent = "Excellent";
            statusEl.style.color = "#10b981";
        } else if (health >= 60) {
            statusEl.textContent = "Good";
            statusEl.style.color = "#06b6d4";
        } else if (health >= 40) {
            statusEl.textContent = "Fair";
            statusEl.style.color = "#f59e0b";
        } else {
            statusEl.textContent = "Needs Attention";
            statusEl.style.color = "#ef4444";
        }
    }

}

// ==========================
// KPI SECTION
// ==========================

function populateKPI(data) {

    document.getElementById(
        "totalSales"
    ).innerText =
        "$" +
        (
            data.kpis.totalSales /
            1000000
        ).toFixed(2) +
        "M";

    document.getElementById(
        "totalProfit"
    ).innerText =
        "$" +
        (
            data.kpis.totalProfit /
            1000000
        ).toFixed(2) +
        "M";

    document.getElementById(
        "profitMargin"
    ).innerText =
        data.kpis.profitMargin +
        "%";

    document.getElementById(
        "totalOrders"
    ).innerText =
        data.kpis.totalOrders
            .toLocaleString();

    document.getElementById(
        "totalCustomers"
    ).innerText =
        data.kpis.totalCustomers
            .toLocaleString();

}

// ==========================
// ALERT SECTION
// ==========================

function populateAlerts(data) {

    const container =
        document.getElementById(
            "anomalyContainer"
        ) ||
        document.getElementById(
            "alertContainer"
        );

    if (container) {
        container.innerHTML = "";
    }

    const critical =
        data.alerts.filter(
            a => (a.severity || a.type) === "critical"
        ).length;

    const warning =
        data.alerts.filter(
            a => (a.severity || a.type) === "warning"
        ).length;

    const criticalEl = document.getElementById("criticalCount");
    if (criticalEl) criticalEl.innerText = critical;

    const warningEl = document.getElementById("warningCount");
    if (warningEl) warningEl.innerText = warning;

    const anomalyScoreEl = document.getElementById("anomalyScore");
    if (anomalyScoreEl) {
        const score = Math.min(100, Math.max(0, 30 + critical * 20 + warning * 10));
        anomalyScoreEl.innerText = score;
    }

    const alertCountEl = document.getElementById("alertCount");
    if (alertCountEl) {
        alertCountEl.innerHTML = `
            <span class="risk-pill critical">
                ${critical} Critical
            </span>

            <span class="risk-pill warning">
                ${warning} Warning
            </span>
        `;
    }

    if (container) {
        data.alerts.forEach(alert => {

            let icon = `
                <img src="assets/warning.png" class="alert-icon" alt="Critical">
                `;

            if ((alert.severity || alert.type) === "critical") {
                icon = `
                <img src="assets/alert.png" class="alert-icon" alt="Critical">
                `;
            }

            container.innerHTML += `

            <div class="anomaly-item">

                <h4>
                    ${icon}
                    ${alert.title}
                </h4>

                <p>
                    ${alert.description || alert.value || ""}
                </p>

            </div>

            `;

        });
    }

}

function showTab(tabName) {

    // ==========================
    // CONTAINER
    // ==========================

    const anomalyTab =
        document.getElementById(
            "anomalyContainer"
        );

    const narrativeTab =
        document.getElementById(
            "narrativeContainer"
        );

    // ==========================
    // SEMBUNYIKAN SEMUA TAB
    // ==========================

    anomalyTab.style.display =
        "none";

    narrativeTab.style.display =
        "none";

    // ==========================
    // HAPUS ACTIVE BUTTON
    // ==========================

    document
        .querySelectorAll(
            ".tab-btn"
        )
        .forEach(btn => {

            btn.classList.remove(
                "active"
            );

        });

    // ==========================
    // TAMPILKAN TAB TERPILIH
    // ==========================

    if (
        tabName ===
        "anomaly"
    ) {

        anomalyTab.style.display =
            "block";

    }

    if (
        tabName ===
        "narrative"
    ) {

        narrativeTab.style.display =
            "block";

    }

    // ==========================
    // AKTIFKAN BUTTON
    // ==========================

    const activeButton =
        [...document.querySelectorAll(
            ".tab-btn"
        )]
            .find(btn =>
                btn.textContent
                    .trim()
                    .includes(
                        tabName ===
                            "anomaly"
                            ? "Data Anomali"
                            : "Narasi AI"
                    )
            );

    if (activeButton) {

        activeButton.classList.add(
            "active"
        );

    }

}

async function generateNarrative() {

    const container =
        document.getElementById(
            "narrativeContainer"
        );

    container.innerHTML =
        `
        <div class="ai-narrative">
            Generating narrative...
        </div>
        `;

    const data =
        window.dashboardData;

    if (!data) {

        container.innerHTML =
            `
            <div class="ai-error">
                Dashboard data belum tersedia.
            </div>
            `;

        return;
    }

    container.innerHTML =
        `
        <div class="ai-narrative">

            <h3>
                Executive Narrative
            </h3>

            <p>
                Revenue perusahaan masih
                didominasi oleh kategori
                <strong>Bikes</strong> sehingga
                terdapat risiko konsentrasi
                pendapatan.

            </p>

            <p>

                Territory dengan profit tertinggi
                menunjukkan peluang ekspansi,
                sementara beberapa wilayah lain
                masih memiliki performa yang
                relatif rendah.

            </p>

            <p>

                Direkomendasikan untuk
                melakukan diversifikasi produk,
                meningkatkan penetrasi pasar,
                serta memonitor anomali profit
                yang terdeteksi.

            </p>

        </div>
        `;

    showTab("narrative");

}

// ==========================
// INSIGHT SECTION
// ==========================

function populateInsights(data) {

    const container =
        document.getElementById(
            "insightContainer"
        );

    container.innerHTML = `

    <div class="insight-item">

        <div class="insight-title">

            <img
                src="assets/bike.png"
                class="chart-title-icon1"
                alt="Revenue Concentration">

            Revenue Concentration

        </div>

        <div class="insight-text">

            Sebanyak
            <strong>
                ${data.topCategory.percentage}%
            </strong>
            revenue perusahaan berasal dari
            kategori
            <strong>
                ${data.topCategory.name}
            </strong>.

            Kondisi ini menunjukkan kategori
            tersebut menjadi mesin utama
            pertumbuhan bisnis, namun juga
            meningkatkan risiko ketergantungan
            terhadap satu sumber revenue.

        </div>

        <div class="recommendation-box">

            <h4>
                Recommended Action
            </h4>

            <ul>

                <li>
                    Pertahankan investasi pada
                    kategori Bikes.
                </li>

                <li>
                    Diversifikasi revenue dari
                    kategori lain.
                </li>

                <li>
                    Identifikasi kategori baru
                    yang berpotensi tumbuh.
                </li>

            </ul>

        </div>

    </div>

    <div class="insight-item">

        <div class="insight-title">

            <img
                src="assets/territory.png"
                class="chart-title-icon1"
                alt="Territory Performance">

            Territory Performance

        </div>

        <div class="insight-text">

            <strong>
                ${data.topTerritory.name}
            </strong>

            menghasilkan profit tertinggi
            sebesar

            <strong>
                $${Math.round(
        data.topTerritory.profit
    ).toLocaleString()}
            </strong>.

            Wilayah ini menjadi kontributor
            utama profit perusahaan dan dapat
            dijadikan benchmark strategi
            penjualan.

        </div>

        <div class="recommendation-box">

            <h4>
                Recommended Action
            </h4>

            <ul>

                <li>
                    Replikasi strategi wilayah
                    terbaik ke area lain.
                </li>

                <li>
                    Analisis faktor keberhasilan
                    wilayah ini.
                </li>

                <li>
                    Tingkatkan penetrasi pasar
                    pada wilayah dengan profit
                    rendah.
                </li>

            </ul>

        </div>

    </div>

    <div class="insight-item">

        <div class="insight-title">

            <img
                src="assets/TopSubCategory.png"
                class="chart-title-icon1"
                alt="Product Opportunity">

            Product Opportunity

        </div>

        <div class="insight-text">

            Subkategori

            <strong>
                ${data.topSubCategory.name}
            </strong>

            memberikan profit tertinggi sebesar

            <strong>
                $${Math.round(
        data.topSubCategory.profit
    ).toLocaleString()}
            </strong>.

            Produk ini menjadi peluang utama
            untuk meningkatkan profitabilitas
            perusahaan.

        </div>

        <div class="recommendation-box">

            <h4>
                Recommended Action
            </h4>

            <ul>

                <li>
                    Tingkatkan promosi produk
                    unggulan.
                </li>

                <li>
                    Fokus pada strategi
                    upselling dan cross-selling.
                </li>

                <li>
                    Optimalkan stok dan
                    distribusi produk.
                </li>

            </ul>

        </div>

    </div>

    `;

}

// ==========================
// RECOMMENDATION SECTION
// ==========================

function populateRecommendations(
    data
) {

    const container =
        document.getElementById(
            "recommendationContainer"
        );

    if (!container) return;

    if (
        !data.recommendations ||
        data.recommendations.length === 0
    ) {

        container.innerHTML =
            "<li>No recommendation available.</li>";

        return;

    }

    let html = "";

    data.recommendations.forEach(
        recommendation => {

            html += `
                <li>
                    ${recommendation}
                </li>
            `;

        }
    );

    container.innerHTML =
        html;

}

// ==========================
// START APP
// ==========================

function validateQuestion(question) {

    question =
        question
            .toLowerCase()
            .trim();

    if (question.length === 0) {

        const blockedWords = [

            "halo",
            "hai",
            "hello",

            "siapa kamu",

            "apa kabar",

            "presiden",

            "ibukota",

            "python",

            "html",

            "javascript",

            "coding"
        ];

        if (

            blockedWords.some(
                word =>
                    question.includes(word)
            )

        ) {

            return {

                valid: false,

                message:
                    "AI Assistant hanya melayani analisis data bisnis."

            };

        }

        return {

            valid: false,

            message:
                "Masukkan pertanyaan terlebih dahulu."

        };
    }

    // blok matematika
    if (
        /^[0-9+\-*/().\s=]+$/
            .test(question)
    ) {

        return {
            valid: false,
            message:
                "AI Assistant hanya menerima pertanyaan bisnis."
        };
    }

    const allowedKeywords = [

        // english
        "sales",
        "profit",
        "margin",
        "revenue",

        "customer",
        "customers",

        "order",
        "orders",

        "territory",
        "region",

        "category",
        "subcategory",

        "product",

        "trend",

        "risk",

        "insight",

        "recommendation",

        // indonesia
        "penjualan",
        "profit",
        "keuntungan",
        "margin",

        "pelanggan",
        "customer",

        "pesanan",
        "order",

        "wilayah",
        "territory",

        "kategori",
        "subcategory",

        "produk",

        "tren",

        "risiko",

        "insight",

        "rekomendasi"
    ];

    const validTopic =
        allowedKeywords.some(
            keyword =>
                question.includes(
                    keyword
                )
        );

    if (!validTopic) {

        return {
            valid: false,
            message:
                "Pertanyaan harus berkaitan dengan data sales."
        };
    }

    return {
        valid: true
    };

}

document.addEventListener(
    "DOMContentLoaded",
    () => {

        loadDashboard();

        document
            .getElementById(
                "generateNarrative"
            )
            .addEventListener(
                "click",
                generateNarrative
            );

    }
);

document
    .getElementById(
        "askButton"
    )
    .addEventListener(
        "click",
        async () => {

            const question =
                document
                    .getElementById(
                        "questionInput"
                    )
                    .value;

            const validation =
                validateQuestion(
                    question
                );

            if (
                !validation.valid
            ) {

                document
                    .getElementById(
                        "chatResponse"
                    )
                    .innerHTML =
                    `
                    <div class="ai-error">
                        ⚠️ ${validation.message}
                    </div>
                    `;

                return;
            }

            document
                .getElementById(
                    "chatResponse"
                )
                .innerHTML =
                `
                <div class="ai-loading">
                    🤖 Generating Insight...
                </div>
                `;

            try {

                const answer =
                    await askGroq(
                        question,
                        dashboardData
                    );

                document
                    .getElementById(
                        "chatResponse"
                    )
                    .innerHTML =
                    `
                    <div class="ai-answer">
                        ${answer}
                    </div>
                    `;

            }
            catch (error) {

                console.error(error);

                document
                    .getElementById(
                        "chatResponse"
                    )
                    .innerHTML =
                    `
                    <div class="ai-error">
                        ⚠️ AI Service Error
                    </div>
                    `;

            }

        }
    );

function renderCategoryChart(data) {

    const svg =
        d3.select("#categoryChart");

    svg.selectAll("*").remove();

    const width = 550;
    const height = 300;
    const margin = {
        top: 20, right: 30,
        bottom: 40, left: 70
    };

    svg.attr("viewBox",
        `0 0 ${width} ${height}`);

    // Gradient definition
    const defs = svg.append("defs");
    const grad = defs.append("linearGradient")
        .attr("id", "catGrad")
        .attr("x1", "0%").attr("y1", "100%")
        .attr("x2", "0%").attr("y2", "0%");
    grad.append("stop")
        .attr("offset", "0%")
        .attr("stop-color", "#2563eb")
        .attr("stop-opacity", 0.8);
    grad.append("stop")
        .attr("offset", "100%")
        .attr("stop-color", "#60a5fa")
        .attr("stop-opacity", 1);

    const chartData =
        data.categorySales;

    const x =
        d3.scaleBand()
            .domain(
                chartData.map(
                    d => d.Category
                )
            )
            .range([margin.left, width - margin.right])
            .padding(0.35);

    const y =
        d3.scaleLinear()
            .domain([
                0,
                d3.max(
                    chartData,
                    d => d.Sales
                )
            ])
            .nice()
            .range([height - margin.bottom, margin.top]);

    svg.append("g")
        .attr("transform",
            `translate(0, ${height - margin.bottom})`)
        .call(d3.axisBottom(x));

    svg.append("g")
        .attr("transform",
            `translate(${margin.left}, 0)`)
        .call(
            d3.axisLeft(y)
                .ticks(5)
                .tickFormat(d =>
                    "$" + (d / 1000000).toFixed(1) + "M"
                )
        );

    // Grid lines
    svg.append("g")
        .attr("class", "grid-lines")
        .selectAll("line")
        .data(y.ticks(5))
        .enter()
        .append("line")
        .attr("x1", margin.left)
        .attr("x2", width - margin.right)
        .attr("y1", d => y(d))
        .attr("y2", d => y(d))
        .attr("stroke", "#f1f5f9")
        .attr("stroke-dasharray", "4,4");

    svg.selectAll(".cat-bar")
        .data(chartData)
        .enter()
        .append("rect")
        .attr("class", "cat-bar")
        .attr("x", d => x(d.Category))
        .attr("y", height - margin.bottom)
        .attr("width", x.bandwidth())
        .attr("height", 0)
        .attr("fill", "url(#catGrad)")
        .attr("rx", 6)
        .style("cursor", "pointer")

        .transition()
        .duration(800)
        .ease(d3.easeCubicOut)
        .attr("y", d => y(d.Sales))
        .attr("height", d =>
            (height - margin.bottom) - y(d.Sales)
        );

    // Hover layer
    svg.selectAll(".cat-hover")
        .data(chartData)
        .enter()
        .append("rect")
        .attr("class", "cat-hover")
        .attr("x", d => x(d.Category))
        .attr("y", d => y(d.Sales))
        .attr("width", x.bandwidth())
        .attr("height", d =>
            (height - margin.bottom) - y(d.Sales)
        )
        .attr("fill", "transparent")
        .style("cursor", "pointer")

        .on("mouseover", function (event, d) {

            showTooltip(
                event,
                `
            <span class="tooltip-title">
                🛒 ${d.Category}
            </span>

            <div>
                <span class="tooltip-label">
                    Total Sales
                </span>
                <br>
                <span class="tooltip-value">
                    $${Math.round(d.Sales).toLocaleString()}
                </span>
            </div>
            `
            );

        })

        .on("mousemove", moveTooltip)

        .on("mouseout", hideTooltip);

    // INSIGHT BOX
    const topCat = data.categorySales[0];
    const topPct = ((topCat.Sales / data.kpis.totalSales) * 100).toFixed(1);
    renderChartInsight(
        "chartCategory",
        "Sales by Category",
        `<strong>${topCat.Category}</strong> mendominasi penjualan dengan kontribusi <strong>${topPct}%</strong> dari total revenue. Kategori lain (Accessories & Clothing) masih sangat jauh di bawah — ini sinyal risiko konsentrasi yang perlu diwaspadai.`
    );

}

function renderTerritoryChart(data) {

    const svg =
        d3.select("#territoryChart");

    svg.selectAll("*").remove();

    // ==========================
    // SIZE
    // ==========================

    const width = 550;
    const height = 320;

    const margin = {
        top: 20,
        right: 70,
        bottom: 40,
        left: 130
    };

    svg.attr(
        "viewBox",
        `0 0 ${width} ${height}`
    );

    const chartData =
        data.territoryProfit
            .slice(0, 5);

    // ==========================
    // SCALE
    // ==========================

    const y =
        d3.scaleBand()
            .domain(
                chartData.map(
                    d => d.Territory
                )
            )
            .range([
                margin.top,
                height - margin.bottom
            ])
            .padding(0.3);

    const x =
        d3.scaleLinear()
            .domain([
                0,
                d3.max(
                    chartData,
                    d => d.Profit
                )
            ])
            .nice()
            .range([
                margin.left,
                width - margin.right
            ]);

    // ==========================
    // BAR
    // ==========================

    svg.selectAll(".profit-bar")
        .data(chartData)
        .enter()
        .append("rect")

        .attr(
            "class",
            "profit-bar"
        )

        .attr(
            "x",
            margin.left
        )

        .attr(
            "y",
            d => y(d.Territory)
        )

        .attr(
            "height",
            y.bandwidth()
        )

        .attr(
            "width",
            0
        )

        .attr(
            "rx",
            6
        )

        .attr(
            "fill",
            "#10b981"
        )

        .transition()

        .duration(1000)

        .attr(
            "width",
            d =>
                x(d.Profit)
                -
                margin.left
        );

    // ==========================
    // HOVER LAYER
    // ==========================

    svg.selectAll(".hover-bar")
        .data(chartData)
        .enter()
        .append("rect")

        .attr(
            "class",
            "hover-bar"
        )

        .attr(
            "x",
            margin.left
        )

        .attr(
            "y",
            d => y(d.Territory)
        )

        .attr(
            "height",
            y.bandwidth()
        )

        .attr(
            "width",
            d =>
                x(d.Profit)
                -
                margin.left
        )

        .attr(
            "fill",
            "transparent"
        )

        .style(
            "cursor",
            "pointer"
        )

        .on(
            "mouseover",
            function (event, d) {

                showTooltip(
                    event,
                    `
                    <span class="tooltip-title">
                        🌎 ${d.Territory}
                    </span>

                    <div>

                        <span class="tooltip-label">
                            Total Profit
                        </span>

                        <br>

                        <span class="tooltip-profit">
                            $${Math.round(
                        d.Profit
                    ).toLocaleString()}
                        </span>

                    </div>
                    `
                );

            }
        )

        .on(
            "mousemove",
            moveTooltip
        )

        .on(
            "mouseout",
            hideTooltip
        );

    // ==========================
    // VALUE LABEL
    // ==========================

    svg.selectAll(".profit-label")
        .data(chartData)
        .enter()
        .append("text")

        .attr(
            "class",
            "profit-label"
        )

        .attr(
            "x",
            d =>
                x(d.Profit) + 6
        )

        .attr(
            "y",
            d =>
                y(d.Territory)
                +
                y.bandwidth() / 2
                +
                5
        )

        .style(
            "font-size",
            "11px"
        )

        .style(
            "font-weight",
            "600"
        )

        .style(
            "fill",
            "#475569"
        )

        .text(
            d =>
                "$" +
                (
                    d.Profit / 1000
                ).toFixed(0)
                + "K"
        );

    // ==========================
    // AXIS X
    // ==========================

    svg.append("g")
        .attr(
            "transform",
            `translate(
                0,
                ${height - margin.bottom}
            )`
        )

        .call(
            d3.axisBottom(x)

                .ticks(5)

                .tickFormat(
                    d =>
                        "$" +
                        (
                            d / 1000
                        ).toFixed(0)
                        + "K"
                )
        );

    // ==========================
    // AXIS Y
    // ==========================

    svg.append("g")
        .attr(
            "transform",
            `translate(
                ${margin.left},
                0
            )`
        )

        .call(
            d3.axisLeft(y)
        );

    // INSIGHT BOX
    const top = data.territoryProfit[0];
    const last = data.territoryProfit.slice(-1)[0];
    renderChartInsight(
        "chartTerritory",
        "Profit by Territory",
        `<strong>${top.Territory}</strong> memimpin profit dengan <strong>$${Math.round(top.Profit).toLocaleString()}</strong> — hampir <strong>${Math.round(top.Profit / last.Profit)}x lipat</strong> dibanding territory terbawah (${last.Territory}: $${Math.round(last.Profit).toLocaleString()}). Strategi dari wilayah terbaik perlu direplikasi ke territory lain.`
    );

}

function renderSubcategoryChart(data) {

    const svg =
        d3.select("#subcategoryChart");

    svg.selectAll("*").remove();

    const width = 550;
    const height = 320;

    const margin = {
        top: 20,
        right: 90,
        bottom: 40,
        left: 150
    };

    svg.attr(
        "viewBox",
        `0 0 ${width} ${height}`
    );

    const chartData =
        data.subcategoryProfit
            .slice(0, 5);

    const y =
        d3.scaleBand()
            .domain(
                chartData.map(
                    d => d.SubCategory
                )
            )
            .range([
                margin.top,
                height - margin.bottom
            ])
            .padding(0.35);

    const x =
        d3.scaleLinear()
            .domain([
                0,
                d3.max(
                    chartData,
                    d => Math.max(
                        0,
                        d.Profit
                    )
                )
            ])
            .nice()
            .range([
                margin.left,
                width - margin.right
            ]);

    // =====================
    // BAR
    // =====================

    svg.selectAll(".profit-bar")
        .data(chartData)
        .enter()
        .append("rect")

        .attr(
            "class",
            "profit-bar"
        )

        .attr(
            "x",
            margin.left
        )

        .attr(
            "y",
            d => y(d.SubCategory)
        )

        .attr(
            "height",
            y.bandwidth()
        )

        .attr(
            "width",
            0
        )

        .attr(
            "rx",
            8
        )

        .attr(
            "fill",
            d =>
                d.Profit < 0
                    ? "#ef4444"
                    : "#f59e0b"
        )

        .transition()

        .duration(1000)

        .attr(
            "width",
            d =>
                x(
                    Math.max(
                        0,
                        d.Profit
                    )
                )
                -
                margin.left
        );

    // =====================
    // TOOLTIP
    // =====================

    svg.selectAll(".hover-bar")
        .data(chartData)
        .enter()
        .append("rect")

        .attr(
            "class",
            "hover-bar"
        )

        .attr(
            "x",
            margin.left
        )

        .attr(
            "y",
            d => y(d.SubCategory)
        )

        .attr(
            "height",
            y.bandwidth()
        )

        .attr(
            "width",
            d =>
                x(
                    Math.max(
                        0,
                        d.Profit
                    )
                )
                -
                margin.left
        )

        .attr(
            "fill",
            "transparent"
        )

        .style(
            "cursor",
            "pointer"
        )

        .on(
            "mouseover",
            function (event, d) {

                showTooltip(
                    event,
                    `
                    <span class="tooltip-title">
                        🏆 ${d.SubCategory}
                    </span>

                    <div>

                        <span class="tooltip-label">
                            Profit
                        </span>

                        <br>

                        <span class="${d.Profit < 0
                        ? "tooltip-loss"
                        : "tooltip-profit"
                    }">

                            $${Math.round(
                        d.Profit
                    ).toLocaleString()}

                        </span>

                    </div>
                    `
                );

            }
        )

        .on(
            "mousemove",
            moveTooltip
        )

        .on(
            "mouseout",
            hideTooltip
        );

    // =====================
    // LABEL
    // =====================

    svg.selectAll(".profit-label")
        .data(chartData)
        .enter()
        .append("text")

        .attr(
            "x",
            d =>
                x(
                    Math.max(
                        0,
                        d.Profit
                    )
                )
                + 8
        )

        .attr(
            "y",
            d =>
                y(d.SubCategory)
                +
                y.bandwidth() / 2
                + 4
        )

        .style(
            "font-size",
            "11px"
        )

        .style(
            "font-weight",
            "600"
        )

        .style(
            "fill",
            d =>
                d.Profit < 0
                    ? "#ef4444"
                    : "#475569"
        )

        .text(
            d =>
                "$" +
                (
                    d.Profit / 1000
                ).toFixed(0)
                + "K"
        );

    // =====================
    // X AXIS
    // =====================

    svg.append("g")
        .attr(
            "transform",
            `translate(
                0,
                ${height - margin.bottom}
            )`
        )
        .call(
            d3.axisBottom(x)
                .ticks(4)
                .tickFormat(
                    d =>
                        "$" +
                        (
                            d / 1000
                        ).toFixed(0)
                        + "K"
                )
        );

    // =====================
    // Y AXIS
    // =====================

    svg.append("g")
        .attr(
            "transform",
            `translate(
                ${margin.left},
                0
            )`
        )
        .call(
            d3.axisLeft(y)
        );

    // INSIGHT BOX
    const topSub = data.subcategoryProfit[0];
    const lossSub = data.subcategoryProfit.find(d => d.Profit < 0);
    const lossNote = lossSub
        ? ` Perhatikan <strong>${lossSub.SubCategory}</strong> yang mencatat kerugian $${Math.abs(Math.round(lossSub.Profit)).toLocaleString()} — perlu evaluasi harga atau strategi penjualan.`
        : "";
    renderChartInsight(
        "chartSubcategory",
        "Top SubCategory",
        `<strong>${topSub.SubCategory}</strong> adalah subkategori paling menguntungkan dengan profit <strong>$${Math.round(topSub.Profit).toLocaleString()}</strong>.${lossNote}`
    );

}

function renderSalesTrend(data) {

    const svg =
        d3.select("#salesTrendChart");

    svg.selectAll("*").remove();

    const width = 900;
    const height = 420;

    svg.attr(
        "viewBox",
        `0 0 ${width} ${height}`
    );

    const chartData =
        data.salesTrend;

    // ==========================
    // SCALE
    // ==========================

    const x =
        d3.scalePoint()
            .domain(
                chartData.map(
                    d => d.OrderDate
                )
            )
            .range([70, 850]);

    const y =
        d3.scaleLinear()
            .domain([
                0,
                d3.max(
                    chartData,
                    d => d.Sales
                ) * 1.1
            ])
            .range([350, 20]);

    // ==========================
    // GRADIENT
    // ==========================

    const defs =
        svg.append("defs");

    const gradient =
        defs.append("linearGradient")
            .attr("id", "salesGradient")
            .attr("x1", "0%")
            .attr("y1", "0%")
            .attr("x2", "0%")
            .attr("y2", "100%");

    gradient.append("stop")
        .attr("offset", "0%")
        .attr("stop-color", "#2563eb")
        .attr("stop-opacity", 0.18);

    gradient.append("stop")
        .attr("offset", "100%")
        .attr("stop-color", "#2563eb")
        .attr("stop-opacity", 0);

    // ==========================
    // GRID
    // ==========================

    svg.append("g")
        .attr("class", "grid")
        .attr(
            "transform",
            "translate(70,0)"
        )
        .call(
            d3.axisLeft(y)
                .tickSize(-780)
                .tickFormat("")
        )
        .selectAll("line")
        .attr(
            "stroke",
            "#e2e8f0"
        );

    // ==========================
    // AREA
    // ==========================

    const area =
        d3.area()
            .curve(
                d3.curveMonotoneX
            )
            .x(
                d => x(d.OrderDate)
            )
            .y0(350)
            .y1(
                d => y(d.Sales)
            );

    svg.append("path")
        .datum(chartData)
        .attr(
            "fill",
            "url(#salesGradient)"
        )
        .attr(
            "d",
            area
        );

    // ==========================
    // AVERAGE LINE
    // ==========================

    const avgSales =
        d3.mean(
            chartData,
            d => d.Sales
        );

    svg.append("line")
        .attr("x1", 70)
        .attr("x2", 850)
        .attr("y1", y(avgSales))
        .attr("y2", y(avgSales))
        .attr("stroke", "#94a3b8")
        .attr("stroke-width", 1.5)
        .attr("stroke-dasharray", "8,6");

    svg.append("text")
        .attr("x", 850)
        .attr("y", y(avgSales) - 10)
        .attr("text-anchor", "end")
        .attr("fill", "#64748b")
        .attr("font-size", "11px")
        .text("Average Sales");

    // ==========================
    // LINE
    // ==========================

    const line =
        d3.line()
            .curve(
                d3.curveMonotoneX
            )
            .x(
                d => x(d.OrderDate)
            )
            .y(
                d => y(d.Sales)
            );

    svg.append("path")
        .datum(chartData)
        .attr("fill", "none")
        .attr("stroke", "#2563eb")
        .attr("stroke-width", 1.8)
        .attr("d", line);

    // ==========================
    // DOTS
    // ==========================

    svg.selectAll(".trend-dot")
        .data(chartData)
        .enter()
        .append("circle")
        .attr(
            "class",
            "trend-dot"
        )
        .attr(
            "cx",
            d => x(d.OrderDate)
        )
        .attr(
            "cy",
            d => y(d.Sales)
        )
        .attr("r", 4)
        .attr(
            "fill",
            "#ffffff"
        )
        .attr(
            "stroke",
            "#2563eb"
        )
        .attr(
            "stroke-width",
            2
        )
        .style(
            "cursor",
            "pointer"
        )
        .on(
            "mouseover",
            function (event, d) {

                d3.select(this)
                    .transition()
                    .duration(150)
                    .attr("r", 6);

                showTooltip(
                    event,
                    `
                    <span class="tooltip-icon">📈</span>

                    <span class="tooltip-title">
                        ${d.OrderDate}
                    </span>

                    <div>

                        <span class="tooltip-label">
                            Total Sales
                        </span>

                        <br>

                        <span class="tooltip-value">
                            $${Math.round(
                        d.Sales
                    ).toLocaleString()}
                        </span>

                    </div>
                    `
                );

            }
        )
        .on(
            "mousemove",
            moveTooltip
        )
        .on(
            "mouseout",
            function () {

                d3.select(this)
                    .transition()
                    .duration(150)
                    .attr("r", 4);

                hideTooltip();

            }
        );

    // ==========================
    // AXIS X
    // ==========================

    svg.append("g")
        .attr(
            "transform",
            "translate(0,350)"
        )
        .call(
            d3.axisBottom(x)
                .tickValues(
                    chartData
                        .filter(
                            (d, i) => i % 6 === 0
                        )
                        .map(
                            d => d.OrderDate
                        )
                )
        );

    // ==========================
    // AXIS Y
    // ==========================

    svg.append("g")
        .attr(
            "transform",
            "translate(70,0)"
        )
        .call(
            d3.axisLeft(y)
                .ticks(5)
        );

    // ==========================
    // INSIGHT
    // ==========================

    const trend =
        data.salesTrend;

    const peak =
        trend.reduce(
            (a, b) =>
                a.Sales > b.Sales
                    ? a
                    : b
        );

    const drop =
        trend.find(
            d =>
                d.OrderDate === "2004-07"
        );

    renderChartInsight(
        "chartTrend",
        "Sales Trend",
        `Puncak penjualan terjadi pada <strong>${peak.OrderDate}</strong> dengan total <strong>$${Math.round(peak.Sales).toLocaleString()}</strong>. ${drop ? `Anomali penurunan tajam terdeteksi pada <strong>2004-07</strong> ($${Math.round(drop.Sales).toLocaleString()}) sehingga perlu investigasi lebih lanjut.` : ""}`
    );

}
// ==========================
// SCATTER PLOT: SALES VS PROFIT
// ==========================

function renderScatterPlot(data) {

    const svg =
        d3.select(
            "#scatterChart"
        );

    svg.selectAll("*").remove();

    const width = 500;
    const height = 320;
    const margin = {
        top: 20,
        right: 30,
        bottom: 50,
        left: 65
    };

    svg.attr(
        "viewBox",
        `0 0 ${width} ${height}`
    );


    const raw =
        data.scatterData || [];

    if (raw.length === 0) return;

    const chartData = raw.map(d => ({
        name: d.SubCategory,
        sales: +d.Sales,
        profit: +d.Profit
    }));

    // =====================
    // SKALA
    // =====================

    const x =
        d3.scaleLinear()
            .domain([
                0,
                d3.max(chartData, d => d.sales) * 1.1
            ])
            .range([
                margin.left,
                width - margin.right
            ]);

    const yMin = d3.min(chartData, d => d.profit);
    const yMax = d3.max(chartData, d => d.profit);

    const y =
        d3.scaleLinear()
            .domain([
                yMin < 0 ? yMin * 1.3 : 0,
                yMax * 1.2
            ])
            .range([
                height - margin.bottom,
                margin.top
            ]);

    // =====================
    // GRID LINES
    // =====================

    svg.append("g")
        .attr("class", "grid")
        .attr(
            "transform",
            `translate(0, ${height - margin.bottom})`
        )
        .call(
            d3.axisBottom(x)
                .ticks(5)
                .tickSize(-(height - margin.top - margin.bottom))
                .tickFormat("")
        )
        .selectAll("line")
        .style("stroke", "#e2e8f0")
        .style("stroke-dasharray", "3 3");

    svg.select(".grid .domain").remove();

    // =====================
    // ZERO LINE (garis profit = 0)
    // =====================

    svg.append("line")
        .attr("x1", margin.left)
        .attr("x2", width - margin.right)
        .attr("y1", y(0))
        .attr("y2", y(0))
        .attr("stroke", "#ef4444")
        .attr("stroke-width", 1.5)
        .attr("stroke-dasharray", "5 4")
        .attr("opacity", 0.6);

    svg.append("text")
        .attr("x", width - margin.right + 4)
        .attr("y", y(0) + 4)
        .style("font-size", "9px")
        .style("fill", "#ef4444")
        .style("font-weight", "600")
        .text("Break-even");

    // =====================
    // AXIS
    // =====================

    svg.append("g")
        .attr(
            "transform",
            `translate(0, ${height - margin.bottom})`
        )
        .call(
            d3.axisBottom(x)
                .ticks(5)
                .tickFormat(d =>
                    "$" + (d / 1000000).toFixed(1) + "M"
                )
        )
        .selectAll("text")
        .style("font-size", "10px")
        .style("fill", "#64748b");

    svg.append("g")
        .attr(
            "transform",
            `translate(${margin.left}, 0)`
        )
        .call(
            d3.axisLeft(y)
                .ticks(5)
                .tickFormat(d =>
                    "$" + (d / 1000).toFixed(0) + "K"
                )
        )
        .selectAll("text")
        .style("font-size", "10px")
        .style("fill", "#64748b");

    // =====================
    // AXIS LABEL
    // =====================

    svg.append("text")
        .attr("x", (width + margin.left - margin.right) / 2)
        .attr("y", height - 8)
        .attr("text-anchor", "middle")
        .style("font-size", "11px")
        .style("fill", "#64748b")
        .style("font-weight", "500")
        .text("Total Sales");

    svg.append("text")
        .attr("transform", "rotate(-90)")
        .attr("x", -(height - margin.bottom + margin.top) / 2)
        .attr("y", 15)
        .attr("text-anchor", "middle")
        .style("font-size", "11px")
        .style("fill", "#64748b")
        .style("font-weight", "500")
        .text("Total Profit");

    // =====================
    // COLOR SCALE
    // =====================

    const colors = [
        "#2563eb",
        "#10b981",
        "#f59e0b",
        "#8b5cf6",
        "#ef4444"
    ];

    // =====================
    // DOTS
    // =====================

    svg.selectAll(".scatter-dot")
        .data(chartData)
        .enter()
        .append("circle")

        .attr("class", "scatter-dot")

        .attr("cx", d => x(d.sales))

        .attr("cy", d => y(d.profit))

        .attr("r", 9)

        .attr(
            "fill",
            (d, i) => colors[i % colors.length]
        )

        .attr("opacity", 0.82)

        .attr("stroke", "#ffffff")

        .attr("stroke-width", 2)

        .style("cursor", "pointer")

        .on("mouseover", function (event, d) {

            d3.select(this)
                .transition()
                .duration(150)
                .attr("r", 13)
                .attr("opacity", 1);

            showTooltip(event, `
                <span class="tooltip-icon">🎯</span>
                <span class="tooltip-title">${d.name}</span>
                <div>
                    <span class="tooltip-label">Sales</span><br>
                    <span class="tooltip-value">
                        $${Math.round(d.sales).toLocaleString()}
                    </span>
                </div>
                <div style="margin-top:6px">
                    <span class="tooltip-label">Profit</span><br>
                    <span class="${d.profit < 0 ? 'tooltip-loss' : 'tooltip-profit'}">
                        $${Math.round(d.profit).toLocaleString()}
                    </span>
                </div>
                <div style="margin-top:6px">
                    <span class="tooltip-label">Margin</span><br>
                    <span class="tooltip-value">
                        ${d.sales > 0 ? ((d.profit / d.sales) * 100).toFixed(1) : 0}%
                    </span>
                </div>
            `);

        })

        .on("mousemove", moveTooltip)

        .on("mouseout", function () {

            d3.select(this)
                .transition()
                .duration(150)
                .attr("r", 9)
                .attr("opacity", 0.82);

            hideTooltip();

        });

    // =====================
    // LABEL NAMA SUBKATEGORI
    // =====================

    svg.selectAll(".scatter-label")
        .data(chartData)
        .enter()
        .append("text")

        .attr("class", "scatter-label")

        .attr("x", d => x(d.sales) + 12)

        .attr("y", d => y(d.profit) + 4)

        .style("font-size", "9.5px")

        .style("fill", "#334155")

        .style("font-weight", "600")

        .text(d => d.name);

    // INSIGHT BOX
    const lossDots = chartData.filter(d => d.profit < 0);
    const lossNote = lossDots.length > 0
        ? `<strong>${lossDots.map(d => d.name).join(", ")}</strong> berada di bawah garis break-even — sales tinggi belum tentu menghasilkan profit. `
        : "";
    renderChartInsight(
        "chartScatter",
        "Sales vs Profit",
        `${lossNote}Titik-titik yang jauh ke kanan namun rendah secara vertikal menunjukkan efisiensi profit yang lemah. Fokuskan perhatian pada subkategori dengan rasio profit/sales terbaik untuk memaksimalkan margin.`
    );

}

// ==========================
// HELPER: CHART INSIGHT BOX
// ==========================

function renderChartInsight(cardId, label, text) {

    const card = document.getElementById(cardId);
    if (!card) return;

    const old = card.querySelector(".chart-insight-box");
    if (old) old.remove();

    const box = document.createElement("div");
    box.className = "chart-insight-box";
    box.innerHTML = `
        <span class="chart-insight-label">
            📊 ${label}
        </span>
        <p>${text}</p>
    `;

    card.appendChild(box);

}
