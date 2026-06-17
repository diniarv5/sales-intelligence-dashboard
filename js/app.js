let dashboardData = null;
let rawSalesData = [];
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
// LOAD DASHBOARD & FILTERS
// ==========================

function calculateDashboardData(rawRows, filters) {
    let filteredRows = rawRows.filter(row => {
        if (!row.OrderDate) return false;
        const orderDateStr = row.OrderDate.split(' ')[0];
        
        // 1. Filter by Date Range Mode
        if (filters.dateType === "full") {
            if (filters.dateFrom && orderDateStr < filters.dateFrom) return false;
            if (filters.dateTo && orderDateStr > filters.dateTo) return false;
        } else if (filters.dateType === "month") {
            const orderMonthStr = row.OrderDate.substring(0, 7); // "YYYY-MM"
            if (filters.monthFrom && orderMonthStr < filters.monthFrom) return false;
            if (filters.monthTo && orderMonthStr > filters.monthTo) return false;
        } else if (filters.dateType === "year") {
            const orderYear = parseInt(row.OrderDate.substring(0, 4));
            const yFrom = parseInt(filters.yearFrom) || 2001;
            const yTo = parseInt(filters.yearTo) || 2004;
            if (orderYear < yFrom || orderYear > yTo) return false;
        }
        
        // 2. Filter by Category
        if (filters.category && row.Category !== filters.category) return false;
        
        // 3. Filter by Territory
        if (filters.territory && row.Territory !== filters.territory) return false;
        
        return true;
    });

    let totalSales = 0;
    let totalProfit = 0;
    let totalQuantity = 0;
    let orderIds = new Set();
    let customerIds = new Set();
    
    let categorySalesMap = {};
    let territoryProfitMap = {};
    let subcategoryProfitMap = {};
    let subcategorySalesMap = {};
    let salesTrendMap = {};

    filteredRows.forEach(row => {
        const sales = parseFloat(row.Sales) || 0;
        const profit = parseFloat(row.Profit) || 0;
        const qty = parseInt(row.Qty) || 0;
        
        totalSales += sales;
        totalProfit += profit;
        totalQuantity += qty;
        
        if (row.SalesOrderID) orderIds.add(row.SalesOrderID);
        if (row.CustomerID) customerIds.add(row.CustomerID);
        
        if (row.Category) {
            categorySalesMap[row.Category] = (categorySalesMap[row.Category] || 0) + sales;
        }
        
        if (row.Territory) {
            territoryProfitMap[row.Territory] = (territoryProfitMap[row.Territory] || 0) + profit;
        }
        
        if (row.SubCategory) {
            subcategoryProfitMap[row.SubCategory] = (subcategoryProfitMap[row.SubCategory] || 0) + profit;
            subcategorySalesMap[row.SubCategory] = (subcategorySalesMap[row.SubCategory] || 0) + sales;
        }
        
        const yearMonth = row.OrderDate.substring(0, 7);
        salesTrendMap[yearMonth] = (salesTrendMap[yearMonth] || 0) + sales;
    });

    // Sort mappings into ordered lists
    let categorySales = Object.keys(categorySalesMap).map(cat => ({
        Category: cat,
        Sales: categorySalesMap[cat]
    })).sort((a, b) => b.Sales - a.Sales);

    let territoryProfit = Object.keys(territoryProfitMap).map(terr => ({
        Territory: terr,
        Profit: territoryProfitMap[terr]
    })).sort((a, b) => b.Profit - a.Profit);

    let subcategoryProfit = Object.keys(subcategoryProfitMap).map(sub => ({
        SubCategory: sub,
        Profit: subcategoryProfitMap[sub]
    })).sort((a, b) => b.Profit - a.Profit);

    let salesTrend = Object.keys(salesTrendMap).map(ym => ({
        OrderDate: ym,
        Sales: salesTrendMap[ym]
    })).sort((a, b) => a.OrderDate.localeCompare(b.OrderDate));

    let scatterData = Object.keys(subcategorySalesMap).map(sub => ({
        SubCategory: sub,
        Sales: subcategorySalesMap[sub],
        Profit: subcategoryProfitMap[sub] || 0
    })).sort((a, b) => b.Sales - a.Sales);

    const profitMargin = totalSales > 0 ? parseFloat(((totalProfit / totalSales) * 100).toFixed(2)) : 0;
    
    // Top Performers
    const topCategory = categorySales.length > 0 ? {
        name: categorySales[0].Category,
        sales: categorySales[0].Sales,
        percentage: totalSales > 0 ? parseFloat(((categorySales[0].Sales / totalSales) * 100).toFixed(1)) : 0
    } : { name: "-", sales: 0, percentage: 0 };

    const topTerritory = territoryProfit.length > 0 ? {
        name: territoryProfit[0].Territory,
        profit: territoryProfit[0].Profit
    } : { name: "-", profit: 0 };

    const topSubCategory = subcategoryProfit.length > 0 ? {
        name: subcategoryProfit[0].SubCategory,
        profit: subcategoryProfit[0].Profit
    } : { name: "-", profit: 0 };

    // Hook / Exec Summaries
    const hook = totalSales > 0 
        ? `${topCategory.percentage}% Revenue Berasal dari ${topCategory.name}`
        : "Tidak Ada Data Transaksi";

    const executiveSummary = totalSales > 0
        ? `Perusahaan menghasilkan total sales sebesar $${(totalSales/1000000).toFixed(2)}M dengan profit $${(totalProfit/1000000).toFixed(2)}M dan margin ${profitMargin}%. Revenue sangat terkonsentrasi pada kategori ${topCategory.name} yang menyumbang ${topCategory.percentage}% penjualan.`
        : "Tidak ada transaksi untuk filter yang dipilih.";

    // Alerts Anomaly Detection
    let alerts = [];
    
    // Month-over-Month drop anomaly
    for (let i = 1; i < salesTrend.length; i++) {
        const prevSales = salesTrend[i-1].Sales;
        const currSales = salesTrend[i].Sales;
        if (prevSales > 10000) {
            const pctDrop = ((currSales - prevSales) / prevSales) * 100;
            if (pctDrop < -50) {
                alerts.push({
                    type: "critical",
                    title: `Revenue Drop Anomaly: ${salesTrend[i].OrderDate}`,
                    description: `${pctDrop.toFixed(1)}% dibanding bulan sebelumnya`
                });
            }
        }
    }

    // Negative Profit SubCategory anomaly
    subcategoryProfit.forEach(sub => {
        if (sub.Profit < 0) {
            alerts.push({
                type: "critical",
                title: `Negative Profit Anomaly: ${sub.SubCategory}`,
                description: `Profit -$${Math.round(Math.abs(sub.Profit)).toLocaleString()}`
            });
        }
    });

    // Territory profitability outlier warning
    if (territoryProfit.length > 1) {
        const avgTerrProfit = totalProfit / territoryProfit.length;
        territoryProfit.forEach(terr => {
            if (terr.Profit < avgTerrProfit * 0.15) {
                alerts.push({
                    type: "warning",
                    title: `Territory Profit Outlier: ${terr.Territory}`,
                    description: `Profit $${Math.round(terr.Profit).toLocaleString()}, terendah dari seluruh territory`
                });
            }
        });
    }

    alerts.sort((a, b) => {
        if (a.type === "critical" && b.type !== "critical") return -1;
        if (a.type !== "critical" && b.type === "critical") return 1;
        return 0;
    });

    // Insights & Recommendations
    let insights = [];
    let recommendations = [];
    
    if (totalSales > 0) {
        insights.push(`${topCategory.name} merupakan kontributor revenue terbesar dengan kontribusi ${topCategory.percentage}% terhadap total penjualan.`);
        insights.push(`${topTerritory.name} menghasilkan profit tertinggi sebesar $${Math.round(topTerritory.profit).toLocaleString()}.`);
        insights.push(`${topSubCategory.name} merupakan subkategori paling menguntungkan dengan total profit $${Math.round(topSubCategory.profit).toLocaleString()}.`);
        
        recommendations.push(`Pertahankan investasi pada kategori ${topCategory.name}.`);
        recommendations.push(`Replikasi strategi penjualan dari wilayah ${topTerritory.name}.`);
        
        const bottomTerritory = territoryProfit[territoryProfit.length - 1];
        const bottomSubCategory = subcategoryProfit[subcategoryProfit.length - 1];
        let bottoms = [];
        if (bottomTerritory && bottomTerritory.Profit < topTerritory.profit * 0.2) bottoms.push(`wilayah ${bottomTerritory.Territory}`);
        if (bottomSubCategory && bottomSubCategory.Profit < topSubCategory.profit * 0.2) bottoms.push(`subkategori ${bottomSubCategory.SubCategory}`);
        
        if (bottoms.length > 0) {
            recommendations.push(`Evaluasi ${bottoms.join(" dan ")} dengan profit rendah agar margin meningkat.`);
        } else {
            recommendations.push("Evaluasi kategori atau wilayah dengan profit rendah agar margin meningkat.");
        }
    } else {
        insights.push("Tidak ada data untuk periode ini.");
        recommendations.push("Pilih filter lain untuk memuat rekomendasi.");
    }

    return {
        hook,
        executiveSummary,
        kpis: {
            totalSales,
            totalProfit,
            profitMargin,
            totalOrders: orderIds.size,
            totalCustomers: customerIds.size,
            totalQuantity
        },
        topCategory,
        topTerritory,
        topSubCategory,
        alerts,
        insights,
        recommendations,
        categorySales,
        territoryProfit,
        subcategoryProfit,
        salesTrend,
        scatterData
    };
}

