'use strict';

const STORAGE_KEY = 'fut-duros-resenha-v1';
const ROUND_MATCH_LIMIT = 5;
const elements = {
    aviso: document.querySelector('#aviso-aplicacao'),
    seletorRodada: document.querySelector('#seletor-rodada'),
    textoResumoRodada: document.querySelector('#texto-resumo-rodada'),
    quantidadeRodadas: document.querySelector('#quantidade-rodadas'),
    listaBabas: document.querySelector('#lista-babas'),
    vazioBabas: document.querySelector('#vazio-babas'),
    formularioBaba: document.querySelector('#formulario-baba'),
    numeroRodada: document.querySelector('#numero-rodada'),
    dataBaba: document.querySelector('#data-baba'),
    localBaba: document.querySelector('#local-baba'),
    placarBaba: document.querySelector('#placar-baba'),
    gradeDesempenho: document.querySelector('#grade-desempenho'),
    semJogadores: document.querySelector('#sem-jogadores'),
    listaAniversariantes: document.querySelector('#lista-aniversariantes'),
    vazioAniversariantes: document.querySelector('#vazio-aniversariantes'),
    mesAniversarios: document.querySelector('#mes-aniversarios'),
    abasRanking: [...document.querySelectorAll('.aba-ranking')],
    conteudoRanking: document.querySelector('#conteudo-ranking'),
    listaRanking: document.querySelector('#lista-ranking'),
    vazioRanking: document.querySelector('#vazio-ranking'),
    escopoRanking: document.querySelector('#escopo-ranking'),
    formularioJogador: document.querySelector('#formulario-jogador'),
    nomeJogador: document.querySelector('#nome-jogador'),
    nascimentoJogador: document.querySelector('#nascimento-jogador'),
    totalCadastrados: document.querySelector('#total-cadastrados'),
    listaElenco: document.querySelector('#lista-elenco'),
    vazioElenco: document.querySelector('#vazio-elenco'),
    formularioChurrasco: document.querySelector('#formulario-churrasco'),
    dataChurrasco: document.querySelector('#data-churrasco'),
    localChurrasco: document.querySelector('#local-churrasco'),
    valorChurrasco: document.querySelector('#valor-churrasco'),
    convidadosChurrasco: document.querySelector('#convidados-churrasco'),
    listaChurrascos: document.querySelector('#lista-churrascos'),
    vazioChurrascos: document.querySelector('#vazio-churrascos'),
    quantidadeChurrascos: document.querySelector('#quantidade-churrascos')
};

let state = { players: [], matches: [], barbecues: [] };
let activeRanking = 'goals';

