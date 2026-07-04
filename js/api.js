// Cấu hình thông tin hiển thị tiền tệ - Đã bổ sung các đồng Crypto phổ biến ở trên cùng
const currencyDetails = {
    // Tiền điện tử (Crypto)
    BTC: { name: 'Bitcoin', flag: '🪙', type: 'crypto' },
    ETH: { name: 'Ethereum', flag: '🔷', type: 'crypto' },
    BNB: { name: 'Binance Coin', flag: '🔶', type: 'crypto' },
    SOL: { name: 'Solana', flag: '🟣', type: 'crypto' },
    XRP: { name: 'Ripple', flag: '✖️', type: 'crypto' },
    ADA: { name: 'Cardano', flag: '🔵', type: 'crypto' },

    // Tiền truyền thống (Fiat)
    USD: { name: 'Đô la Mỹ', flag: '🇺🇸', type: 'fiat' },
    VND: { name: 'Việt Nam Đồng', flag: '🇻🇳', type: 'fiat' },
    EUR: { name: 'Euro', flag: '🇪🇺', type: 'fiat' },
    JPY: { name: 'Yên Nhật', flag: '🇯🇵', type: 'fiat' },
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
        renderTable();
        calculateConversion();
        
        const from = document.getElementById('from-currency').value;
        const to = document.getElementById('to-currency').value;
        if (typeof loadAndRenderChart === 'function') loadAndRenderChart(from, to);
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
        // Chỉ thêm vào menu nếu API trả về dữ liệu cho đồng tiền này
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

// Hàm bổ trợ định dạng số thập phân linh hoạt tùy theo loại tiền tệ
function formatCurrencyValue(value, code) {
    const isCrypto = currencyDetails[code]?.type === 'crypto';
    if (isCrypto) {
        // Nếu giá trị rất nhỏ (ví dụ tỷ giá USD sang BTC), cho phép hiển thị tối đa 8 số thập phân
        if (value < 0.01) {
            return value.toLocaleString('vi-VN', { minimumFractionDigits: 2, maximumFractionDigits: 8 });
        }
        return value.toLocaleString('vi-VN', { minimumFractionDigits: 2, maximumFractionDigits: 4 });
    }
    // Tiền truyền thống (Fiat) giữ nguyên tối đa 2 chữ số thập phân
    return value.toLocaleString('vi-VN', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}

function renderTable() {
    const tbody = document.getElementById('rates-table-body');
    if (!tbody) return;
    tbody.innerHTML = '';

    let keys = Object.keys(currencyDetails).filter(k => k !== 'USD');
    
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
        if (currentRates[code] === undefined) return; // Bỏ qua nếu thiếu dữ liệu tỷ giá từ API

        const rateValue = currentRates[code];
        const isFav = favorites.includes(code);
        const details = currencyDetails[code];

        const tr = document.createElement('tr');
        tr.style.animationDelay = `${index * 15}ms`;
        tr.className = "hover:bg-slate-50/50 dark:hover:bg-slate-800/40 border-b border-slate-100 dark:border-slate-800/60 transition-all duration-200 animate-fade-in-row opacity-0";
        tr.innerHTML = `
            <td class="py-3.5 pl-1">
                <button data-code="${code}" class="btn-fav text-slate-300 dark:text-slate-700 hover:text-amber-400 dark:hover:text-amber-400 transition-colors cursor-pointer duration-300 scale-110 ${isFav ? 'text-amber-400 dark:text-amber-400 scale-120' : ''}">
                    <i class="${isFav ? 'fa-solid' : 'fa-regular'} fa-star"></i>
                </button>
            </td>
            <td class="py-3.5 flex items-center space-x-3">
                <span class="text-2xl filter drop-shadow-xs">${details.flag || '🏳️'}</span>
                <div>
                    <div class="font-bold tracking-tight flex items-center gap-1.5">
                        ${code}
                        ${details.type === 'crypto' ? '<span class="text-[9px] bg-amber-100 dark:bg-amber-950 text-amber-600 dark:text-amber-400 px-1 rounded font-sans font-normal">Crypto</span>' : ''}
                    </div>
                    <div class="text-xs text-slate-400 dark:text-slate-500 font-medium">${details.name}</div>
                </div>
            </td>
            <td class="py-3.5 text-right font-bold font-mono text-sm text-emerald-600 dark:text-emerald-400">
                ${formatCurrencyValue(rateValue, code)}
            </td>
        `;
        tbody.appendChild(tr);
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
    renderTable();
}

function calculateConversion() {
    const fromAmountInput = document.getElementById('from-amount');
    const toAmountInput = document.getElementById('to-amount');
    const rateInfo = document.getElementById('rate-info');
    
    if(!fromAmountInput || !toAmountInput) return;

    const fromAmount = parseFloat(fromAmountInput.value);
    const fromCurr = document.getElementById('from-currency').value;
    const toCurr = document.getElementById('to-currency').value;

    if (isNaN(fromAmount) || fromAmount <= 0) {
        toAmountInput.value = '';
        return;
    }

    const rateFromUSD = fromCurr === 'USD' ? 1 : (currentRates[fromCurr] || 1);
    const rateToUSD = toCurr === 'USD' ? 1 : (currentRates[toCurr] || 1);

    // Tính số tiền kết quả dựa trên tỷ giá cơ sở USD
    const result = (fromAmount / rateFromUSD) * rateToUSD;
    
    // Áp dụng định dạng hiển thị thập phân động
    toAmountInput.value = formatCurrencyValue(result, toCurr);

    const exchangeRate = rateToUSD / rateFromUSD;
    if (rateInfo) {
        // Tỷ giá đối chiếu hiển thị nhiều số thập phân hơn khi liên quan tới Crypto
        const maxDigits = (currencyDetails[fromCurr]?.type === 'crypto' || currencyDetails[toCurr]?.type === 'crypto') ? 8 : 4;
        rateInfo.innerHTML = `<i class="fa-solid fa-circle-info text-emerald-500"></i> Tỷ giá đối chiếu: 1 ${fromCurr} = ${exchangeRate.toLocaleString('vi-VN', {maximumFractionDigits: maxDigits})} ${toCurr}`;
    }
}

function initTheme() {
    const savedTheme = localStorage.getItem('theme') || 'light';
    const icon = document.getElementById('theme-icon');
    
    if (savedTheme === 'dark') {
        document.documentElement.classList.add('dark');
        if(icon) icon.className = "fa-solid fa-sun text-amber-400";
    } else {
        document.documentElement.classList.remove('dark');
        if(icon) icon.className = "fa-solid fa-moon";
    }
}

function toggleTheme() {
    const isDark = document.documentElement.classList.toggle('dark');
    const icon = document.getElementById('theme-icon');
    localStorage.setItem('theme', isDark ? 'dark' : 'light');
    
    if(icon) icon.className = isDark ? "fa-solid fa-sun text-amber-400" : "fa-solid fa-moon";
    
    const from = document.getElementById('from-currency').value;
    const to = document.getElementById('to-currency').value;
    if (typeof loadAndRenderChart === 'function') loadAndRenderChart(from, to);
}

function setupEventListeners() {
    document.getElementById('from-amount').addEventListener('input', calculateConversion);
    
    document.getElementById('search-currency').addEventListener('input', (e) => {
        searchQuery = e.target.value;
        renderTable();
    });

    document.getElementById('btn-theme').addEventListener('click', toggleTheme);

    document.getElementById('from-currency').addEventListener('change', () => {
        calculateConversion();
        if (typeof loadAndRenderChart === 'function') loadAndRenderChart(document.getElementById('from-currency').value, document.getElementById('to-currency').value);
    });
    
    document.getElementById('to-currency').addEventListener('change', () => {
        calculateConversion();
        if (typeof loadAndRenderChart === 'function') loadAndRenderChart(document.getElementById('from-currency').value, document.getElementById('to-currency').value);
    });

    document.getElementById('btn-swap').addEventListener('click', () => {
        const fromSelect = document.getElementById('from-currency');
        const toSelect = document.getElementById('to-currency');
        
        const temp = fromSelect.value;
        fromSelect.value = toSelect.value;
        toSelect.value = temp;

        calculateConversion();
        if (typeof loadAndRenderChart === 'function') loadAndRenderChart(fromSelect.value, toSelect.value);
    });

    window.addEventListener('api-offline', (e) => {
        const statusBadge = document.getElementById('network-status');
        if (statusBadge) {
            statusBadge.innerHTML = `<i class="fa-solid fa-cloud-sun text-[10px] mr-1.5"></i> Dự phòng (${e.detail})`;
        }
    });

    window.addEventListener('api-online', () => {
        const statusBadge = document.getElementById('network-status');
        if (statusBadge) {
            statusBadge.innerHTML = `<i class="fa-solid fa-circle text-[9px] mr-1.5 animate-ping text-emerald-500"></i> Trực tuyến`;
        }
    });
}