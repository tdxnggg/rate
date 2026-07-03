const currencyDetails = {
    USD: { name: 'Đô la Mỹ', flag: '🇺🇸' },
    VND: { name: 'Việt Nam Đồng', flag: '🇻🇳' },
    EUR: { name: 'Euro', flag: '🇪🇺' },
    JPY: { name: 'Yên Nhật', flag: '🇯🇵' },
    GBP: { name: 'Bảng Anh', flag: '🇬🇧' },
    AUD: { name: 'Đô la Úc', flag: '🇦🇺' },
    CAD: { name: 'Đô la Canada', flag: '🇨🇦' },
    CHF: { name: 'Franc Thụy Sĩ', flag: '🇨🇭' },
    CNY: { name: 'Nhân dân tệ', flag: '🇨🇳' },
    KRW: { name: 'Won Hàn Quốc', flag: '🇰🇷' },
    SGD: { name: 'Đô la Singapore', flag: '🇸🇬' },
    HKD: { name: 'Đô la Hồng Kông', flag: '🇭🇰' },
    NZD: { name: 'Đô la New Zealand', flag: '🇳🇿' },
    THB: { name: 'Baht Thái Lan', flag: '🇹🇭' },
    MYR: { name: 'Ringgit Malaysia', flag: '🇲🇾' },
    PHP: { name: 'Peso Philippines', flag: '🇵🇭' },
    IDR: { name: 'Rupiah Indonesia', flag: '🇮🇩' },
    INR: { name: 'Rupee Ấn Độ', flag: '🇮🇳' },
    BRL: { name: 'Real Brazil', flag: '🇧🇷' },
    MXN: { name: 'Peso Mexico', flag: '🇲🇽' },
    ZAR: { name: 'Rand Nam Phi', flag: '🇿🇦' },
    TRY: { name: 'Lira Thổ Nhĩ Kỳ', flag: '🇹🇷' },
    SEK: { name: 'Krona Thụy Điển', flag: '🇸🇪' },
    NOK: { name: 'Krone Na Uy', flag: '🇳🇴' },
    DKK: { name: 'Krone Đan Mạch', flag: '🇩🇰' },
    PLN: { name: 'Zloty Ba Lan', flag: '🇵🇱' },
    ILS: { name: 'Shekel Israel', flag: '🇮🇱' },
    HUF: { name: 'Forint Hungary', flag: '🇭🇺' },
    CZK: { name: 'Koruna Séc', flag: '🇨🇿' },
    BGN: { name: 'Lev Bulgaria', flag: '🇧🇬' },
    RON: { name: 'Leu Romania', flag: '🇷🇴' },
    ISK: { name: 'Krona Iceland', flag: '🇮🇸' }
};

let currentRates = {};
let favorites = JSON.parse(localStorage.getItem('fav_currencies')) || ['VND', 'EUR', 'JPY', 'KRW'];
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
        const details = currencyDetails[code];
        const optionText = `${details.flag} ${code} - ${details.name}`;

        const optFrom = document.createElement('option');
        optFrom.value = code;
        optFrom.textContent = optionText;
        fromSelect.appendChild(optFrom);

        const optTo = document.createElement('option');
        optTo.value = code;
        optTo.textContent = optionText;
        toSelect.appendChild(optTo);
    });

    fromSelect.value = selectedFrom;
    toSelect.value = selectedTo;
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
        const rateValue = currentRates[code] || 1;
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
                    <div class="font-bold tracking-tight">${code}</div>
                    <div class="text-xs text-slate-400 dark:text-slate-500 font-medium">${details.name}</div>
                </div>
            </td>
            <td class="py-3.5 text-right font-bold font-mono text-sm">
                ${rateValue.toLocaleString('vi-VN', { maximumFractionDigits: 2 })}
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

    const result = (fromAmount / rateFromUSD) * rateToUSD;
    
    toAmountInput.value = result.toLocaleString('vi-VN', { minimumFractionDigits: 2, maximumFractionDigits: 2 });

    const exchangeRate = rateToUSD / rateFromUSD;
    if (rateInfo) {
        rateInfo.innerHTML = `<i class="fa-solid fa-circle-info text-emerald-500"></i> Tỷ giá đối chiếu: 1 ${fromCurr} = ${exchangeRate.toLocaleString('vi-VN', {maximumFractionDigits: 4})} ${toCurr}`;
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