function localDateString(date = new Date()) {
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const day = String(date.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
}

function normalizeName(name) {
    return name.trim().replace(/\s+/g, ' ').toLocaleLowerCase('pt-BR');
}

function setWarning(message) {
    elements.aviso.textContent = message;
}

function isValidDateString(value) {
    if (typeof value !== 'string' || !/^\d{4}-\d{2}-\d{2}$/.test(value)) return false;
    const parsed = new Date(`${value}T12:00:00`);
    return !Number.isNaN(parsed.getTime()) && localDateString(parsed) === value;
}

function loadState() {
    try {
        const saved = localStorage.getItem(STORAGE_KEY);
        if (!saved) return;

        const parsed = JSON.parse(saved);
        if (!parsed || typeof parsed !== 'object' || Array.isArray(parsed)) {
            throw new Error('Os dados salvos não estão no formato esperado.');
        }

        const invalid = [];
        const players = Array.isArray(parsed.players)
            ? parsed.players.filter((player) => {
                const valid = player
                    && typeof player.id === 'string'
                    && typeof player.name === 'string'
                    && (player.birthday === null || isValidDateString(player.birthday));
                if (!valid) invalid.push('jogadores');
                return valid;
            })
            : [];
        const matches = Array.isArray(parsed.matches)
            ? parsed.matches.filter((match) => {
                const valid = match
                    && typeof match.id === 'string'
                    && Number.isInteger(match.round)
                    && isValidDateString(match.date)
                    && typeof match.location === 'string'
                    && typeof match.score === 'string'
                    && /^\d{1,2}\s*[xX:]\s*\d{1,2}$/.test(match.score)
                    && Array.isArray(match.performances)
                    && match.performances.every((performance) => performance
                        && typeof performance.name === 'string'
                        && Number.isInteger(performance.goals)
                        && performance.goals >= 0
                        && Number.isInteger(performance.assists)
                        && performance.assists >= 0
                        && Number.isFinite(performance.rating)
                        && performance.rating >= 0
                        && performance.rating <= 10
                        && typeof performance.played === 'boolean');
                if (!valid) invalid.push('resultados');
                return valid;
            })
            : [];
        const barbecues = Array.isArray(parsed.barbecues)
            ? parsed.barbecues.filter((event) => {
                const valid = event
                    && typeof event.id === 'string'
                    && isValidDateString(event.date)
                    && typeof event.location === 'string'
                    && Number.isInteger(event.amountCents)
                    && event.amountCents > 0
                    && Array.isArray(event.attendees)
                    && event.attendees.length > 0
                    && event.attendees.every((attendee) => typeof attendee === 'string');
                if (!valid) invalid.push('churrascos');
                return valid;
            })
            : [];

        state = { players, matches, barbecues };
        if (invalid.length) {
            setWarning('Alguns registros salvos eram inválidos e não foram carregados.');
        }
    } catch (error) {
        console.error('Não foi possível carregar os dados da resenha.', error);
        setWarning('Não foi possível ler os dados salvos neste navegador.');
    }
}

function saveState(nextState) {
    try {
        localStorage.setItem(STORAGE_KEY, JSON.stringify(nextState));
        state = nextState;
        setWarning('');
        return true;
    } catch (error) {
        console.error('Não foi possível salvar os dados da resenha.', error);
        setWarning('Não foi possível salvar neste navegador. Confira o espaço disponível e as permissões de armazenamento.');
        return false;
    }
}

function createId() {
    return globalThis.crypto && typeof globalThis.crypto.randomUUID === 'function'
        ? globalThis.crypto.randomUUID()
        : `${Date.now()}-${Math.random().toString(36).slice(2)}`;
}

function formatDate(dateString, options = { day: 'numeric', month: 'long', year: 'numeric' }) {
    return new Date(`${dateString}T12:00:00`).toLocaleDateString('pt-BR', options);
}

function selectedRound() {
    return elements.seletorRodada.value;
}

function matchesForSelectedRound() {
    const round = selectedRound();
    return state.matches
        .filter((match) => round === 'all' || String(match.round) === round)
        .sort((left, right) => right.date.localeCompare(left.date));
}

function updateRoundSelector() {
    const selected = selectedRound();
    const rounds = [...new Set(state.matches.map((match) => match.round))]
        .sort((left, right) => right - left);
    const options = [new Option('Todas as rodadas', 'all'), ...rounds.map(
        (round) => new Option(`Rodada ${round}`, String(round))
    )];
    elements.seletorRodada.replaceChildren(...options);
    elements.seletorRodada.value = rounds.some((round) => String(round) === selected) ? selected : 'all';
}

function makeMatchCard(match) {
    const card = document.createElement('article');
    card.className = 'cartao-baba';

    const details = document.createElement('div');
    details.className = 'dados-baba';
    const meta = document.createElement('div');
    meta.className = 'meta-baba';
    const round = document.createElement('span');
    round.className = 'numero-rodada';
    round.textContent = `RODADA ${match.round}`;
    const date = document.createElement('span');
    date.textContent = formatDate(match.date, { day: 'numeric', month: 'short', year: 'numeric' });
    const removeButton = document.createElement('button');
    removeButton.className = 'botao-remover';
    removeButton.type = 'button';
    removeButton.dataset.matchId = match.id;
    removeButton.textContent = 'Remover';
    removeButton.setAttribute('aria-label', `Remover o baba da rodada ${match.round}, ${formatDate(match.date)}`);
    meta.append(round, date, removeButton);

    const title = document.createElement('h3');
    title.textContent = match.location;
    details.append(meta, title);

    const score = document.createElement('div');
    score.className = 'placar-baba';
    const [home, away] = match.score.split(/\s*[xX:]\s*/);
    const homeScore = document.createElement('span');
    homeScore.textContent = home;
    const separator = document.createElement('span');
    separator.textContent = '×';
    separator.setAttribute('aria-label', 'a');
    const awayScore = document.createElement('span');
    awayScore.textContent = away;
    score.append(homeScore, separator, awayScore);

    const stats = document.createElement('div');
    stats.className = 'detalhe-estatisticas';
    const summary = match.performances
        .filter((performance) => performance.played)
            .map((performance) => {
                const goalsLabel = performance.goals === 1 ? 'gol' : 'gols';
                const assistsLabel = performance.assists === 1 ? 'assistência' : 'assistências';
                return `${performance.name}: ${performance.goals} ${goalsLabel} · ${performance.assists} ${assistsLabel} · nota ${performance.rating.toFixed(1)}`;
            })
        .join('  |  ');
    stats.textContent = summary || 'Nenhuma estatística individual registrada.';
    card.append(details, score, stats);
    return card;
}

function renderMatches() {
    const matches = matchesForSelectedRound();
    const visibleMatches = selectedRound() === 'all' ? matches.slice(0, ROUND_MATCH_LIMIT) : matches;
    elements.listaBabas.replaceChildren(...visibleMatches.map(makeMatchCard));
    elements.vazioBabas.hidden = matches.length > 0;
    elements.quantidadeRodadas.textContent = `${matches.length} ${matches.length === 1 ? 'jogo' : 'jogos'}`;

    if (!matches.length) {
        elements.textoResumoRodada.textContent = 'Registre os resultados para começar o histórico do baba.';
    } else if (selectedRound() === 'all') {
        elements.textoResumoRodada.textContent = `Histórico completo: ${matches.length} ${matches.length === 1 ? 'jogo registrado' : 'jogos registrados'}.`;
    } else {
        elements.textoResumoRodada.textContent = `Resultados da rodada ${selectedRound()}, do mais recente ao mais antigo.`;
    }
}

function makePerformanceRow(player) {
    const row = document.createElement('div');
    row.className = 'linha-desempenho';

    const nameLabel = document.createElement('label');
    nameLabel.className = 'nome-desempenho';
    const played = document.createElement('input');
    played.type = 'checkbox';
    played.name = 'played';
    played.value = player.id;
    played.defaultChecked = true;
    played.checked = true;
    const playerName = document.createElement('span');
    playerName.textContent = player.name;
    nameLabel.append(played, playerName);

    const goals = makeStatisticInput('Gols', 'goals', '0');
    const assists = makeStatisticInput('Assist.', 'assists', '0');
    const rating = makeStatisticInput('Nota', 'rating', '7.0', '0', '10', '0.1');
    row.append(nameLabel, goals, assists, rating);
    return row;
}

function makeStatisticInput(labelText, name, value, min = '0', max = '99', step = '1') {
    const label = document.createElement('label');
    label.className = 'campo-estatistica';
    label.append(document.createTextNode(labelText));
    const input = document.createElement('input');
    input.type = 'number';
    input.name = name;
    input.min = min;
    input.max = max;
    input.step = step;
    input.defaultValue = value;
    input.value = value;
    input.required = true;
    label.append(input);
    return label;
}

function renderPerformanceForm() {
    const hasPlayers = state.players.length > 0;
    elements.gradeDesempenho.replaceChildren(...state.players
        .slice()
        .sort((left, right) => left.name.localeCompare(right.name, 'pt-BR'))
        .map(makePerformanceRow));
    elements.semJogadores.hidden = hasPlayers;
    elements.gradeDesempenho.hidden = !hasPlayers;
    elements.formularioBaba.querySelector('#botao-salvar-baba').disabled = !hasPlayers;
}

function makeAnniversaryCard(player) {
    const card = document.createElement('article');
    card.className = 'cartao-aniversariante';
    const icon = document.createElement('span');
    icon.className = 'icone-aniversario';
    icon.setAttribute('aria-hidden', 'true');
    icon.textContent = '🎂';
    const details = document.createElement('div');
    details.className = 'dados-aniversariante';
    const name = document.createElement('strong');
    name.textContent = player.name;
    const birthday = document.createElement('span');
    const day = Number(player.birthday.slice(8, 10));
    birthday.textContent = `${day} ${formatDate(player.birthday, { month: 'long' })}`;
    details.append(name, birthday);
    card.append(icon, details);
    return card;
}

function renderBirthdays() {
    const now = new Date();
    const currentMonth = String(now.getMonth() + 1).padStart(2, '0');
    const birthdays = state.players
        .filter((player) => player.birthday && player.birthday.slice(5, 7) === currentMonth)
        .sort((left, right) => left.birthday.slice(8, 10).localeCompare(right.birthday.slice(8, 10)));
    elements.mesAniversarios.textContent = now.toLocaleDateString('pt-BR', { month: 'long' });
    elements.listaAniversariantes.replaceChildren(...birthdays.map(makeAnniversaryCard));
    elements.vazioAniversariantes.hidden = birthdays.length > 0;
}

function performanceRanking(matches, metric) {
    const players = new Map();
    matches.forEach((match) => {
        match.performances.filter((performance) => performance.played).forEach((performance) => {
            const current = players.get(normalizeName(performance.name)) || {
                name: performance.name,
                goals: 0,
                assists: 0,
                ratingTotal: 0,
                appearances: 0
            };
            current.goals += performance.goals;
            current.assists += performance.assists;
            current.ratingTotal += performance.rating;
            current.appearances += 1;
            players.set(normalizeName(performance.name), current);
        });
    });

    return [...players.values()].map((player) => ({
        ...player,
        averageRating: player.ratingTotal / player.appearances
    })).sort((left, right) => {
        const leftValue = metric === 'rating' ? left.averageRating : left[metric];
        const rightValue = metric === 'rating' ? right.averageRating : right[metric];
        return rightValue - leftValue || left.name.localeCompare(right.name, 'pt-BR');
    });
}

function makeRankingRow(player, index, metric) {
    const row = document.createElement('div');
    row.className = 'linha-ranking';
    const position = document.createElement('span');
    position.className = 'posicao-ranking';
    position.textContent = String(index + 1).padStart(2, '0');
    const name = document.createElement('span');
    name.className = 'nome-ranking';
    name.textContent = player.name;
    const value = document.createElement('span');
    value.className = 'valor-ranking';

    if (metric === 'rating') {
        value.textContent = player.averageRating.toFixed(1);
        const appearances = document.createElement('span');
        appearances.className = 'estatistica-ranking';
        appearances.textContent = `${player.appearances} ${player.appearances === 1 ? 'jogo' : 'jogos'}`;
        value.append(appearances);
    } else {
        const count = player[metric];
        const unit = metric === 'goals'
            ? count === 1 ? 'gol' : 'gols'
            : count === 1 ? 'assistência' : 'assistências';
        value.textContent = `${count} ${unit}`;
    }

    row.append(position, name, value);
    return row;
}

function updateRankingTabs() {
    elements.abasRanking.forEach((tab) => {
        const active = tab.dataset.ranking === activeRanking;
        tab.classList.toggle('ativa', active);
        tab.setAttribute('aria-selected', String(active));
        tab.tabIndex = active ? 0 : -1;
    });

    const activeTab = elements.abasRanking.find((tab) => tab.dataset.ranking === activeRanking);
    if (activeTab) elements.conteudoRanking.setAttribute('aria-labelledby', activeTab.id);

    const metric = activeRanking === 'goals' ? 'goals' : activeRanking === 'assists' ? 'assists' : 'rating';
    const matches = matchesForSelectedRound();
    const ranking = performanceRanking(matches, metric);
    const hasStatistics = ranking.some((player) => metric === 'goals'
        ? player.goals > 0
        : metric === 'assists' ? player.assists > 0 : player.appearances > 0);
    const filteredRanking = ranking.filter((player) => metric === 'rating'
        || player[metric] > 0);

    elements.listaRanking.replaceChildren(...filteredRanking.map(
        (player, index) => makeRankingRow(player, index, metric)
    ));
    elements.vazioRanking.hidden = hasStatistics;
    elements.vazioRanking.textContent = matches.length
        ? 'Ainda não há estatísticas para esta categoria nesta rodada.'
        : 'Registre os resultados dos jogos para montar o ranking.';

    elements.escopoRanking.textContent = selectedRound() === 'all'
        ? 'Todas as rodadas'
        : `Rodada ${selectedRound()}`;
}

function renderRoster() {
    const players = state.players.slice().sort((left, right) => left.name.localeCompare(right.name, 'pt-BR'));
    elements.totalCadastrados.textContent = `${players.length} ${players.length === 1 ? 'jogador' : 'jogadores'}`;
    elements.listaElenco.replaceChildren(...players.map((player) => {
        const item = document.createElement('li');
        item.className = 'jogador-elenco';

        const avatar = document.createElement('span');
        avatar.className = 'avatar-jogador';
        avatar.setAttribute('aria-hidden', 'true');
        avatar.textContent = player.name.trim().charAt(0) || '?';

        const name = document.createElement('span');
        name.className = 'nome-jogador';
        name.textContent = player.birthday
            ? `${player.name} · ${formatDate(player.birthday, { day: '2-digit', month: '2-digit' })}`
            : player.name;

        const remove = document.createElement('button');
        remove.className = 'botao-remover';
        remove.type = 'button';
        remove.dataset.playerId = player.id;
        remove.textContent = 'Remover';
        remove.setAttribute('aria-label', `Remover ${player.name} do elenco`);
        item.append(avatar, name, remove);
        return item;
    }));
    elements.vazioElenco.hidden = players.length > 0;
}

function splitCents(amountCents, attendeeCount) {
    const base = Math.floor(amountCents / attendeeCount);
    const remainder = amountCents % attendeeCount;
    return Array.from({ length: attendeeCount }, (_, index) => base + (index < remainder ? 1 : 0));
}

function formatCurrency(cents) {
    return (cents / 100).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
}

function makeBarbecueCard(event) {
    const card = document.createElement('article');
    card.className = 'cartao-churrasco';

    const header = document.createElement('div');
    header.className = 'cabecalho-churrasco';
    const title = document.createElement('div');
    title.className = 'titulo-churrasco';
    const icon = document.createElement('span');
    icon.className = 'icone-churrasco';
    icon.setAttribute('aria-hidden', 'true');
    icon.textContent = '🔥';
    const details = document.createElement('div');
    const location = document.createElement('h3');
    location.textContent = event.location;
    const date = document.createElement('p');
    date.textContent = formatDate(event.date, { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' });
    details.append(location, date);
    title.append(icon, details);

    const remove = document.createElement('button');
    remove.className = 'botao-remover-evento';
    remove.type = 'button';
    remove.dataset.barbecueId = event.id;
    remove.textContent = 'Remover evento';
    remove.setAttribute('aria-label', `Remover churrasco em ${event.location}`);
    header.append(title, remove);

    const summary = document.createElement('div');
    summary.className = 'resumo-churrasco';
    const total = document.createElement('div');
    const totalLabel = document.createElement('span');
    totalLabel.textContent = 'VALOR TOTAL';
    const totalValue = document.createElement('strong');
    totalValue.textContent = formatCurrency(event.amountCents);
    total.append(totalLabel, totalValue);

    const people = document.createElement('div');
    const peopleLabel = document.createElement('span');
    peopleLabel.textContent = 'PARTICIPANTES';
    const peopleValue = document.createElement('strong');
    peopleValue.textContent = String(event.attendees.length);
    people.append(peopleLabel, peopleValue);

    const share = document.createElement('div');
    const shareLabel = document.createElement('span');
    shareLabel.textContent = 'POR PESSOA';
    const shareValue = document.createElement('strong');
    shareValue.className = 'valor-por-pessoa';
    const shares = splitCents(event.amountCents, event.attendees.length);
    const distinctShares = [...new Set(shares)];
    shareValue.textContent = distinctShares.length === 1
        ? formatCurrency(shares[0])
        : `${formatCurrency(Math.min(...shares))}–${formatCurrency(Math.max(...shares))}`;
    share.append(shareLabel, shareValue);
    summary.append(total, people, share);

    const attendeeList = document.createElement('div');
    attendeeList.className = 'lista-convidados';
    event.attendees.forEach((attendee, index) => {
        const chip = document.createElement('span');
        chip.className = 'convidado';
        chip.textContent = `${attendee} · ${formatCurrency(shares[index])}`;
        attendeeList.append(chip);
    });
    card.append(header, summary, attendeeList);
    return card;
}

function renderBarbecues() {
    const events = state.barbecues.slice().sort((left, right) => {
        const today = localDateString();
        const leftUpcoming = left.date >= today;
        const rightUpcoming = right.date >= today;
        if (leftUpcoming !== rightUpcoming) return leftUpcoming ? -1 : 1;
        return leftUpcoming ? left.date.localeCompare(right.date) : right.date.localeCompare(left.date);
    });

    elements.listaChurrascos.replaceChildren(...events.map(makeBarbecueCard));
    elements.vazioChurrascos.hidden = events.length > 0;
    elements.quantidadeChurrascos.textContent = `${events.length} ${events.length === 1 ? 'marcado' : 'marcados'}`;
}

function render() {
    updateRoundSelector();
    renderMatches();
    renderPerformanceForm();
    renderBirthdays();
    updateRankingTabs();
    renderRoster();
    renderBarbecues();
}

elements.dataBaba.max = localDateString();
elements.dataChurrasco.min = localDateString();
loadState();
render();

elements.seletorRodada.addEventListener('change', () => {
    renderMatches();
    updateRankingTabs();
});

elements.formularioJogador.addEventListener('submit', (event) => {
    event.preventDefault();
    if (!elements.formularioJogador.reportValidity()) return;

    const name = elements.nomeJogador.value.trim().replace(/\s+/g, ' ');
    if (!name) return;
    if (state.players.some((player) => normalizeName(player.name) === normalizeName(name))) {
        elements.nomeJogador.setCustomValidity('Este jogador já está cadastrado.');
        elements.nomeJogador.reportValidity();
        return;
    }
    elements.nomeJogador.setCustomValidity('');

    const birthday = elements.nascimentoJogador.value || null;
    const player = { id: createId(), name, birthday };
    if (saveState({ ...state, players: [...state.players, player] })) {
        elements.formularioJogador.reset();
        render();
    }
});

elements.nomeJogador.addEventListener('input', () => elements.nomeJogador.setCustomValidity(''));

elements.formularioBaba.addEventListener('submit', (event) => {
    event.preventDefault();
    if (!elements.formularioBaba.reportValidity()) return;

    const round = Number(elements.numeroRodada.value);
    const date = elements.dataBaba.value;
    const location = elements.localBaba.value.trim();
    const score = elements.placarBaba.value.trim();
    const scoreMatch = score.match(/^(\d{1,2})\s*[xX:]\s*(\d{1,2})$/);
    if (!Number.isInteger(round) || round < 1 || !scoreMatch || date > localDateString() || !location) {
        if (!scoreMatch) {
            elements.placarBaba.setCustomValidity('Informe o placar no formato 3 x 2.');
            elements.placarBaba.reportValidity();
        } else if (date > localDateString()) {
            elements.dataBaba.setCustomValidity('A data do resultado não pode estar no futuro.');
            elements.dataBaba.reportValidity();
        }
        return;
    }

    const performances = [...elements.gradeDesempenho.querySelectorAll('.linha-desempenho')]
        .filter((row) => row.querySelector('input[name="played"]').checked)
        .map((row) => {
            const player = state.players.find((item) => item.id === row.querySelector('input[name="played"]').value);
            return {
                name: player.name,
                goals: Number(row.querySelector('input[name="goals"]').value),
                assists: Number(row.querySelector('input[name="assists"]').value),
                rating: Number(row.querySelector('input[name="rating"]').value),
                played: true
            };
        });

    const match = {
        id: createId(),
        round,
        date,
        location,
        score: `${scoreMatch[1]} x ${scoreMatch[2]}`,
        performances
    };

    if (saveState({ ...state, matches: [...state.matches, match] })) {
        elements.formularioBaba.reset();
        elements.dataBaba.max = localDateString();
        render();
        elements.seletorRodada.value = String(round);
        renderMatches();
        updateRankingTabs();
    }
});

elements.placarBaba.addEventListener('input', () => elements.placarBaba.setCustomValidity(''));
elements.dataBaba.addEventListener('input', () => elements.dataBaba.setCustomValidity(''));

elements.listaBabas.addEventListener('click', (event) => {
    const button = event.target.closest('button[data-match-id]');
    if (!button) return;
    const match = state.matches.find((item) => item.id === button.dataset.matchId);
    if (!match || !window.confirm(`Remover o resultado da rodada ${match.round}?`)) return;
    if (saveState({ ...state, matches: state.matches.filter((item) => item.id !== match.id) })) {
        render();
    }
});

elements.abasRanking.forEach((tab, index) => {
    tab.addEventListener('click', () => {
        activeRanking = tab.dataset.ranking;
        updateRankingTabs();
    });

    tab.addEventListener('keydown', (event) => {
        if (!['ArrowLeft', 'ArrowRight', 'Home', 'End'].includes(event.key)) return;
        event.preventDefault();
        const nextIndex = event.key === 'Home'
            ? 0
            : event.key === 'End'
                ? elements.abasRanking.length - 1
                : (index + (event.key === 'ArrowRight' ? 1 : -1) + elements.abasRanking.length) % elements.abasRanking.length;
        const nextTab = elements.abasRanking[nextIndex];
        nextTab.focus();
        nextTab.click();
    });
});

elements.listaElenco.addEventListener('click', (event) => {
    const button = event.target.closest('button[data-player-id]');
    if (!button) return;
    const player = state.players.find((item) => item.id === button.dataset.playerId);
    if (!player || !window.confirm(`Remover ${player.name} do elenco? Os resultados já registrados serão mantidos.`)) return;
    if (saveState({ ...state, players: state.players.filter((item) => item.id !== player.id) })) {
        render();
    }
});

elements.formularioChurrasco.addEventListener('submit', (event) => {
    event.preventDefault();
    if (!elements.formularioChurrasco.reportValidity()) return;

    const date = elements.dataChurrasco.value;
    const location = elements.localChurrasco.value.trim();
    const amount = Number(elements.valorChurrasco.value);
    const amountCents = Math.round(amount * 100);
    const attendees = [...new Set(elements.convidadosChurrasco.value
        .split(/\r?\n/)
        .map((name) => name.trim().replace(/\s+/g, ' '))
        .filter(Boolean)
        .filter((name, index, names) => names.findIndex((entry) => normalizeName(entry) === normalizeName(name)) === index))];

    if (!location || !date || date < localDateString() || !Number.isFinite(amountCents) || amountCents < 1 || !attendees.length) {
        if (date && date < localDateString()) {
            elements.dataChurrasco.setCustomValidity('Escolha hoje ou uma data futura.');
            elements.dataChurrasco.reportValidity();
        } else if (!attendees.length) {
            elements.convidadosChurrasco.setCustomValidity('Informe pelo menos um participante.');
            elements.convidadosChurrasco.reportValidity();
        }
        return;
    }
    elements.dataChurrasco.setCustomValidity('');
    elements.convidadosChurrasco.setCustomValidity('');

    const barbecue = { id: createId(), date, location, amountCents, attendees };
    if (saveState({ ...state, barbecues: [...state.barbecues, barbecue] })) {
        elements.formularioChurrasco.reset();
        renderBarbecues();
    }
});

elements.dataChurrasco.addEventListener('input', () => elements.dataChurrasco.setCustomValidity(''));
elements.convidadosChurrasco.addEventListener('input', () => elements.convidadosChurrasco.setCustomValidity(''));

elements.listaChurrascos.addEventListener('click', (event) => {
    const button = event.target.closest('button[data-barbecue-id]');
    if (!button) return;
    const barbecue = state.barbecues.find((item) => item.id === button.dataset.barbecueId);
    if (!barbecue || !window.confirm(`Remover o churrasco de ${barbecue.location}?`)) return;
    if (saveState({ ...state, barbecues: state.barbecues.filter((item) => item.id !== barbecue.id) })) {
        renderBarbecues();
    }
});