function applyFilters() {
    const category = document.getElementById("selCategory").value;
    const territory = document.getElementById("selTerritory").value;
    const dateType = document.getElementById("dateMode").value;
    
    let filters = {
        category,
        territory,
        dateType
    };
    
    if (dateType === "full") {
        filters.dateFrom = document.getElementById("dateFrom").value;
        filters.dateTo = document.getElementById("dateTo").value;
    } else if (dateType === "month") {
        filters.monthFrom = document.getElementById("monthFrom").value;
        filters.monthTo = document.getElementById("monthTo").value;
    } else if (dateType === "year") {
        filters.yearFrom = document.getElementById("yearFrom").value;
        filters.yearTo = document.getElementById("yearTo").value;
    }
    
    console.log("Applying filters:", filters);
    
    if (rawSalesData.length === 0) {
        console.warn("Raw sales data is empty. Cannot filter.");
        return;
    }

    const data = calculateDashboardData(rawSalesData, filters);
    dashboardData = data;
    window.dashboardData = data;
    
    // Update dashboard views
    populateHero(data);
    populateKPI(data);
    populateAlerts(data);
    populateInsights(data);
    populateRecommendations(data);

    renderCategoryChart(data);
    renderTerritoryChart(data);
    renderSubcategoryChart(data);
    renderSalesTrend(data);
    renderScatterPlot(data);
}

