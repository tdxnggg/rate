// ==========================================
// 1. TRẠM DỮ LIỆU API (TÍCH HỢP FIAT & CRYPTO)
// ==========================================
const BASE_URL = 'https://api.frankfurter.app';
// API miễn phí từ CoinGecko lấy giá các đồng tiền ảo theo USD
const CRYPTO_URL = 'https://api.coingecko.com/api/v3/simple/price?ids=bitcoin,ethereum,binancecoin,solana,ripple,cardano&vs_currencies=usd';

const CurrencyAPI = {
    async getLatestRates(base = 'USD') {
        if (!navigator.onLine) {
            const cachedData = localStorage.getItem(`rates_${base}`);
            if (cachedData) {
                const parsed = JSON.parse(cachedData);
                window.dispatchEvent(new CustomEvent('api-offline', { detail: parsed.date }));
                return parsed.rates;
            }
        }
        try {
            // Gọi song song API Frankfurter và API CoinGecko
            const [fiatRes, cryptoRes] = await Promise.all([
                fetch(`${BASE_URL}/latest?from=${base}`),
                fetch(CRYPTO_URL).catch(() => null) // Bọc catch để nếu CoinGecko lỗi thì Fiat vẫn chạy
            ]);

            if (!fiatRes.ok) throw new Error("Lỗi API");
            const fiatData = await fiatRes.json();
            
            // Khởi tạo object chứa tỷ giá chung quy đổi theo gốc USD
            const combinedRates = {
                USD: 1,
                ...fiatData.rates
            };

            // Xử lý và đồng bộ dữ liệu tiền điện tử sang gốc USD phục vụ bộ tính toán quy đổi
            if (cryptoRes && cryptoRes.ok) {
                const cryptoData = await cryptoRes.json();
                // Vì CoinGecko trả về 1 Crypto = X USD, nên hệ thống lõi lưu 1 USD = 1 / X Crypto
                if (cryptoData.bitcoin) combinedRates["BTC"] = 1 / cryptoData.bitcoin.usd;
                if (cryptoData.ethereum) combinedRates["ETH"] = 1 / cryptoData.ethereum.usd;
                if (cryptoData.binancecoin) combinedRates["BNB"] = 1 / cryptoData.binancecoin.usd;
                if (cryptoData.solana) combinedRates["SOL"] = 1 / cryptoData.solana.usd;
                if (cryptoData.ripple) combinedRates["XRP"] = 1 / cryptoData.ripple.usd;
                if (cryptoData.cardano) combinedRates["ADA"] = 1 / cryptoData.cardano.usd;

                // Đồng thời lưu giá thị trường thực tế (1 Crypto = X USD) để hiển thị lên bảng riêng biệt không bị số thập phân nhỏ lộn xộn
                localStorage.setItem('crypto_market_prices', JSON.stringify({
                    BTC: cryptoData.bitcoin.usd,
                    ETH: cryptoData.ethereum.usd,
                    BNB: cryptoData.binancecoin.usd,
                    SOL: cryptoData.solana.usd,
                    XRP: cryptoData.ripple.usd,
                    ADA: cryptoData.cardano.usd
                }));
            }

            localStorage.setItem(`rates_${base}`, JSON.stringify({
                date: new Date().toLocaleTimeString('vi-VN') + ' ' + fiatData.date,
                rates: combinedRates
            }));

            window.dispatchEvent(new CustomEvent('api-online'));
            return combinedRates;
        } catch (error) {
            console.error("Dùng dữ liệu dự phòng:", error);
            window.dispatchEvent(new CustomEvent('api-offline', { detail: "Dữ liệu ngoại tuyến mẫu" }));
            
            // Bổ sung các tỷ giá tiền ảo dự phòng cố định trong trường hợp mất mạng hoàn toàn
            return {
                AUD: 1.51, BGN: 1.80, BRL: 5.25, CAD: 1.37, CHF: 0.89, CNY: 7.25, 
                CZK: 23.10, DKK: 6.90, EUR: 0.92, GBP: 0.78, HKD: 7.81, HUF: 360.5, 
                IDR: 16200, ILS: 3.70, INR: 83.50, ISK: 139.0, JPY: 155.40, KRW: 1380, 
                MXN: 17.80, MYR: 4.70, NOK: 10.60, NZD: 1.63, PHP: 58.20, PLN: 3.95, 
                RON: 4.58, SEK: 10.50, SGD: 1.35, THB: 36.60, TRY: 32.50, ZAR: 18.50, VND: 25450,
                BTC: 0.0000105, ETH: 0.000285, BNB: 0.00168, SOL: 0.00625, XRP: 1.65, ADA: 2.38
            };
        }
    },

    async getHistoricalData(from, to) {
        if (!navigator.onLine) return null;
        // Đồ thị lịch sử chỉ hỗ trợ cho tiền tệ truyền thống (Fiat) qua Frankfurter API
        if (currencyDetails[from]?.type === 'crypto' || currencyDetails[to]?.type === 'crypto') {
            // Sinh dữ liệu giả lập tuyến tính mượt mà cho Crypto (vì Frankfurter không lưu lịch sử Crypto)
            const fakeRates = {};
            for(let i=7; i>=0; i--) {
                const d = new Date(Date.now() - i * 24 * 60 * 60 * 1000).toISOString().split('T')[0];
                const rateFromUSD = from === 'USD' ? 1 : (currentRates[from] || 1);
                const rateToUSD = to === 'USD' ? 1 : (currentRates[to] || 1);
                const baseRate = rateToUSD / rateFromUSD;
                fakeRates[d] = { [to]: baseRate * (1 + (i * 0.002 - 0.007)) }; 
            }
            return fakeRates;
        }

        const endDate = new Date().toISOString().split('T')[0];
        const startDate = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString().split('T')[0];
        try {
            const response = await fetch(`${BASE_URL}/${startDate}..${endDate}?from=${from}&to=${to}`);
            if (!response.ok) throw new Error("Lỗi tải đồ thị");
            const data = await response.json();
            return data.rates;
        } catch (error) {
            const fakeRates = {};
            for(let i=7; i>=0; i--) {
                const d = new Date(Date.now() - i * 24 * 60 * 60 * 1000).toISOString().split('T')[0];
                fakeRates[d] = { [to]: 1 + (i * 0.01) }; 
            }
            return fakeRates;
        }
    }
};

