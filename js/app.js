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
            pertumbuhan bi
