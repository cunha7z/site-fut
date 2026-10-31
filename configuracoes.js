'use strict';

const SETTINGS_KEY = 'fut-duros-configuracoes-v1';
const RESENHA_KEY = 'fut-duros-resenha-v1';
const UPCOMING_MATCH_KEY = 'fut-duros-proxima-pelada-v1';
const SENT_NOTIFICATIONS_KEY = 'fut-duros-notificacoes-enviadas-v1';
const DEFAULT_SETTINGS = {
    players: [],
    notifications: { newMatch: true, reminder: true },
    schedule: { day: 'domingo', time: '09:00', location: '' }
};

const elements = {
    aviso: document.querySelector('#aviso-aplicacao'),
    totalJogadores: document.querySelector('#total-jogadores'),
    formularioJogador: document.querySelector('#formulario-jogador'),
    nomeJogador: document.querySelector('#nome-jogador'),
    apelidoJogador: document.querySelector('#apelido-jogador'),
    listaJogadores: document.querySelector('#lista-jogadores'),
    elencoVazio: document.querySelector('#elenco-vazio'),
    formularioNotificacoes: document.querySelector('#formulario-notificacoes'),
    notificarNovoJogo: document.querySelector('#notificar-novo-jogo'),
    notificarLembrete: document.querySelector('#notificar-lembrete'),
    botaoPermissaoNotificacao: document.querySelector('#botao-permissao-notificacao'),
    statusPermissaoNotificacao: document.querySelector('#status-permissao-notificacao'),
    resumoNotificacoes: document.querySelector('#resumo-notificacoes'),
    formularioAgenda: document.querySelector('#formulario-agenda'),
    diaBaba: document.querySelector('#dia-baba'),
    horarioBaba: document.querySelector('#horario-baba'),
    localBaba: document.querySelector('#local-baba'),
    quantidadeTimes: document.querySelector('#quantidade-times'),
    botaoSortear: document.querySelector('#botao-sortear'),
    resultadoSorteio: document.querySelector('#resultado-sorteio')
};

let state = { ...DEFAULT_SETTINGS, players: [], notifications: { ...DEFAULT_SETTINGS.notifications }, schedule: { ...DEFAULT_SETTINGS.schedule } };

function freshDefaults(players = []) {
    return {
        players,
        notifications: { ...DEFAULT_SETTINGS.notifications },
        schedule: { ...DEFAULT_SETTINGS.schedule }
    };
}

function createId() {
    return globalThis.crypto && typeof globalThis.crypto.randomUUID === 'function'
        ? globalThis.crypto.randomUUID()
        : `${Date.now()}-${Math.random().toString(36).slice(2)}`;
}

function normalizeName(name) {
    return name.trim().replace(/\s+/g, ' ').toLocaleLowerCase('pt-BR');
}

function showMessage(message, isError = false) {
    elements.aviso.textContent = message;
    elements.aviso.classList.toggle('erro', isError);
}

function readResenhaRoster() {
    try {
        const saved = localStorage.getItem(RESENHA_KEY);
        if (!saved) return [];
        const parsed = JSON.parse(saved);
        if (!parsed || typeof parsed !== 'object' || Array.isArray(parsed)) {
            throw new Error('Os dados da Resenha não estão no formato esperado.');
        }
        if (!Array.isArray(parsed.players)) return [];
        return parsed.players.filter((player) => player
            && typeof player.id === 'string'
            && typeof player.name === 'string'
            && player.name.trim());
    } catch (error) {
        console.error('Não foi possível carregar o elenco da Resenha.', error);
        showMessage('Não foi possível ler o elenco salvo na página Resenha.', true);
        return [];
    }
}

