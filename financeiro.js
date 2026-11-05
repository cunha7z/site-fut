'use strict';

const STORAGE_KEY = 'fut-duros-mensalidades-v1';
const ADMIN_STORAGE_KEY = 'fut-duros-admin-v1';
const ADMIN_PASSWORD = 'futduros';
const PIX_KEY = '83fa8377-b601-491b-acb8-2a44ada42d9d';
const elements = {
    aviso: document.querySelector('#aviso-aplicacao'),
    mes: document.querySelector('#mes-referencia'),
    formulario: document.querySelector('#formulario-jogador'),
    nome: document.querySelector('#nome-jogador'),
    situacaoInicial: document.querySelector('#situacao-inicial'),
    botaoAdmin: document.querySelector('#botao-admin'),
    statusAdmin: document.querySelector('#status-admin'),
    listaPagos: document.querySelector('#lista-pagos'),
    listaPendentes: document.querySelector('#lista-pendentes'),
    vazioPagos: document.querySelector('#vazio-pagos'),
    vazioPendentes: document.querySelector('#vazio-pendentes'),
    quantidadePagos: document.querySelector('#quantidade-pagos'),
    quantidadePendentes: document.querySelector('#quantidade-pendentes'),
    totalJogadores: document.querySelector('#total-jogadores'),
    totalPagos: document.querySelector('#total-pagos'),
    totalPendentes: document.querySelector('#total-pendentes'),
    percentualPago: document.querySelector('#percentual-pago'),
    barraProgresso: document.querySelector('#barra-progresso'),
    botaoCopiar: document.querySelector('#botao-copiar-pix'),
    rotuloCopiar: document.querySelector('#rotulo-copiar')
};

let monthRecords = {};
let isAdmin = false;
let copyFeedbackTimeout;

function currentMonth() {
    const now = new Date();
    return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;
}

function isValidMonth(month) {
    return /^\d{4}-(0[1-9]|1[0-2])$/.test(month);
}

function normalizeName(name) {
    return name.trim().replace(/\s+/g, ' ').toLocaleLowerCase('pt-BR');
}

function setWarning(message) {
    elements.aviso.textContent = message;
}

function loadAdminState() {
    isAdmin = localStorage.getItem(ADMIN_STORAGE_KEY) === 'true';
}

function saveAdminState(nextState) {
    isAdmin = nextState;
    localStorage.setItem(ADMIN_STORAGE_KEY, String(nextState));
}

function applyAdminState() {
    const paidOption = elements.situacaoInicial.querySelector('option[value="paid"]');
    if (paidOption) {
        paidOption.disabled = !isAdmin;
    }

    if (!isAdmin && elements.situacaoInicial.value === 'paid') {
        elements.situacaoInicial.value = 'pending';
    }

    if (elements.botaoAdmin) {
        elements.botaoAdmin.textContent = isAdmin ? 'Sair do modo admin' : 'Entrar como admin';
    }

    if (elements.statusAdmin) {
        elements.statusAdmin.textContent = isAdmin ? 'Modo administrador ativo' : 'Modo visitante';
    }
}

function canManagePaidPlayers() {
    return isAdmin;
}

function loadRecords() {
    try {
        const saved = localStorage.getItem(STORAGE_KEY);
        if (!saved) return;

        const parsed = JSON.parse(saved);
        if (!parsed || typeof parsed !== 'object' || Array.isArray(parsed)) {
            throw new Error('Os dados salvos não estão no formato esperado.');
        }

        const validRecords = {};
        let invalidEntries = false;
        Object.entries(parsed).forEach(([month, records]) => {
            if (!isValidMonth(month) || !Array.isArray(records)) {
                invalidEntries = true;
                return;
            }

            validRecords[month] = records.filter((record) => {
                const valid = record
                    && typeof record.id === 'string'
                    && typeof record.name === 'string'
                    && (record.status === 'paid' || record.status === 'pending');
                if (!valid) invalidEntries = true;
                return valid;
            }).map((record) => ({
                id: record.id,
                name: record.name,
                status: record.status
            }));
        });

        monthRecords = validRecords;
        if (invalidEntries) {
            setWarning('Alguns registros salvos eram inválidos e não foram carregados.');
        }
    } catch (error) {
        console.error('Não foi possível carregar a lista financeira salva.', error);
        setWarning('Não foi possível ler os dados financeiros salvos neste navegador.');
    }
}

