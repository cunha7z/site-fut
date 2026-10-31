'use strict';

const STORAGE_KEY = 'fut-duros-proxima-pelada-v1';
const SALVADOR_COORDINATES = { latitude: -12.9714, longitude: -38.5014 };
const elements = {
    aviso: document.querySelector('#aviso-aplicacao'),
    estadoVazio: document.querySelector('#estado-vazio'),
    detalhesPelada: document.querySelector('#detalhes-pelada'),
    formularioPeladaSecao: document.querySelector('#formulario-pelada-secao'),
    formularioPelada: document.querySelector('#formulario-pelada'),
    formularioPresenca: document.querySelector('#formulario-presenca'),
    dataPelada: document.querySelector('#data-pelada'),
    horarioPelada: document.querySelector('#horario-pelada'),
    localPelada: document.querySelector('#local-pelada'),
    tituloFormularioPelada: document.querySelector('#titulo-formulario-pelada'),
    botaoSalvarPelada: document.querySelector('#botao-salvar-pelada'),
    botaoPrimeiraPelada: document.querySelector('#botao-primeira-pelada'),
    botaoEditarPelada: document.querySelector('#botao-editar-pelada'),
    botaoExcluirPelada: document.querySelector('#botao-excluir-pelada'),
    botaoCancelarFormulario: document.querySelector('#botao-cancelar-formulario'),
    diaSemana: document.querySelector('#dia-semana'),
    diaNumero: document.querySelector('#dia-numero'),
    mesAno: document.querySelector('#mes-ano'),
    dataFormatada: document.querySelector('#data-formatada'),
    horarioFormatado: document.querySelector('#horario-formatado'),
    localFormatado: document.querySelector('#local-formatado'),
    textoPrevisao: document.querySelector('#texto-previsao'),
    temperaturas: document.querySelector('#temperaturas'),
    iconePrevisao: document.querySelector('.icone-previsao'),
    previsao: document.querySelector('#previsao'),
    presencasSecao: document.querySelector('#presencas-secao'),
    confirmacaoSecao: document.querySelector('#confirmacao-secao'),
    listaPresentes: document.querySelector('#lista-presentes'),
    listaAusentes: document.querySelector('#lista-ausentes'),
    vazioPresentes: document.querySelector('#vazio-presentes'),
    vazioAusentes: document.querySelector('#vazio-ausentes'),
    quantidadePresentes: document.querySelector('#quantidade-presentes'),
    quantidadeAusentes: document.querySelector('#quantidade-ausentes'),
    totalConfirmados: document.querySelector('#total-confirmados'),
    campoMotivo: document.querySelector('#campo-motivo'),
    motivoAusencia: document.querySelector('#motivo-ausencia'),
    nomeJogador: document.querySelector('#nome-jogador'),
    mensagemStatus: document.querySelector('#mensagem-status')
};

let state = { match: null, players: [] };
let weatherController;
let weatherRequest = 0;
let editingMatch = false;

function showWarning(message) {
    elements.aviso.textContent = message;
}