function readSettings() {
    try {
        const saved = localStorage.getItem(SETTINGS_KEY);
        const parsed = saved ? JSON.parse(saved) : {};
        if (!parsed || typeof parsed !== 'object' || Array.isArray(parsed)) {
            throw new Error('As configurações salvas não estão no formato esperado.');
        }

        const savedPlayers = Array.isArray(parsed.players) ? parsed.players : [];
        const playerProfiles = new Map(savedPlayers
            .filter((player) => player && typeof player.id === 'string')
            .map((player) => [player.id, player]));
        const notifications = parsed.notifications && typeof parsed.notifications === 'object'
            ? parsed.notifications
            : {};
        const schedule = parsed.schedule && typeof parsed.schedule === 'object'
            ? parsed.schedule
            : {};

        const roster = readResenhaRoster();
        return {
            players: roster.map((player) => {
                const profile = playerProfiles.get(player.id) || {};
                return {
                    id: player.id,
                    name: player.name.trim().replace(/\s+/g, ' '),
                    nickname: typeof profile.nickname === 'string' ? profile.nickname : '',
                    status: ['available', 'absent', 'injured'].includes(profile.status) ? profile.status : 'available',
                    position: ['goalkeeper', 'defense', 'midfield', 'attack', 'any'].includes(profile.position) ? profile.position : 'any',
                    rating: Number.isFinite(profile.rating) && profile.rating >= 0 && profile.rating <= 10
                        ? profile.rating
                        : 7
                };
            }),
            notifications: {
                newMatch: notifications.newMatch !== false,
                reminder: notifications.reminder !== false
            },
            schedule: {
                day: ['domingo', 'segunda', 'terca', 'quarta', 'quinta', 'sexta', 'sabado'].includes(schedule.day)
                    ? schedule.day
                    : 'domingo',
                time: typeof schedule.time === 'string' && /^\d{2}:\d{2}$/.test(schedule.time)
                    ? schedule.time
                    : '09:00',
                location: typeof schedule.location === 'string' ? schedule.location : ''
            }
        };
    } catch (error) {
        console.error('Não foi possível carregar as configurações.', error);
        showMessage('Não foi possível ler as configurações salvas neste navegador.', true);
        return freshDefaults(readResenhaRoster().map((player) => ({
            id: player.id,
            name: player.name.trim().replace(/\s+/g, ' '),
            nickname: '',
            status: 'available',
            position: 'any',
            rating: 7
        })));
    }
}

function saveSettings(message = 'Alterações salvas neste navegador.') {
    try {
        localStorage.setItem(SETTINGS_KEY, JSON.stringify(state));
        showMessage(message);
        return true;
    } catch (error) {
        console.error('Não foi possível salvar as configurações.', error);
        showMessage('Não foi possível salvar neste navegador. Confira o espaço disponível e as permissões de armazenamento.', true);
        return false;
    }
}

function saveRoster(players) {
    try {
        const saved = localStorage.getItem(RESENHA_KEY);
        const parsed = saved ? JSON.parse(saved) : {};
        if (!parsed || typeof parsed !== 'object' || Array.isArray(parsed)) {
            throw new Error('Os dados da Resenha não estão no formato esperado.');
        }
        localStorage.setItem(RESENHA_KEY, JSON.stringify({ ...parsed, players }));
        return true;
    } catch (error) {
        console.error('Não foi possível atualizar o elenco compartilhado.', error);
        showMessage('Não foi possível atualizar o elenco da página Resenha.', true);
        return false;
    }
}

function makeElement(tag, className, text) {
    const element = document.createElement(tag);
    if (className) element.className = className;
    if (text !== undefined) element.textContent = text;
    return element;
}

function makeField(labelText, control, className = '') {
    const label = makeElement('label', `campo ${className}`.trim());
    label.append(makeElement('span', '', labelText), control);
    return label;
}

function makeSelect(options, value, name) {
    const select = document.createElement('select');
    select.name = name;
    options.forEach(([optionValue, label]) => select.add(new Option(label, optionValue)));
    select.value = value;
    return select;
}