function saveRecords(nextRecords) {
    try {
        localStorage.setItem(STORAGE_KEY, JSON.stringify(nextRecords));
        monthRecords = nextRecords;
        setWarning('');
        return true;
    } catch (error) {
        console.error('Não foi possível salvar a lista financeira.', error);
        setWarning('Não foi possível salvar neste navegador. Confira o espaço disponível e as permissões de armazenamento.');
        return false;
    }
}

function recordsForSelectedMonth() {
    return monthRecords[elements.mes.value] || [];
}

function makePlayerRow(record) {
    const item = document.createElement('li');
    item.className = 'jogador';

    const avatar = document.createElement('span');
    avatar.className = 'avatar-jogador';
    avatar.setAttribute('aria-hidden', 'true');
    avatar.textContent = record.name.trim().charAt(0) || '?';

    const name = document.createElement('span');
    name.className = 'nome-jogador';
    name.textContent = record.name;

    const actions = document.createElement('span');
    actions.className = 'acoes-jogador';

    const statusButton = document.createElement('button');
    statusButton.className = `botao-status${record.status === 'pending' ? ' pendente' : ''}`;
    statusButton.type = 'button';
    statusButton.dataset.action = 'toggle';
    statusButton.dataset.recordId = record.id;
    statusButton.textContent = record.status === 'paid' ? 'Marcar pendente' : 'Marcar como pago';
    statusButton.setAttribute(
        'aria-label',
        record.status === 'paid'
            ? `Marcar ${record.name} como pendente`
            : `Marcar ${record.name} como pago`
    );

    const removeButton = document.createElement('button');
    removeButton.className = 'botao-remover';
    removeButton.type = 'button';
    removeButton.dataset.action = 'remove';
    removeButton.dataset.recordId = record.id;
    removeButton.textContent = 'Remover';
    removeButton.setAttribute('aria-label', `Remover ${record.name} da lista`);

    actions.append(statusButton, removeButton);
    item.append(avatar, name, actions);
    return item;
}

function render() {
    const records = recordsForSelectedMonth();
    const paid = records.filter((record) => record.status === 'paid');
    const pending = records.filter((record) => record.status === 'pending');
    const percent = records.length ? Math.round((paid.length / records.length) * 100) : 0;

    elements.listaPagos.replaceChildren(...paid.map(makePlayerRow));
    elements.listaPendentes.replaceChildren(...pending.map(makePlayerRow));
    elements.quantidadePagos.textContent = String(paid.length);
    elements.quantidadePendentes.textContent = String(pending.length);
    elements.totalJogadores.textContent = String(records.length);
    elements.totalPagos.textContent = String(paid.length);
    elements.totalPendentes.textContent = String(pending.length);
    elements.percentualPago.textContent = `${percent}%`;
    elements.barraProgresso.style.width = `${percent}%`;
    elements.vazioPagos.hidden = paid.length > 0;
    elements.vazioPendentes.hidden = pending.length > 0;
}

function addPlayer(name, status) {
    if (status === 'paid' && !canManagePaidPlayers()) {
        setWarning('Apenas o administrador pode cadastrar um jogador que já pagou a mensalidade.');
        elements.situacaoInicial.value = 'pending';
        applyAdminState();
        return;
    }

    const month = elements.mes.value;
    const currentRecords = monthRecords[month] || [];
    if (currentRecords.some((record) => normalizeName(record.name) === normalizeName(name))) {
        elements.nome.setCustomValidity('Este jogador já está cadastrado neste mês.');
        elements.nome.reportValidity();
        return;
    }
    elements.nome.setCustomValidity('');

    const nextRecords = {
        ...monthRecords,
        [month]: [
            ...currentRecords,
            {
                id: globalThis.crypto && typeof globalThis.crypto.randomUUID === 'function'
                    ? globalThis.crypto.randomUUID()
                    : `${Date.now()}-${Math.random().toString(36).slice(2)}`,
                name,
                status
            }
        ]
    };

    if (saveRecords(nextRecords)) {
        elements.formulario.reset();
        elements.situacaoInicial.value = 'pending';
        elements.nome.focus();
        render();
    }
}

