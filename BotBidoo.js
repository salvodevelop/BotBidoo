
const KEYWORDS = ["Asciugacapelli", "Gillette"];

const MY_NICKNAME = "xxxxxxxx";

const TWO_LEFT_WINDOW = 6;
const ALTERNATING_WINDOW = 4;

const MIN_COUNT = 5;
const MAX_COUNT = 10;

const TARGET_TIME = "00:01";

const MONITOR_INTERVAL_MS = 1000;

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

function matchInteressi(descrizione, keywords) {
    if (!descrizione) return false;
    const desc = descrizione.toLowerCase();
    return keywords.some(k => desc.includes(k.toLowerCase()));
}

function getArticoliInteressanti(keywords) {

    const risultati = [];

    $('.bid-box.box_cards').each(function () {

        const $box = $(this);

        let tempo = $box.find('.timer-missing').text();
        tempo = tempo ? tempo.trim() : '';
        if (!tempo) return;

        const descrizione = $box.find('.auction.photo .name').text().trim();
        if (!matchInteressi(descrizione, keywords)) return;

        const prezzoAsta = parseEuro($box.find('.price span:first').text());

        const prezzoBuyNow = parseEuro(
            $box.find('.btn-rapid.buy-rapid-now')
                .clone().children().remove().end().text()
        );

        const nickname = $box.find('.winner .nickname').text().trim();
        const $btnPunta = $box.find('a.button-green-gradient:contains("PUNTA")');

        let idAsta = $box.find('.actBox').attr('id');
        idAsta = idAsta ? idAsta.replace('actBox', '') : null;

        risultati.push({
            idAsta,
            descrizione,
            prezzoAsta,
            prezzoBuyNow,
            nickname,
            tempo,
            btnPunta: $btnPunta
        });
    });

    return risultati;
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

    const unique = new Set(recent);

    return unique.size;
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

const historyMap = {};
const countMap = {};

const handleMyMonitor = setInterval(function () {

    const crediti = getCreditiResidui();
    const articoli = getArticoliInteressanti(KEYWORDS);

    if (crediti <= 0 || articoli.length === 0) {

        console.log("STOP monitor — nessun credito o nessun articolo.");
        clearInterval(handleMyMonitor);
        return;
    }

    articoli.forEach(function (a) {

        countMap[a.idAsta] ??= 0;
        historyMap[a.idAsta] ??= [];

        const history = historyMap[a.idAsta];

        if (history.length === 0 || history[history.length - 1] !== a.nickname) {
            history.push(a.nickname);
        }

        const twoLeft = countAttivi(history, TWO_LEFT_WINDOW);
        const alternating = isAlternating(history, ALTERNATING_WINDOW);

        const count = countMap[a.idAsta];

        console.log(
            `Credito:${crediti} | Art:${articoli.length} | attivi:${twoLeft} | alt:${alternating}`
        );

        if (a.tempo === TARGET_TIME) {
            console.log(a.descrizione, a.prezzoAsta, a.nickname);
            console.log(history.slice(-4));
        }

        if (
            (
                (twoLeft <= 2 && alternating) ||
                (count >= MIN_COUNT && count <= MAX_COUNT)
            )
            && a.tempo === TARGET_TIME
        ) {

            console.log('CLICK SU:', a.descrizione);

            humanClick(a.btnPunta);

            countMap[a.idAsta]++;

            console.log('COUNT:', countMap[a.idAsta]);
        }
    });

}, MONITOR_INTERVAL_MS);