function localDateString(date = new Date()) {
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const day = String(date.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
}

function loadState() {
    try {
        const saved = localStorage.getItem(STORAGE_KEY);
        if (!saved) return;

        const parsed = JSON.parse(saved);
        const validMatch = parsed && (parsed.match === null || (parsed.match
            && typeof parsed.match.date === 'string'
            && typeof parsed.match.time === 'string'
            && typeof parsed.match.location === 'string'));
        const hasPlayersArray = Boolean(parsed && Array.isArray(parsed.players));
        const validPlayers = hasPlayersArray
            ? parsed.players.filter((player) => player
                && typeof player.name === 'string'
                && (player.status === 'present' || player.status === 'absent'))
                .map((player) => ({
                    name: player.name,
                    status: player.status,
                    reason: typeof player.reason === 'string' ? player.reason : ''
                }))
            : [];

        state = {
            match: validMatch && parsed.match ? parsed.match : null,
            players: validMatch && parsed.match ? validPlayers : []
        };
        if (!validMatch || !hasPlayersArray || validPlayers.length !== parsed.players.length) {
            showWarning('Não foi possível ler todos os dados salvos; a agenda foi aberta sem informações inválidas.');
        }
    } catch (error) {
        console.error('Não foi possível carregar a agenda salva.', error);
        showWarning('Não foi possível carregar a agenda salva neste navegador. Você ainda pode usar a página, mas as alterações podem não ser salvas.');
    }
}

function saveState(nextState) {
    try {
        localStorage.setItem(STORAGE_KEY, JSON.stringify(nextState));
        state = nextState;
        showWarning('');
        return true;
    } catch (error) {
        console.error('Não foi possível salvar a agenda.', error);
        showWarning('Não foi possível salvar os dados neste navegador. Verifique o espaço disponível e as permissões de armazenamento.');
        return false;
    }
}

function normalizeName(name) {
    return name.trim().replace(/\s+/g, ' ').toLocaleLowerCase('pt-BR');
}

function formatMatchDate(dateString) {
    return new Date(`${dateString}T12:00:00`).toLocaleDateString('pt-BR', {
        weekday: 'long',
        day: 'numeric',
        month: 'long',
        year: 'numeric'
    });
}

function updateMatchDisplay() {
    const match = state.match;
    elements.estadoVazio.hidden = Boolean(match);
    elements.detalhesPelada.hidden = !match;
    elements.presencasSecao.hidden = !match;
    elements.confirmacaoSecao.hidden = !match;

    if (!match) return;

    const date = new Date(`${match.date}T12:00:00`);
    elements.diaSemana.textContent = date.toLocaleDateString('pt-BR', { weekday: 'short' }).replace('.', '');
    elements.diaNumero.textContent = date.toLocaleDateString('pt-BR', { day: '2-digit' });
    elements.mesAno.textContent = date.toLocaleDateString('pt-BR', { month: 'short', year: 'numeric' }).replace('.', '');
    elements.dataFormatada.textContent = formatMatchDate(match.date);
    elements.horarioFormatado.textContent = match.time;
    elements.localFormatado.textContent = match.location;
}

function makePlayerRow(player) {
    const item = document.createElement('li');
    item.className = 'jogador';

    const avatar = document.createElement('span');
    avatar.className = 'avatar-jogador';
    avatar.setAttribute('aria-hidden', 'true');
    avatar.textContent = player.name.trim().charAt(0) || '?';

    const details = document.createElement('div');
    details.className = 'dados-jogador';
    const name = document.createElement('span');
    name.className = 'nome-jogador';
    name.textContent = player.name;
    details.append(name);

    if (player.status === 'absent' && player.reason) {
        const reason = document.createElement('p');
        reason.className = 'motivo-jogador';
        reason.textContent = `Motivo: ${player.reason}`;
        details.append(reason);
    }

    const removeButton = document.createElement('button');
    removeButton.className = 'botao-remover';
    removeButton.type = 'button';
    removeButton.textContent = 'Remover';
    removeButton.setAttribute('aria-label', `Remover resposta de ${player.name}`);
    removeButton.dataset.playerName = player.name;

    item.append(avatar, details, removeButton);
    return item;
}

function renderPlayers() {
    const present = state.players.filter((player) => player.status === 'present');
    const absent = state.players.filter((player) => player.status === 'absent');

    elements.listaPresentes.replaceChildren(...present.map(makePlayerRow));
    elements.listaAusentes.replaceChildren(...absent.map(makePlayerRow));
    elements.quantidadePresentes.textContent = String(present.length);
    elements.quantidadeAusentes.textContent = String(absent.length);
    elements.totalConfirmados.textContent = `${present.length} ${present.length === 1 ? 'confirmado' : 'confirmados'}`;
    elements.vazioPresentes.hidden = present.length > 0;
    elements.vazioAusentes.hidden = absent.length > 0;
}

function weatherDescription(code) {
    const conditions = {
        0: ['Céu limpo', '☀'],
        1: ['Predominantemente limpo', '🌤'],
        2: ['Parcialmente nublado', '⛅'],
        3: ['Nublado', '☁'],
        45: ['Neblina', '🌫'],
        48: ['Neblina com geada', '🌫'],
        51: ['Garoa leve', '🌦'],
        53: ['Garoa moderada', '🌦'],
        55: ['Garoa intensa', '🌧'],
        56: ['Garoa congelante leve', '🌧'],
        57: ['Garoa congelante intensa', '🌧'],
        61: ['Chuva leve', '🌧'],
        63: ['Chuva moderada', '🌧'],
        65: ['Chuva intensa', '🌧'],
        66: ['Chuva congelante leve', '🌧'],
        67: ['Chuva congelante intensa', '🌧'],
        71: ['Neve leve', '❄'],
        73: ['Neve moderada', '❄'],
        75: ['Neve intensa', '❄'],
        77: ['Grãos de neve', '❄'],
        80: ['Pancadas de chuva leves', '🌦'],
        81: ['Pancadas de chuva moderadas', '🌧'],
        82: ['Pancadas de chuva fortes', '⛈'],
        85: ['Pancadas de neve leves', '❄'],
        86: ['Pancadas de neve fortes', '❄'],
        95: ['Trovoadas', '⛈'],
        96: ['Trovoadas com granizo leve', '⛈'],
        99: ['Trovoadas com granizo forte', '⛈']
    };
    return conditions[code] || ['Condição não identificada', '☁'];
}

function setWeatherMessage(message, icon = '☁', temperatures = '') {
    elements.textoPrevisao.textContent = message;
    elements.iconePrevisao.textContent = icon;
    elements.temperaturas.textContent = temperatures;
}

async function updateWeather(date) {
    weatherRequest += 1;
    const requestId = weatherRequest;
    if (weatherController) weatherController.abort();

    const daysAhead = Math.floor(
        (new Date(`${date}T12:00:00`).getTime() - new Date(`${localDateString()}T12:00:00`).getTime()) / 86400000
    );
    if (daysAhead < 0 || daysAhead > 15) {
        setWeatherMessage('A previsão fica disponível para datas de hoje até 16 dias à frente.');
        return;
    }

    weatherController = new AbortController();
    setWeatherMessage('Buscando previsão para o dia do jogo...', '◷');

    const query = new URLSearchParams({
        latitude: String(SALVADOR_COORDINATES.latitude),
        longitude: String(SALVADOR_COORDINATES.longitude),
        daily: 'weather_code,temperature_2m_max,temperature_2m_min,precipitation_probability_max',
        timezone: 'America/Sao_Paulo',
        start_date: date,
        end_date: date
    });

    try {
        const response = await fetch(`https://api.open-meteo.com/v1/forecast?${query}`, {
            signal: weatherController.signal
        });
        if (!response.ok) {
            throw new Error(`O serviço de previsão respondeu com status ${response.status}.`);
        }

        const forecast = await response.json();
        const daily = forecast.daily;
        if (!daily || !daily.time || daily.time[0] !== date || !Number.isFinite(daily.weather_code[0])) {
            throw new Error('O serviço não retornou uma previsão válida para a data selecionada.');
        }
        if (requestId !== weatherRequest) return;

        const [description, icon] = weatherDescription(daily.weather_code[0]);
        const rain = daily.precipitation_probability_max[0];
        const rainText = Number.isFinite(rain) ? ` · ${rain}% de chance de chuva` : '';
        const minimum = Number.isFinite(daily.temperature_2m_min[0]) ? `${Math.round(daily.temperature_2m_min[0])}°` : '';
        const maximum = Number.isFinite(daily.temperature_2m_max[0]) ? `${Math.round(daily.temperature_2m_max[0])}°` : '';
        const temperatures = minimum && maximum ? `${minimum} / ${maximum}` : '';
        setWeatherMessage(`${description}${rainText}`, icon, temperatures);
    } catch (error) {
        if (error.name === 'AbortError') return;
        console.error('Não foi possível consultar a previsão do tempo.', error);
        if (requestId === weatherRequest) {
            setWeatherMessage('Previsão indisponível agora. Confira novamente mais tarde.');
        }
    }
}

function render() {
    updateMatchDisplay();
    renderPlayers();
    if (state.match) updateWeather(state.match.date);
}

function openMatchForm() {
    editingMatch = Boolean(state.match);
    elements.tituloFormularioPelada.textContent = editingMatch ? 'Editar pelada' : 'Marcar uma pelada';
    elements.botaoSalvarPelada.innerHTML = editingMatch ? 'Salvar alterações <span aria-hidden="true">→</span>' : 'Salvar pelada <span aria-hidden="true">→</span>';
    if (editingMatch) {
        elements.dataPelada.value = state.match.date;
        elements.horarioPelada.value = state.match.time;
        elements.localPelada.value = state.match.location;
    } else {
        elements.formularioPelada.reset();
        elements.dataPelada.min = localDateString();
    }
    elements.formularioPeladaSecao.hidden = false;
    elements.botaoPrimeiraPelada.closest('.estado-vazio').hidden = true;
    elements.formularioPeladaSecao.scrollIntoView({ behavior: 'smooth', block: 'center' });
    elements.dataPelada.focus({ preventScroll: true });
}

function closeMatchForm() {
    elements.formularioPeladaSecao.hidden = true;
    if (!state.match) elements.estadoVazio.hidden = false;
}

function setStatusMessage(message, isError = false) {
    elements.mensagemStatus.textContent = message;
    elements.mensagemStatus.classList.toggle('erro', isError);
}

function updateReasonVisibility() {
    const isAbsent = document.querySelector('input[name="status"]:checked').value === 'absent';
    elements.campoMotivo.hidden = !isAbsent;
    elements.motivoAusencia.required = isAbsent;
}

function removePlayer(name) {
    const nextState = {
        ...state,
        players: state.players.filter((player) => normalizeName(player.name) !== normalizeName(name))
    };
    if (saveState(nextState)) {
        renderPlayers();
        setStatusMessage('Resposta removida da lista.');
    }
}

elements.botaoPrimeiraPelada.addEventListener('click', openMatchForm);
elements.botaoEditarPelada.addEventListener('click', openMatchForm);
elements.botaoCancelarFormulario.addEventListener('click', closeMatchForm);

elements.formularioPelada.addEventListener('submit', (event) => {
    event.preventDefault();
    const date = elements.dataPelada.value;
    const time = elements.horarioPelada.value;
    const location = elements.localPelada.value.trim();

    if (date < localDateString()) {
        elements.dataPelada.setCustomValidity('Escolha hoje ou uma data futura.');
        elements.dataPelada.reportValidity();
        return;
    }
    elements.dataPelada.setCustomValidity('');
    if (!location) {
        elements.localPelada.setCustomValidity('Informe o local da pelada.');
        elements.localPelada.reportValidity();
        return;
    }
    elements.localPelada.setCustomValidity('');

    const nextState = {
        match: { date, time, location },
        players: state.players
    };
    if (saveState(nextState)) {
        elements.formularioPeladaSecao.hidden = true;
        elements.estadoVazio.hidden = true;
        render();
        setStatusMessage('Pelada salva! Agora é só chamar a galera.');
    }
});

elements.dataPelada.addEventListener('input', () => elements.dataPelada.setCustomValidity(''));
elements.localPelada.addEventListener('input', () => elements.localPelada.setCustomValidity(''));

elements.botaoExcluirPelada.addEventListener('click', () => {
    if (!window.confirm('Cancelar esta pelada e remover a lista de presença?')) return;
    if (saveState({ match: null, players: [] })) {
        elements.formularioPeladaSecao.hidden = true;
        setStatusMessage('');
        render();
    }
});

document.querySelectorAll('input[name="status"]').forEach((input) => {
    input.addEventListener('change', updateReasonVisibility);
});

elements.formularioPresenca.addEventListener('submit', (event) => {
    event.preventDefault();
    if (!state.match) return;

    const name = elements.nomeJogador.value.trim().replace(/\s+/g, ' ');
    const status = document.querySelector('input[name="status"]:checked').value;
    const reason = status === 'absent' ? elements.motivoAusencia.value.trim() : '';
    if (!name || (status === 'absent' && !reason)) return;

    const updatedPlayer = { name, status, reason };
    const existingIndex = state.players.findIndex((player) => normalizeName(player.name) === normalizeName(name));
    const players = [...state.players];
    if (existingIndex === -1) {
        players.push(updatedPlayer);
    } else {
        players[existingIndex] = updatedPlayer;
    }

    if (saveState({ ...state, players })) {
        renderPlayers();
        elements.formularioPresenca.reset();
        updateReasonVisibility();
        setStatusMessage(existingIndex === -1 ? 'Resposta adicionada à lista. Valeu!' : 'Sua resposta foi atualizada. Valeu!');
    } else {
        setStatusMessage('Sua resposta não foi salva. Tente novamente.', true);
    }
});

elements.listaPresentes.addEventListener('click', (event) => {
    const button = event.target.closest('.botao-remover');
    if (button) removePlayer(button.dataset.playerName);
});

elements.listaAusentes.addEventListener('click', (event) => {
    const button = event.target.closest('.botao-remover');
    if (button) removePlayer(button.dataset.playerName);
});

loadState();
updateReasonVisibility();
render();