function updatePlayer(recordId, action) {
    const month = elements.mes.value;
    const currentRecords = monthRecords[month] || [];
    const record = currentRecords.find((player) => player.id === recordId);
    if (!record) return;

    if (action === 'remove' && !window.confirm(`Remover ${record.name} da lista deste mês?`)) {
        return;
    }

    if (action !== 'remove') {
        const nextStatus = record.status === 'paid' ? 'pending' : 'paid';
        if (nextStatus === 'paid' && !canManagePaidPlayers()) {
            setWarning('Apenas o administrador pode marcar um jogador como pago.');
            return;
        }
    }

    const updatedRecords = action === 'remove'
        ? currentRecords.filter((player) => player.id !== recordId)
        : currentRecords.map((player) => player.id === recordId
            ? { ...player, status: player.status === 'paid' ? 'pending' : 'paid' }
            : player);

    if (saveRecords({ ...monthRecords, [month]: updatedRecords })) {
        render();
    }
}

async function copyPixKey() {
    try {
        if (navigator.clipboard && typeof navigator.clipboard.writeText === 'function') {
            await navigator.clipboard.writeText(PIX_KEY);
        } else {
            const temporaryInput = document.createElement('textarea');
            temporaryInput.value = PIX_KEY;
            temporaryInput.setAttribute('readonly', '');
            temporaryInput.style.position = 'fixed';
            temporaryInput.style.opacity = '0';
            document.body.append(temporaryInput);
            temporaryInput.select();
            const copied = document.execCommand('copy');
            temporaryInput.remove();
            if (!copied) throw new Error('O navegador não permitiu copiar a chave.');
        }

        elements.rotuloCopiar.textContent = 'Chave copiada!';
        elements.botaoCopiar.classList.add('copiado');
        elements.botaoCopiar.setAttribute('aria-label', 'Chave Pix copiada');
        window.clearTimeout(copyFeedbackTimeout);
        copyFeedbackTimeout = window.setTimeout(() => {
            elements.rotuloCopiar.textContent = 'Copiar chave';
            elements.botaoCopiar.classList.remove('copiado');
            elements.botaoCopiar.setAttribute('aria-label', 'Copiar chave Pix');
        }, 2200);
    } catch (error) {
        console.error('Não foi possível copiar a chave Pix.', error);
        setWarning('Não foi possível copiar automaticamente. Selecione e copie a chave Pix manualmente.');
    }
}

loadAdminState();
applyAdminState();
elements.mes.value = currentMonth();
loadRecords();
render();

elements.mes.addEventListener('change', () => {
    if (!isValidMonth(elements.mes.value)) {
        elements.mes.value = currentMonth();
    }
    elements.nome.setCustomValidity('');
    render();
});

elements.nome.addEventListener('input', () => elements.nome.setCustomValidity(''));

elements.botaoAdmin.addEventListener('click', () => {
    if (isAdmin) {
        saveAdminState(false);
        applyAdminState();
        setWarning('Modo visitante ativado. Apenas o administrador pode cadastrar quem já pagou.');
        return;
    }

    const senha = window.prompt('Digite a senha de administrador para liberar pagamentos confirmados:');
    if (senha === null) return;

    if (senha === ADMIN_PASSWORD) {
        saveAdminState(true);
        applyAdminState();
        setWarning('Modo administrador ativado. Agora você pode cadastrar jogadores já pagantes.');
        return;
    }

    setWarning('Senha incorreta. Somente o administrador pode adicionar quem já pagou.');
});

elements.formulario.addEventListener('submit', (event) => {
    event.preventDefault();
    if (!elements.formulario.reportValidity()) return;

    const name = elements.nome.value.trim().replace(/\s+/g, ' ');
    if (!name) {
        elements.nome.setCustomValidity('Informe o nome do jogador.');
        elements.nome.reportValidity();
        return;
    }
    addPlayer(name, elements.situacaoInicial.value);
});

function handleListClick(event) {
    const button = event.target.closest('button[data-action]');
    if (!button) return;
    updatePlayer(button.dataset.recordId, button.dataset.action);
}

elements.listaPagos.addEventListener('click', handleListClick);
elements.listaPendentes.addEventListener('click', handleListClick);
elements.botaoCopiar.addEventListener('click', copyPixKey);
