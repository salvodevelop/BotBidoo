const MY_NICKNAME = "salvogel2";

const TWO_LEFT_WINDOW = 6;
const ALTERNATING_WINDOW = 4;

//const MIN_COUNT = 5;
const MAX_COUNT = 10;

const TARGET_TIME = "00:01";
const MONITOR_INTERVAL_MS = 1000;

let history = [];
let alertCount = 0;

function parseEuro(val) {
    if (!val) return null;

    return parseFloat(
        val
            .replace('€', '')
            .replace(/\s+/g, '')
            .replace('.', '')
            .replace(',', '.')
    );
}

function normalizeTempo(raw) {
    if (!raw) return "";

    raw = raw.trim();

    // Caso già formato 00:05
    const matchMmSs = raw.match(/\b\d{1,2}:\d{2}\b/);
    if (matchMmSs) {
        return matchMmSs[0].padStart(5, "0");
    }

    // Caso "5 s", "5s", "5"
    const matchSeconds = raw.match(/\d+/);
    if (matchSeconds) {
        const sec = Number(matchSeconds[0]);
        if (!Number.isNaN(sec)) {
            return "00:" + String(sec).padStart(2, "0");
        }
    }

    return raw;
}

function getTempoDettaglio() {
    // Timer mobile: <b class="auction-action-timer auction-header-item-size">00:05</b>
    let raw = $('.auction-action-timer.auction-header-item-size:visible').first().text();

    // Fallback desktop: <div class="auction-action-timer"><p><strong>5 s</strong></p></div>
    if (!raw || !raw.trim()) {
        raw = $('.auction-action-header .auction-action-timer strong:visible').first().text();
    }

    // Fallback progressbar desktop: <div class="text-countdown-progressbar">5</div>
    if (!raw || !raw.trim()) {
        raw = $('.text-countdown-progressbar:visible').first().text();
    }

    return normalizeTempo(raw);
}

function getDettaglioAsta() {
    const tempo = getTempoDettaglio();

    const descrizione =
        $('meta[property="og:title"]').attr('content') ||
        $('title').text().replace('- Bidoo', '').trim() ||
        'Dettaglio asta';

    const prezzoAsta = parseEuro(
        $('.auction-price.auction-header-item-size:visible').first().text() ||
        $('.auction-action-price strong:visible').first().text()
    );

    const nickname = $('.auction-current-winner:visible').first().text().trim();

    const $btnPunta = $('.auction-btn-bid:contains("PUNTA"):visible, .auction-btn-bid:contains("VINCENDO"):visible').first();

    const idAsta =
        window.auction_id ||
        $('.autobid-switch').data('id') ||
        $('.auction-favorite').data('id') ||
        null;

    return {
        idAsta,
        descrizione,
        prezzoAsta,
        nickname,
        tempo,
        btnPunta: $btnPunta
    };
}

function getCreditiResidui() {
    const el = document.getElementById('divSaldoBidBottom');
    if (!el) return 0;

    return Number(el.textContent.replace(/\D/g, '')) || 0;
}

function countAttivi(history, windowSize) {
    if (history.length < windowSize) return 99;

    const filtered = history.filter(p => p !== MY_NICKNAME);
    const recent = filtered.slice(-windowSize);

    return new Set(recent).size;
}

function isAlternating(history, checkSize) {
    if (history.length < checkSize) return false;

    const filtered = history.filter(p => p !== MY_NICKNAME);
    const recent = filtered.slice(-checkSize);

    for (let i = 1; i < recent.length; i++) {
        if (recent[i] === recent[i - 1]) {
            return false;
        }
    }

    return true;
}

function humanClick($el) {
    if (!$el || !$el.length) return;

    const el = $el[0];

    ['mousedown', 'mouseup', 'click'].forEach(type => {
        el.dispatchEvent(new MouseEvent(type, {
            bubbles: true,
            cancelable: true,
            view: window,
            buttons: 1
        }));
    });
}

function resetEvidenzaPulsante($btn) {
    if (!$btn || !$btn.length) return;

    $btn.css({
        outline: '',
        boxShadow: ''
    });
}

const handleMyMonitor = setInterval(function () {
    const crediti = getCreditiResidui();
    const asta = getDettaglioAsta();

    if (crediti <= 0) {
        console.log("STOP monitor — nessun credito.");
        clearInterval(handleMyMonitor);
        return;
    }

    if (!asta.tempo) {
        console.log("Timer non trovato nella pagina dettaglio.");
        return;
    }

    if (!asta.btnPunta.length || !asta.btnPunta.is(':visible')) {
		console.log("STOP monitor — pulsante PUNTA non è più visibile.");
		clearInterval(handleMyMonitor);
		return;
	}

    if (asta.nickname) {
        if (history.length === 0 || history[history.length - 1] !== asta.nickname) {
            history.push(asta.nickname);
        }
    }

    const twoLeft = countAttivi(history, TWO_LEFT_WINDOW);
    const alternating = isAlternating(history, ALTERNATING_WINDOW);

    const shouldNotify =
        (
            (twoLeft <= 2) || (alertCount >= MAX_COUNT)
        )
        && (asta.tempo === TARGET_TIME || asta.tempo === "00:00");

    console.log(
        `Credito:${crediti} | Tempo:${asta.tempo} | Prezzo:${asta.prezzoAsta} | Winner:${asta.nickname} | attivi:${twoLeft} | alt:${alternating} | alertCount:${alertCount}`
    );

    if (shouldNotify) {
        console.log("CONDIZIONE OK:", asta.descrizione);
        console.log("History:", history.slice(-6));

        humanClick(asta.btnPunta);

        alertCount++;
    } else {
        resetEvidenzaPulsante(asta.btnPunta);
    }

}, MONITOR_INTERVAL_MS);