// ==========================================
// 2. QUẢN LÝ BIỂU ĐỒ (CHART LOGIC)
// ==========================================
let myChart = null;
let cachedHistoryDates = []; 
let cachedHistoryValues = []; 
let cachedPairName = "USD/VND";

function updateChart(dates, values, pairName) {
    const canvasElement = document.getElementById('historyChart');
    if (!canvasElement) return; 
    
    const ctx = canvasElement.getContext('2d');
    if (myChart) myChart.destroy();

    document.getElementById('chart-pair-name').innerText = pairName;
    const isDark = document.documentElement.classList.contains('dark');
    const textColor = isDark ? '#94a3b8' : '#64748b';
    const gridColor = isDark ? '#334155' : '#f1f5f9';

    myChart = new Chart(ctx, {
        type: 'line',
        data: {
            labels: dates,
            datasets: [{
                data: values,
                borderColor: '#10b981',
                backgroundColor: isDark ? 'rgba(16, 185, 129, 0.02)' : 'rgba(16, 185, 129, 0.05)',
                borderWidth: 2.5,
                pointRadius: 3,
                fill: true,
                tension: 0.15
            }]
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            plugins: { legend: { display: false } },
            scales: {
                x: { grid: { display: false }, ticks: { color: textColor } },
                y: { grid: { color: gridColor }, ticks: { maxTicksLimit: 6, color: textColor } }
            }
        }
    });
}

async function loadAndRenderChart(from, to) {
    if(from === to) return;
    const historyRates = await CurrencyAPI.getHistoricalData(from, to);
    if (!historyRates) return;

    cachedHistoryDates = Object.keys(historyRates).map(date => {
        const d = new Date(date);
        return `${d.getDate()}/${d.getMonth() + 1}`;
    });
    cachedHistoryValues = Object.values(historyRates).map(obj => obj[to]);
    cachedPairName = `${from}/${to}`;

    updateChart(cachedHistoryDates, cachedHistoryValues, cachedPairName);
}