function makePlayerCard(player) {
    const card = makeElement('article', 'cartao jogador-cartao');
    const header = makeElement('div', 'jogador-cabecalho');
    const avatar = makeElement('span', 'jogador-avatar', (player.nickname || player.name).trim().charAt(0).toLocaleUpperCase('pt-BR'));
    avatar.setAttribute('aria-hidden', 'true');
    const identity = makeElement('div', 'jogador-identidade');
    identity.append(
        makeElement('h3', '', player.nickname || player.name),
        makeElement('p', '', player.nickname ? player.name : 'Apelido ainda não definido')
    );
    const badge = makeElement('span', `etiqueta-status status-${player.status}`,
        { available: 'Disponível', absent: 'Ausente', injured: 'Lesionado' }[player.status]);
    header.append(avatar, identity, badge);

    const form = makeElement('form', 'formulario-perfil');
    form.dataset.playerId = player.id;
    const nickname = document.createElement('input');
    nickname.type = 'text';
    nickname.name = 'nickname';
    nickname.maxLength = 30;
    nickname.value = player.nickname;
    nickname.placeholder = 'Ex.: Jota';
    const status = makeSelect([
        ['available', 'Disponível'],
        ['absent', 'Ausente'],
        ['injured', 'Lesionado']
    ], player.status, 'status');
    const position = makeSelect([
        ['any', 'Qualquer posição'],
        ['goalkeeper', 'Goleiro'],
        ['defense', 'Defesa'],
        ['midfield', 'Meio-campo'],
        ['attack', 'Ataque']
    ], player.position, 'position');
    const rating = document.createElement('input');
    rating.type = 'number';
    rating.name = 'rating';
    rating.min = '0';
    rating.max = '10';
    rating.step = '0.1';
    rating.value = String(player.rating);
    rating.required = true;

    form.append(
        makeField('Apelido', nickname),
        makeField('Status', status),
        makeField('Posição', position),
        makeField('Avaliação (0 a 10)', rating)
    );
    const actions = makeElement('div', 'acoes-perfil');
    const save = makeElement('button', 'botao botao-contorno', 'Salvar jogador');
    save.type = 'submit';
    actions.append(save);
    form.append(actions);
    card.append(header, form);
    return card;
}

function renderPlayers() {
    const players = state.players.slice().sort((left, right) => {
        const leftName = left.nickname || left.name;
        const rightName = right.nickname || right.name;
        return leftName.localeCompare(rightName, 'pt-BR');
    });
    elements.listaJogadores.replaceChildren(...players.map(makePlayerCard));
    elements.elencoVazio.hidden = players.length > 0;
    elements.totalJogadores.textContent = `${players.length} ${players.length === 1 ? 'jogador' : 'jogadores'}`;
}

function renderSettings() {
    elements.notificarNovoJogo.checked = state.notifications.newMatch;
    elements.notificarLembrete.checked = state.notifications.reminder;
    elements.diaBaba.value = state.schedule.day;
    elements.horarioBaba.value = state.schedule.time;
    elements.localBaba.value = state.schedule.location;
    renderPlayers();
}

function randomIndex(max) {
    if (globalThis.crypto && typeof globalThis.crypto.getRandomValues === 'function') {
        const range = 0x100000000;
        const limit = range - (range % max);
        const sample = new Uint32Array(1);
        do {
            globalThis.crypto.getRandomValues(sample);
        } while (sample[0] >= limit);
        return sample[0] % max;
    }
    return Math.floor(Math.random() * max);
}

function shuffle(players) {
    const shuffled = players.slice();
    for (let index = shuffled.length - 1; index > 0; index -= 1) {
        const swapIndex = randomIndex(index + 1);
        [shuffled[index], shuffled[swapIndex]] = [shuffled[swapIndex], shuffled[index]];
    }
    return shuffled;
}

function makeTeamCard(players, teamNumber) {
    const card = makeElement('article', 'time-cartao');
    const header = makeElement('div', 'time-cabecalho');
    header.append(
        makeElement('h3', '', `Time ${teamNumber}`),
        makeElement('span', 'etiqueta-contagem', `${players.length} ${players.length === 1 ? 'jogador' : 'jogadores'}`)
    );
    const list = makeElement('ul', 'lista-time');
    players.forEach((player) => {
        const item = makeElement('li', 'jogador-time');
        const name = makeElement('strong', '', player.nickname || player.name);
        const position = {
            goalkeeper: 'Goleiro',
            defense: 'Defesa',
            midfield: 'Meio-campo',
            attack: 'Ataque',
            any: 'Qualquer posição'
        }[player.position];
        item.append(name, makeElement('span', '', `${position} · Nota ${Number(player.rating).toFixed(1)}`));
        list.append(item);
    });
    const average = players.length
        ? players.reduce((total, player) => total + Number(player.rating), 0) / players.length
        : 0;
    card.append(header, list, makeElement('p', 'media-time', `Média do time: ${average.toFixed(1)}`));
    return card;
}

