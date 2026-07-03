let myChart = null;

function updateChart(dates, values, pairName) {
    const ctx = document.getElementById('historyChart').getContext('2d');
    if (!ctx) return;
    
    if (myChart) myChart.destroy();

    document.getElementById('chart-pair-name').innerText = pairName;

    // Kiểm tra chính xác trạng thái Dark Mode của hệ thống/giao diện
    const isDark = document.documentElement.classList.contains('dark');
    const gridColor = isDark ? 'rgba(51, 65, 85, 0.4)' : '#f1f5f9';
    const textColor = isDark ? '#94a3b8' : '#64748b';

    myChart = new Chart(ctx, {
        type: 'line',
        data: {
            labels: dates,
            datasets: [{
                label: 'Tỷ giá công bố',
                data: values,
                borderColor: '#10b981',
                backgroundColor: isDark ? 'rgba(16, 185, 129, 0.03)' : 'rgba(16, 185, 129, 0.06)',
                borderWidth: 2.5,
                pointRadius: 4,
                pointHoverRadius: 6,
                pointBackgroundColor: '#10b981',
                fill: true,
                tension: 0.2
            }]
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            plugins: { 
                legend: { display: false },
                tooltip: {
                    backgroundColor: isDark ? '#1e293b' : '#ffffff',
                    titleColor: isDark ? '#ffffff' : '#0f172a',
                    bodyColor: '#10b981',
                    borderColor: isDark ? '#334155' : '#e2e8f0',
                    borderWidth: 1,
                    padding: 10,
                    displayColors: false
                }
            },
            scales: {
                x: { 
                    grid: { display: false },
                    ticks: { color: textColor, font: { weight: '500' } }
                },
                y: { 
                    grid: { color: gridColor },
                    ticks: { maxTicksLimit: 6, color: textColor, font: { weight: '500' } }
                }
            }
        }
    });
}

async function loadAndRenderChart(from, to) {
    if(from === to) return;
    const historyRates = await CurrencyAPI.getHistoricalData(from, to);
    if (!historyRates) return;

    const dates = Object.keys(historyRates).map(date => {
        const d = new Date(date);
        return `${d.getDate()}/${d.getMonth() + 1}`;
    });
    const values = Object.values(historyRates).map(obj => obj[to]);

    updateChart(dates, values, `${from}/${to}`);
}