// ==========================================
// 3. LOGIC GIAO DIỆN CHÍNH & ĐỔI THEME
// ==========================================
const currencyDetails = {
    // Tiền điện tử (Crypto)
    BTC: { name: 'Bitcoin', flag: '🪙', type: 'crypto' },
    ETH: { name: 'Ethereum', flag: '🔷', type: 'crypto' },
    BNB: { name: 'Binance Coin', flag: '🔶', type: 'crypto' },
    SOL: { name: 'Solana', flag: '🟣', type: 'crypto' },
    XRP: { name: 'Ripple', flag: '✖️', type: 'crypto' },
    ADA: { name: 'Cardano', flag: '🔵', type: 'crypto' },

    // Tiền tệ quốc gia (Fiat)
    USD: { name: 'Đô la Mỹ', flag: '🇺🇸', type: 'fiat' },
    EUR: { name: 'Euro', flag: '🇪🇺', type: 'fiat' },
    JPY: { name: 'Yên Nhật', flag: '🇯🇵', type: 'fiat' },
    VND: { name: 'Việt Nam Đồng', flag: '🇻🇳', type: 'fiat' },
    GBP: { name: 'Bảng Anh', flag: '🇬🇧', type: 'fiat' },
    AUD: { name: 'Đô la Úc', flag: '🇦🇺', type: 'fiat' },
    CAD: { name: 'Đô la Canada', flag: '🇨🇦', type: 'fiat' },
    CHF: { name: 'Franc Thụy Sĩ', flag: '🇨🇭', type: 'fiat' },
    CNY: { name: 'Nhân dân tệ', flag: '🇨🇳', type: 'fiat' },
    KRW: { name: 'Won Hàn Quốc', flag: '🇰🇷', type: 'fiat' },
    SGD: { name: 'Đô la Singapore', flag: '🇸🇬', type: 'fiat' },
    HKD: { name: 'Đô la Hồng Kông', flag: '🇭🇰', type: 'fiat' },
    NZD: { name: 'Đô la New Zealand', flag: '🇳🇿', type: 'fiat' },
    THB: { name: 'Baht Thái Lan', flag: '🇹🇭', type: 'fiat' },
    MYR: { name: 'Ringgit Malaysia', flag: '🇲🇾', type: 'fiat' },
    PHP: { name: 'Peso Philippines', flag: '🇵🇭', type: 'fiat' },
    IDR: { name: 'Rupiah Indonesia', flag: '🇮🇩', type: 'fiat' },
    INR: { name: 'Rupee Ấn Độ', flag: '🇮🇳', type: 'fiat' },
    BRL: { name: 'Real Brazil', flag: '🇧🇷', type: 'fiat' },
    MXN: { name: 'Peso Mexico', flag: '🇲🇽', type: 'fiat' },
    ZAR: { name: 'Rand Nam Phi', flag: '🇿🇦', type: 'fiat' },
    TRY: { name: 'Lira Thổ Nhĩ Kỳ', flag: '🇹🇷', type: 'fiat' },
    SEK: { name: 'Krona Thụy Điển', flag: '🇸🇪', type: 'fiat' },
    NOK: { name: 'Krone Na Uy', flag: '🇳🇴', type: 'fiat' },
    DKK: { name: 'Krone Đan Mạch', flag: '🇩🇰', type: 'fiat' },
    PLN: { name: 'Zloty Ba Lan', flag: '🇵🇱', type: 'fiat' },
    ILS: { name: 'Shekel Israel', flag: '🇮🇱', type: 'fiat' },
    HUF: { name: 'Forint Hungary', flag: '🇭🇺', type: 'fiat' },
    CZK: { name: 'Koruna Séc', flag: '🇨🇿', type: 'fiat' },
    BGN: { name: 'Lev Bulgaria', flag: '🇧🇬', type: 'fiat' },
    RON: { name: 'Leu Romania', flag: '🇷🇴', type: 'fiat' },
    ISK: { name: 'Krona Iceland', flag: '🇮🇸', type: 'fiat' }
};

let currentRates = {};
let favorites = JSON.parse(localStorage.getItem('fav_currencies')) || ['VND', 'EUR', 'BTC', 'ETH'];
let searchQuery = "";

document.addEventListener('DOMContentLoaded', async () => {
    initTheme(); 
    await initApp();
    setupEventListeners();
});

async function initApp() {
    currentRates = await CurrencyAPI.getLatestRates('USD');
    if (currentRates) {
        if (!currentRates['VND']) currentRates['VND'] = 25450;
        populateDropdowns();
        renderTables(); // 🌟 Cập nhật: Render đồng thời cả hai bảng riêng biệt
        calculateConversion();
        
        const from = document.getElementById('from-currency').value;
        const to = document.getElementById('to-currency').value;
        await loadAndRenderChart(from, to);
    }
}