function drawTeams() {
    const available = state.players.filter((player) => player.status === 'available');
    if (!available.length) {
        elements.resultadoSorteio.replaceChildren(makeElement(
            'p',
            'estado-vazio',
            'Não há jogadores disponíveis. Atualize o status do elenco para realizar o sorteio.'
        ));
        return;
    }

    const teamCount = Number(elements.quantidadeTimes.value);
    const teams = Array.from({ length: teamCount }, () => []);
    shuffle(available).forEach((player, index) => teams[index % teamCount].push(player));
    const result = makeElement('div', 'grade-times');
    teams.forEach((team, index) => result.append(makeTeamCard(team, index + 1)));
    elements.resultadoSorteio.replaceChildren(result);
}

function addPlayer(name, nickname) {
    const cleanName = name.trim().replace(/\s+/g, ' ');
    if (!cleanName) return;
    if (readResenhaRoster().some((player) => normalizeName(player.name) === normalizeName(cleanName))) {
        elements.nomeJogador.setCustomValidity('Este jogador já está cadastrado na Resenha.');
        elements.nomeJogador.reportValidity();
        return;
    }
    elements.nomeJogador.setCustomValidity('');
    const player = { id: createId(), name: cleanName, birthday: null };
    const roster = readResenhaRoster();
    if (!saveRoster([...roster, player])) return;
    state.players.push({
        id: player.id,
        name: player.name,
        nickname: nickname.trim().replace(/\s+/g, ' '),
        status: 'available',
        position: 'any',
        rating: 7
    });
    if (saveSettings('Jogador adicionado ao elenco compartilhado.')) {
        elements.formularioJogador.reset();
        renderPlayers();
    }
}

elements.formularioJogador.addEventListener('submit', (event) => {
    event.preventDefault();
    if (!elements.formularioJogador.reportValidity()) return;
    addPlayer(elements.nomeJogador.value, elements.apelidoJogador.value);
});

elements.nomeJogador.addEventListener('input', () => elements.nomeJogador.setCustomValidity(''));

elements.listaJogadores.addEventListener('submit', (event) => {
    const form = event.target.closest('.formulario-perfil');
    if (!form) return;
    event.preventDefault();
    if (!form.reportValidity()) return;
    const player = state.players.find((item) => item.id === form.dataset.playerId);
    if (!player) {
        showMessage('Este jogador não está mais no elenco. Recarregue a página para atualizar a lista.', true);
        return;
    }
    const rating = Number(form.elements.rating.value);
    if (!Number.isFinite(rating) || rating < 0 || rating > 10) {
        form.elements.rating.setCustomValidity('A avaliação deve estar entre 0 e 10.');
        form.elements.rating.reportValidity();
        return;
    }
    form.elements.rating.setCustomValidity('');
    player.nickname = form.elements.nickname.value.trim().replace(/\s+/g, ' ');
    player.status = form.elements.status.value;
    player.position = form.elements.position.value;
    player.rating = rating;
    if (saveSettings('Dados do jogador atualizados.')) renderPlayers();
});

elements.formularioNotificacoes.addEventListener('submit', (event) => {
    event.preventDefault();
    state.notifications = {
        newMatch: elements.notificarNovoJogo.checked,
        reminder: elements.notificarLembrete.checked
    };
    if (saveSettings('Preferências de notificação salvas.')) checkScheduledNotifications();
});

elements.botaoPermissaoNotificacao.addEventListener('click', async () => {
    if (!('Notification' in window)) {
        elements.statusPermissaoNotificacao.textContent = 'Este navegador não oferece notificações do sistema. Os avisos locais continuam disponíveis.';
        return;
    }
    try {
        const permission = await Notification.requestPermission();
        const messages = {
            granted: 'Avisos do navegador ativados. Você pode fechar esta página.',
            denied: 'A permissão foi negada. Altere essa opção nas configurações do navegador.',
            default: 'A permissão não foi concedida. Você pode tentar novamente quando quiser.'
        };
        elements.statusPermissaoNotificacao.textContent = messages[permission]
            || 'O navegador não informou o resultado da permissão.';
        if (permission === 'granted') {
            new Notification('Fut Duros e Caloteiros', {
                body: 'Avisos do navegador ativados para este dispositivo.'
            });
            checkScheduledNotifications();
        }
    } catch (error) {
        console.error('Não foi possível ativar as notificações do navegador.', error);
        elements.statusPermissaoNotificacao.textContent = 'Não foi possível ativar as notificações. Confira as permissões do navegador.';
    }
});