function resetFilters() {
    document.getElementById("selCategory").value = "";
    document.getElementById("selTerritory").value = "";
    document.getElementById("dateMode").value = "full";
    
    document.getElementById("dateFrom").value = "2001-07-01";
    document.getElementById("dateTo").value = "2004-07-31";
    document.getElementById("monthFrom").value = "2001-07";
    document.getElementById("monthTo").value = "2004-07";
    document.getElementById("yearFrom").value = "2001";
    document.getElementById("yearTo").value = "2004";
    
    // Trigger input visibility toggle
    const event = new Event("change");
    document.getElementById("dateMode").dispatchEvent(event);
    
    applyFilters();
}

async function loadDashboard() {
    try {
        console.log("Fetching raw sales CSV data...");
        rawSalesData = await d3.csv("data/Sales_BY_Category_202606040914-1.csv");
        console.log("Raw sales CSV data loaded successfully. Rows count:", rawSalesData.length);
        
        // Set default filter inputs in UI to match data bounds
        document.getElementById("dateFrom").value = "2001-07-01";
        document.getElementById("dateTo").value = "2004-07-31";
        document.getElementById("monthFrom").value = "2001-07";
        document.getElementById("monthTo").value = "2004-07";
        document.getElementById("yearFrom").value = "2001";
        document.getElementById("yearTo").value = "2004";
        
        applyFilters();
    } catch (error) {
        console.error("Error loading CSV dashboard:", error);
    }
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
    const container = document.getElementById("narrativeContainer");
    container.innerHTML = `
        <div class="ai-narrative">
            Generating narrative...
        </div>
        `;

    const data = window.dashboardData;
    if (!data || !data.kpis || data.kpis.totalSales === 0) {
        container.innerHTML = `
            <div class="ai-error">
                Data tidak tersedia atau total sales kosong untuk filter saat ini.
            </div>
            `;
        return;
    }

    const topCat = data.topCategory;
    const topTerr = data.topTerritory;
    const topSub = data.topSubCategory;
    const margin = data.kpis.profitMargin;
    const salesFormatted = (data.kpis.totalSales / 1000000).toFixed(2);
    const profitFormatted = (data.kpis.totalProfit / 1000000).toFixed(2);

    container.innerHTML = `
        <div class="ai-narrative">
            <h3>🤖 Executive Narrative</h3>
            <p>
                Berdasarkan data yang difilter, perusahaan mencatatkan total penjualan sebesar 
                <strong>$${salesFormatted}M</strong> dengan profit mencapai 
                <strong>$${profitFormatted}M</strong>, menghasilkan margin profitabilitas rata-rata sebesar 
                <strong>${margin}%</strong>.
            </p>
            <p>
                Kategori produk <strong>${topCat.name}</strong> mendominasi dengan kontribusi penjualan sebesar 
                <strong>${topCat.percentage}%</strong> ($${(topCat.sales/1000000).toFixed(2)}M). Hal ini mengindikasikan 
                bahwa pertumbuhan bisnis ditopang kuat oleh kategori tersebut, sekaligus menunjukkan adanya 
                ketergantungan (risiko konsentrasi) pada satu kategori utama.
            </p>
            <p>
                Dari segi cakupan wilayah, <strong>${topTerr.name}</strong> menjadi kontributor profit terbesar dengan 
                keuntungan <strong>$${Math.round(topTerr.profit).toLocaleString()}</strong>. Sementara itu, subkategori 
                paling menguntungkan di tingkat global adalah <strong>${topSub.name}</strong> dengan total keuntungan 
                <strong>$${Math.round(topSub.profit).toLocaleString()}</strong>.
            </p>
            <p>
                <strong>Rekomendasi Taktis & Strategis:</strong>
                <ul>
                    <li>Pertahankan pangsa pasar kategori <strong>${topCat.name}</strong> sambil mulai mendiversifikasi penawaran produk.</li>
                    <li>Lakukan benchmark operasional dan replikasi strategi sukses wilayah <strong>${topTerr.name}</strong> ke territory lain.</li>
                    <li>Evaluasi produk-produk yang mengalami kerugian profitabilitas untuk menjaga kestabilan margin perusahaan.</li>
                </ul>
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
        // Toggle input visibility based on Mode Periode
        const dateMode = document.getElementById("dateMode");
        const dateFrom = document.getElementById("dateFrom");
        const dateTo = document.getElementById("dateTo");
        const monthFrom = document.getElementById("monthFrom");
        const monthTo = document.getElementById("monthTo");
        const yearFrom = document.getElementById("yearFrom");
        const yearTo = document.getElementById("yearTo");

        function toggleDateInputs() {
            const mode = dateMode.value;
            
            // Hide all first
            dateFrom.style.display = "none";
            dateTo.style.display = "none";
            monthFrom.style.display = "none";
            monthTo.style.display = "none";
            yearFrom.style.display = "none";
            yearTo.style.display = "none";
            
            if (mode === "full") {
                dateFrom.style.display = "block";
                dateTo.style.display = "block";
            } else if (mode === "month") {
                monthFrom.style.display = "block";
                monthTo.style.display = "block";
            } else if (mode === "year") {
                yearFrom.style.display = "block";
                yearTo.style.display = "block";
            }
        }

        dateMode.addEventListener("change", toggleDateInputs);
        toggleDateInputs(); // initial setup

        // Bind filter action buttons
        document.getElementById("applyFilterBtn").addEventListener("click", applyFilters);
        document.getElementById("resetFilterBtn").addEventListener("click", resetFilters);

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
        right: 120, // Increased margin to prevent text clipping
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
    // SKALA DENGAN PADDING UNTUK MENGHINDARI PERPOTONGAN GRAFIS
    // =====================

    const x =
        d3.scaleLinear()
            .domain([
                0,
                d3.max(chartData, d => d.sales) * 1.1
            ])
            .range([
                margin.left + 15, // Offset to the right to avoid touching Y-axis
                width - margin.right
            ]);

    const yMin = d3.min(chartData, d => d.profit);
    const yMax = d3.max(chartData, d => d.profit);

    // Give Y axis an artificial negative padding to push zero-line upwards
    const yMinLimit = yMin < 0 ? yMin - 60000 : -60000;

    const y =
        d3.scaleLinear()
            .domain([
                yMinLimit,
                yMax * 1.15
            ])
            .range([
                height - margin.bottom - 10, // Offset from bottom axis
                margin.top
            ]);

    // Radius scale (Bubble Chart size representation based on Sales volume)
    const rScale = d3.scaleSqrt()
        .domain([0, d3.max(chartData, d => d.sales)])
        .range([5, 20]); // bubble size from 5px to 20px

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

        .attr("r", d => rScale(d.sales))

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
                .attr("r", rScale(d.sales) + 4)
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
                .attr("r", d => rScale(d.sales))
                .attr("opacity", 0.82);

            hideTooltip();

        });

    // =====================
    // LABEL NAMA SUBKATEGORI DENGAN PENGATURAN ANTARA-TUMPANGTINDIH & DYNAMIC RADIUS OFFSET
    // =====================

    svg.selectAll(".scatter-label")
        .data(chartData)
        .enter()
        .append("text")

        .attr("class", "scatter-label")

        .attr("x", d => {
            const r = rScale(d.sales);
            // Tempatkan label "Caps" di sebelah kiri dot agar tidak bertabrakan dengan yang lain
            if (d.name === "Caps") return x(d.sales) - (r + 4);
            return x(d.sales) + (r + 4);
        })

        .attr("y", d => {
            const r = rScale(d.sales);
            // Shift labels ke atas / bawah secara vertikal untuk subkategori dengan penjualan rendah
            if (d.name === "Tires and Tubes") return y(d.profit) - (r + 4);
            if (d.name === "Bottles and Cages") return y(d.profit) + (r + 8);
            if (d.name === "Caps") return y(d.profit) + 12;
            return y(d.profit) + 4;
        })

        .attr("text-anchor", d => {
            // Text anchor "end" untuk Caps karena ditempatkan di sebelah kiri
            if (d.name === "Caps") return "end";
            return "start";
        })

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