function populateDropdowns() {
    const fromSelect = document.getElementById('from-currency');
    const toSelect = document.getElementById('to-currency');
    if(!fromSelect || !toSelect) return;

    const selectedFrom = fromSelect.value || 'USD';
    const selectedTo = toSelect.value || 'VND';

    fromSelect.innerHTML = '';
    toSelect.innerHTML = '';

    Object.keys(currencyDetails).forEach(code => {
        if (currentRates[code] !== undefined || code === 'USD') {
            const details = currencyDetails[code];
            const typeTag = details.type === 'crypto' ? ' [Crypto]' : '';
            const optionText = `${details.flag} ${code} - ${details.name}${typeTag}`;

            const optFrom = document.createElement('option');
            optFrom.value = code;
            optFrom.textContent = optionText;
            fromSelect.appendChild(optFrom);

            const optTo = document.createElement('option');
            optTo.value = code;
            optTo.textContent = optionText;
            toSelect.appendChild(optTo);
        }
    });

    fromSelect.value = selectedFrom;
    toSelect.value = selectedTo;
}

// Định nhận dạng số thập phân động cho hộp tính toán quy đổi ô Input
function formatCurrencyValue(value, code) {
    const isCrypto = currencyDetails[code]?.type === 'crypto';
    if (isCrypto) {
        if (value < 0.01) {
            return value.toLocaleString('vi-VN', { minimumFractionDigits: 2, maximumFractionDigits: 8 });
        }
        return value.toLocaleString('vi-VN', { minimumFractionDigits: 2, maximumFractionDigits: 4 });
    }
    return value.toLocaleString('vi-VN', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}

// 🌟 ĐIỀU CHỈNH LỚN: Phân tách kết xuất dữ liệu ra 2 khung bảng độc lập
function renderTables() {
    renderFiatTable();
    renderCryptoTable();
}

// BẢNG 1: Kết xuất dữ liệu tiền quốc gia (Khung Fiat)
function renderFiatTable() {
    const tbody = document.getElementById('rates-table-body');
    if (!tbody) return;
    tbody.innerHTML = '';

    let keys = Object.keys(currencyDetails).filter(k => currencyDetails[k].type === 'fiat' && k !== 'USD');
    if (searchQuery.trim() !== "") {
        const q = searchQuery.toLowerCase().trim();
        keys = keys.filter(code => 
            code.toLowerCase().includes(q) || 
            currencyDetails[code].name.toLowerCase().includes(q)
        );
    }

    keys.sort((a, b) => {
        const aFav = favorites.includes(a) ? 1 : 0;
        const bFav = favorites.includes(b) ? 1 : 0;
        return bFav - aFav;
    });

    keys.forEach((code, index) => {
        if (currentRates[code] === undefined) return;

        const rateValue = currentRates[code];
        const isFav = favorites.includes(code);
        const details = currencyDetails[code];

        const tr = document.createElement('tr');
        tr.style.animationDelay = `${index * 15}ms`;
        tr.className = "hover:bg-slate-100/50 dark:hover:bg-slate-800/40 border-b border-slate-100 dark:border-slate-800/60 transition-all duration-200 animate-fade-in-row opacity-0";
        tr.innerHTML = `
            <td class="py-3.5 pl-1">
                <button data-code="${code}" class="btn-fav text-slate-300 dark:text-slate-700 hover:text-amber-400 dark:hover:text-amber-400 transition-colors cursor-pointer duration-300 scale-110 ${isFav ? 'text-amber-400 dark:text-amber-400 scale-120' : ''}">
                    <i class="${isFav ? 'fa-solid' : 'fa-regular'} fa-star"></i>
                </button>
            </td>
            <td class="py-3.5 flex items-center space-x-3">
                <span class="text-2xl">${details.flag || '🏳️'}</span>
                <div>
                    <div class="font-bold tracking-tight text-slate-900 dark:text-white">${code}</div>
                    <div class="text-xs text-slate-400 dark:text-slate-500 font-medium">${details.name}</div>
                </div>
            </td>
            <td class="py-3.5 text-right font-bold font-mono text-sm text-slate-700 dark:text-slate-300">
                ${rateValue.toLocaleString('vi-VN', { maximumFractionDigits: 2 })}
            </td>
        `;
        tbody.appendChild(tr);
    });

    bindFavEvents();
}

// BẢNG 2: Kết xuất dữ liệu tiền điện tử chuẩn giá thị trường quốc tế (Khung Crypto)
function renderCryptoTable() {
    const tbody = document.getElementById('crypto-table-body');
    if (!tbody) return;
    tbody.innerHTML = '';

    let keys = Object.keys(currencyDetails).filter(k => currencyDetails[k].type === 'crypto');
    const marketPrices = JSON.parse(localStorage.getItem('crypto_market_prices')) || {};

    if (searchQuery.trim() !== "") {
        const q = searchQuery.toLowerCase().trim();
        keys = keys.filter(code => 
            code.toLowerCase().includes(q) || 
            currencyDetails[code].name.toLowerCase().includes(q)
        );
    }

    keys.sort((a, b) => {
        const aFav = favorites.includes(a) ? 1 : 0;
        const bFav = favorites.includes(b) ? 1 : 0;
        return bFav - aFav;
    });

    keys.forEach((code, index) => {
        // Lấy giá thị trường thực tế (1 Crypto = X USD) từ bộ nhớ hoặc cache
        const actualPriceUSD = marketPrices[code] || (currentRates[code] ? 1 / currentRates[code] : 0);
        if (actualPriceUSD === 0) return;

        const isFav = favorites.includes(code);
        const details = currencyDetails[code];

        const tr = document.createElement('tr');
        tr.style.animationDelay = `${index * 15}ms`;
        tr.className = "hover:bg-slate-100/50 dark:hover:bg-slate-800/40 border-b border-slate-100 dark:border-slate-800/60 transition-all duration-200 animate-fade-in-row opacity-0";
        tr.innerHTML = `
            <td class="py-3.5 pl-1">
                <button data-code="${code}" class="btn-fav text-slate-300 dark:text-slate-700 hover:text-amber-400 dark:hover:text-amber-400 transition-colors cursor-pointer duration-300 scale-110 ${isFav ? 'text-amber-400 dark:text-amber-400 scale-120' : ''}">
                    <i class="${isFav ? 'fa-solid' : 'fa-regular'} fa-star"></i>
                </button>
            </td>
            <td class="py-3.5 flex items-center space-x-3">
                <span class="text-2xl">${details.flag}</span>
                <div>
                    <div class="font-bold tracking-tight text-slate-900 dark:text-white">${code}</div>
                    <div class="text-xs text-slate-400 dark:text-slate-500 font-medium">${details.name}</div>
                </div>
            </td>
            <td class="py-3.5 text-right font-bold font-mono text-sm text-emerald-600 dark:text-emerald-400">
                $${actualPriceUSD.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 4 })}
            </td>
        `;
        tbody.appendChild(tr);
    });

    bindFavEvents();
}

// Hàm hỗ trợ lắng nghe sự kiện nút ghim yêu thích
function bindFavEvents() {
    document.querySelectorAll('.btn-fav').forEach(btn => {
        btn.replaceWith(btn.cloneNode(true)); // Loại bỏ các EventListener cũ tránh lặp
    });
    document.querySelectorAll('.btn-fav').forEach(btn => {
        btn.addEventListener('click', (e) => {
            const code = e.currentTarget.getAttribute('data-code');
            toggleFavorite(code);
        });
    });
}

function toggleFavorite(code) {
    if (favorites.includes(code)) {
        favorites = favorites.filter(item => item !== code);
    } else {
        favorites.push(code);
    }
    localStorage.setItem('fav_currencies', JSON.stringify(favorites));
    renderTables();
}

// Bộ tính toán chuyển đổi (Đã sửa lỗi crash giao diện do biến amount)
function calculateConversion() {
    const fromAmountInput = document.getElementById('from-amount');
    const toAmountInput = document.getElementById('to-amount');
    const rateInfo = document.getElementById('rate-info');
    if(!fromAmountInput || !toAmountInput) return;

    const fromAmount = parseFloat(fromAmountInput.value);
    const fromCurr = document.getElementById('from-currency').value;
    const toCurr = document.getElementById('to-currency').value;

    // 🌟 SỬA LỖI: Thay thế từ 'amount' thành 'fromAmount' chuẩn xác 100%
    if (isNaN(fromAmount) || fromAmount <= 0) {
        toAmountInput.value = '';
        return;
    }
    const rateFromUSD = fromCurr === 'USD' ? 1 : (currentRates[fromCurr] || 1);
    const rateToUSD = toCurr === 'USD' ? 1 : (currentRates[toCurr] || 1);
    const result = (fromAmount / rateFromUSD) * rateToUSD;
    
    toAmountInput.value = formatCurrencyValue(result, toCurr);

    const exchangeRate = rateToUSD / rateFromUSD;
    if (rateInfo) {
        const maxDigits = (currencyDetails[fromCurr]?.type === 'crypto' || currencyDetails[toCurr]?.type === 'crypto') ? 8 : 4;
        rateInfo.innerHTML = `<i class="fa-solid fa-circle-info text-emerald-500"></i> Tỷ giá đối chiếu: 1 ${fromCurr} = ${exchangeRate.toLocaleString('vi-VN', {maximumFractionDigits: maxDigits})} ${toCurr}`;
    }
}

// Quản lý Dark/Light Theme
function initTheme() {
    const savedTheme = localStorage.getItem('theme') || 'light';
    applyTheme(savedTheme);
}

function toggleTheme() {
    const isDark = document.documentElement.classList.contains('dark');
    const newTheme = isDark ? 'light' : 'dark';
    applyTheme(newTheme);
    
    if (cachedHistoryDates.length > 0) {
        updateChart(cachedHistoryDates, cachedHistoryValues, cachedPairName);
    }
}

function applyTheme(theme) {
    const icon = document.getElementById('theme-icon');
    if (theme === 'dark') {
        document.documentElement.classList.add('dark');
        localStorage.setItem('theme', 'dark');
        if(icon) icon.className = "fa-solid fa-sun text-amber-400";
        
        document.documentElement.style.setProperty('--bg-main', '#020617');
        document.documentElement.style.setProperty('--bg-card', '#0f172a');
        document.documentElement.style.setProperty('--bg-input', '#020617');
        document.documentElement.style.setProperty('--text-main', '#f8fafc');
        document.documentElement.style.setProperty('--text-muted', '#94a3b8');
        document.documentElement.style.setProperty('--border-color', '#1e293b');
    } else {
        document.documentElement.classList.remove('dark');
        localStorage.setItem('theme', 'light');
        if(icon) icon.className = "fa-solid fa-moon";
        
        document.documentElement.style.setProperty('--bg-main', '#f8fafc');
        document.documentElement.style.setProperty('--bg-card', '#ffffff');
        document.documentElement.style.setProperty('--bg-input', '#f1f5f9');
        document.documentElement.style.setProperty('--text-main', '#0f172a');
        document.documentElement.style.setProperty('--text-muted', '#64748b');
        document.documentElement.style.setProperty('--border-color', '#e2e8f0');
    }
}

function setupEventListeners() {
    document.getElementById('from-amount').addEventListener('input', calculateConversion);
    document.getElementById('search-currency').addEventListener('input', (e) => {
        searchQuery = e.target.value;
        renderTables(); // Cập nhật tìm kiếm thời gian thực cho cả 2 bảng độc lập
    });
    document.getElementById('btn-theme').addEventListener('click', toggleTheme);
    document.getElementById('from-currency').addEventListener('change', () => {
        calculateConversion();
        loadAndRenderChart(document.getElementById('from-currency').value, document.getElementById('to-currency').value);
    });
    document.getElementById('to-currency').addEventListener('change', () => {
        calculateConversion();
        loadAndRenderChart(document.getElementById('from-currency').value, document.getElementById('to-currency').value);
    });
    document.getElementById('btn-swap').addEventListener('click', () => {
        const fromSelect = document.getElementById('from-currency');
        const toSelect = document.getElementById('to-currency');
        const temp = fromSelect.value;
        fromSelect.value = toSelect.value;
        toSelect.value = temp;
        calculateConversion();
        loadAndRenderChart(fromSelect.value, toSelect.value);
    });
    window.addEventListener('api-offline', (e) => {
        const statusBadge = document.getElementById('network-status');
        if (statusBadge) {
            statusBadge.className = "text-xs font-semibold px-3 py-1.5 rounded-xl bg-amber-100 text-amber-800 dark:bg-amber-950 dark:text-amber-400 shadow-xs";
            statusBadge.innerHTML = `<i class="fa-solid fa-cloud-sun text-[10px] mr-1.5"></i> Dự phòng (${e.detail})`;
        }
    });
    window.addEventListener('api-online', () => {
        const statusBadge = document.getElementById('network-status');
        if (statusBadge) {
            statusBadge.className = "text-xs font-semibold px-3 py-1.5 rounded-xl bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-400 shadow-xs";
            statusBadge.innerHTML = `<i class="fa-solid fa-circle text-[9px] mr-1.5 animate-ping text-emerald-500"></i> Trực tuyến`;
        }
    });
}