elements.formularioAgenda.addEventListener('submit', (event) => {
    event.preventDefault();
    if (!elements.formularioAgenda.reportValidity()) return;
    state.schedule = {
        day: elements.diaBaba.value,
        time: elements.horarioBaba.value,
        location: elements.localBaba.value.trim()
    };
    saveSettings('Local e horário salvos.');
});

elements.botaoSortear.addEventListener('click', drawTeams);

function getUpcomingMatch() {
    try {
        const saved = localStorage.getItem(UPCOMING_MATCH_KEY);
        if (!saved) return null;
        const parsed = JSON.parse(saved);
        const match = parsed && parsed.match;
        if (!match || typeof match.date !== 'string' || typeof match.time !== 'string'
            || typeof match.location !== 'string' || !/^\d{4}-\d{2}-\d{2}$/.test(match.date)
            || !/^\d{2}:\d{2}$/.test(match.time)) return null;
        const timestamp = new Date(`${match.date}T${match.time}:00`).getTime();
        if (!Number.isFinite(timestamp) || timestamp <= Date.now()) return null;
        return {
            ...match,
            timestamp,
            signature: `${match.date}|${match.time}|${match.location}`
        };
    } catch (error) {
        console.error('Não foi possível consultar a próxima pelada.', error);
        elements.resumoNotificacoes.textContent = 'Não foi possível consultar a agenda da pelada.';
        return null;
    }
}

function sendNotificationOnce(kind, signature, title, body) {
    if (!('Notification' in window) || Notification.permission !== 'granted') return;
    const notificationId = `${kind}:${signature}`;
    try {
        const sent = JSON.parse(localStorage.getItem(SENT_NOTIFICATIONS_KEY) || '[]');
        if (!Array.isArray(sent) || sent.includes(notificationId)) return;
        new Notification(title, { body });
        localStorage.setItem(SENT_NOTIFICATIONS_KEY, JSON.stringify([...sent, notificationId].slice(-30)));
    } catch (error) {
        console.error('Não foi possível enviar ou registrar a notificação.', error);
        elements.statusPermissaoNotificacao.textContent = 'Não foi possível enviar o aviso do navegador neste dispositivo.';
    }
}

function checkScheduledNotifications() {
    const match = getUpcomingMatch();
    const preferences = state.notifications;
    if (!match) {
        elements.resumoNotificacoes.textContent = preferences.newMatch || preferences.reminder
            ? 'Nenhuma pelada futura está marcada.'
            : '';
        return;
    }

    const dateTime = new Date(match.timestamp).toLocaleString('pt-BR', {
        weekday: 'long',
        day: 'numeric',
        month: 'long',
        hour: '2-digit',
        minute: '2-digit'
    });
    const untilMatch = match.timestamp - Date.now();
    const messages = [];
    if (preferences.newMatch) {
        messages.push(`Próximo baba: ${dateTime} · ${match.location}.`);
        sendNotificationOnce(
            'novo-baba',
            match.signature,
            'Novo baba marcado',
            `${dateTime} · ${match.location}`
        );
    }
    if (preferences.reminder && untilMatch <= 24 * 60 * 60 * 1000) {
        messages.push('Lembrete: o jogo começa nas próximas 24 horas.');
        sendNotificationOnce(
            'lembrete',
            match.signature,
            'O baba está chegando!',
            `${dateTime} · ${match.location}`
        );
    }
    elements.resumoNotificacoes.textContent = messages.join(' ');
}

state = readSettings();
renderSettings();
checkScheduledNotifications();
window.setInterval(checkScheduledNotifications, 60 * 1000);
window.addEventListener('storage', (event) => {
    if (event.key === RESENHA_KEY || event.key === SETTINGS_KEY) {
        state = readSettings();
        renderSettings();
    }
    if (event.key === UPCOMING_MATCH_KEY || event.key === SETTINGS_KEY) {
        checkScheduledNotifications();
    }
});