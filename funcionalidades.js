const STORAGE_KEY = 'precifica_dashboard_v2';

const defaultData = {
    custosFixos: 2800,
    diasMes: 22,
    horasDia: 6,
    margemLucro: 32,
    atual: {
        projetoTitulo: 'Website Institucional',
        clienteNome: 'Cliente Exemplo Ltda.',
        servicoDescricao: 'Desenvolvimento de website responsivo institucional com otimização de desempenho e formulário de contato.',
        etapas: [
            { id: 1, descricao: 'Planejamento e Arquitetura', horas: 3 },
            { id: 2, descricao: 'Desenvolvimento Front-end Responsivo', horas: 6 }
        ],
        custosAdicionais: 0,
        descontoPercentual: 10,
        condicaoSelecionada: 'entrada50',
        profNome: '',
        profDocTipo: 'cpf',
        profDoc: '',
        profContato: '',
        validadeDias: 15
    },
    salvos: []
};

let appData = loadAppData();

document.addEventListener('DOMContentLoaded', () => {
    if (!localStorage.getItem(STORAGE_KEY)) {
        const valorHoraInicial = calcularValorHora();
        appData.salvos.push({
            id: Date.now(),
            data: new Date().toLocaleDateString('pt-BR'),
            projetoTitulo: 'Website Institucional',
            clienteNome: 'Cliente Exemplo Ltda.',
            condicao: '50% + 50%',
            valorFinal: 9 * valorHoraInicial,
            snapshot: JSON.parse(JSON.stringify(appData.atual))
        });
        saveAppData();
    }

    bindInputs();
    syncInputsFromState();
    recalculateAll();
});

function loadAppData() {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return JSON.parse(JSON.stringify(defaultData));
    const parsed = JSON.parse(raw);
    return {
        ...defaultData,
        ...parsed,
        atual: { ...defaultData.atual, ...(parsed.atual || {}) }
    };
}

function saveAppData() {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(appData));
}

function formatBRL(val) {
    return new Intl.NumberFormat('pt-BR', {
        style: 'currency',
        currency: 'BRL'
    }).format(val || 0);
}

// NAVEGAÇÃO ENTRE TELAS DO MENU LATERAL
const viewTitles = {
    'visao-geral': { eyebrow: 'FERRAMENTA DE PRECIFICAÇÃO', title: 'Visão geral' },
    'calcular-hora': { eyebrow: 'PARÂMETROS FINANCEIROS', title: 'Calcular hora' },
    'novo-orcamento': { eyebrow: 'ELABORAÇÃO DE ORÇAMENTO', title: 'Novo orçamento' },
    'proposta': { eyebrow: 'DOCUMENTO COMERCIAL', title: 'Proposta para exportação' },
    'orcamentos-salvos': { eyebrow: 'HISTÓRICO LOCAL', title: 'Orçamentos salvos' }
};

function navigateTo(viewId) {
    document.querySelectorAll('.view').forEach(v => v.classList.remove('active'));
    document.getElementById(`view-${viewId}`).classList.add('active');

    document.querySelectorAll('.nav-item').forEach(btn => {
        btn.classList.toggle('active', btn.dataset.view === viewId);
    });

    document.getElementById('header-eyebrow').textContent = viewTitles[viewId].eyebrow;
    document.getElementById('header-title').textContent = viewTitles[viewId].title;

    document.getElementById('sidebar').classList.remove('open');
    recalculateAll();
}

function toggleMobileMenu() {
    document.getElementById('sidebar').classList.toggle('open');
}

// WIZARD INTERNO DE NOVO ORÇAMENTO
function setWizardStep(step) {
    document.querySelectorAll('.wizard-pane').forEach((p, i) => {
        p.classList.toggle('active', i + 1 === step);
    });
    document.querySelectorAll('.w-tab').forEach((t, i) => {
        t.classList.toggle('active', i + 1 === step);
    });
    recalculateAll();
}

// VINCULAÇÃO DE INPUTS
function bindInputs() {
    const rootFields = [
        ['custos-fixos', 'custosFixos'],
        ['dias-mes', 'diasMes'],
        ['horas-dia', 'horasDia'],
        ['margem-lucro', 'margemLucro']
    ];

    rootFields.forEach(([id, key]) => {
        document.getElementById(id).addEventListener('input', e => {
            appData[key] = parseFloat(e.target.value) || 0;
            saveAppData();
            recalculateAll();
        });
    });

    const atualFields = [
        ['projeto-titulo', 'projetoTitulo', 'text'],
        ['cliente-nome', 'clienteNome', 'text'],
        ['servico-descricao', 'servicoDescricao', 'text'],
        ['custos-adicionais', 'custosAdicionais', 'number'],
        ['desconto-personalizado', 'descontoPercentual', 'number'],
        ['condicao-pagamento', 'condicaoSelecionada', 'text'],
        ['prof-nome', 'profNome', 'text'],
        ['prof-contato', 'profContato', 'text'],
        ['proposta-validade', 'validadeDias', 'number']
    ];

    atualFields.forEach(([id, key, type]) => {
        const el = document.getElementById(id);
        if (!el) return;
        el.addEventListener('input', e => {
            appData.atual[key] = type === 'number' ? (parseFloat(e.target.value) || 0) : e.target.value;
            saveAppData();
            recalculateAll();
        });
    });

    // Máscara e limite estrito para CPF (11 dígitos) ou CNPJ (14 dígitos)
    document.getElementById('prof-doc').addEventListener('input', e => {
        const tipo = appData.atual.profDocTipo || 'cpf';
        const maxDigitos = tipo === 'cpf' ? 11 : 14;
        const apenasNumeros = e.target.value.replace(/\D/g, '').slice(0, maxDigitos);
        const formatado = formatarDocumento(apenasNumeros, tipo);

        e.target.value = formatado;
        appData.atual.profDoc = formatado;
        saveAppData();
        recalculateAll();
    });
}

function syncInputsFromState() {
    document.getElementById('custos-fixos').value = appData.custosFixos;
    document.getElementById('dias-mes').value = appData.diasMes;
    document.getElementById('horas-dia').value = appData.horasDia;
    document.getElementById('margem-lucro').value = appData.margemLucro;

    const a = appData.atual;
    document.getElementById('projeto-titulo').value = a.projetoTitulo;
    document.getElementById('cliente-nome').value = a.clienteNome;
    document.getElementById('servico-descricao').value = a.servicoDescricao || '';
    document.getElementById('custos-adicionais').value = a.custosAdicionais;
    document.getElementById('desconto-personalizado').value = a.descontoPercentual;
    document.getElementById('condicao-pagamento').value = a.condicaoSelecionada;
    document.getElementById('prof-nome').value = a.profNome;
    document.getElementById('prof-contato').value = a.profContato;
    document.getElementById('proposta-validade').value = a.validadeDias;
    aplicarConfigTipoDoc(a.profDocTipo || 'cpf', a.profDoc || '');
}

// CONTROLE DE CHECKBOX CPF / CNPJ
function alternarTipoDoc(tipo) {
    appData.atual.profDocTipo = tipo;
    const maxDigitos = tipo === 'cpf' ? 11 : 14;
    const apenasNumeros = (appData.atual.profDoc || '').replace(/\D/g, '').slice(0, maxDigitos);
    const formatado = formatarDocumento(apenasNumeros, tipo);

    appData.atual.profDoc = formatado;
    aplicarConfigTipoDoc(tipo, formatado);
    saveAppData();
    recalculateAll();
}

function aplicarConfigTipoDoc(tipo, valorAtual) {
    const isCpf = tipo === 'cpf';
    document.getElementById('chk-cpf').checked = isCpf;
    document.getElementById('chk-cnpj').checked = !isCpf;

    const input = document.getElementById('prof-doc');
    const label = document.getElementById('label-prof-doc');

    label.textContent = isCpf ? 'CPF (Opcional)' : 'CNPJ (Opcional)';
    input.placeholder = isCpf ? 'Ex: 000.000.000-00' : 'Ex: 00.000.000/0000-00';
    input.maxLength = isCpf ? 14 : 18;
    input.value = valorAtual;
}

function formatarDocumento(numeros, tipo) {
    if (tipo === 'cpf') {
        return numeros
            .replace(/(\d{3})(\d)/, '$1.$2')
            .replace(/(\d{3})(\d)/, '$1.$2')
            .replace(/(\d{3})(\d{1,2})$/, '$1-$2');
    }
    return numeros
        .replace(/^(\d{2})(\d)/, '$1.$2')
        .replace(/^(\d{2})\.(\d{3})(\d)/, '$1.$2.$3')
        .replace(/\.(\d{3})(\d)/, '.$1/$2')
        .replace(/(\d{4})(\d)/, '$1-$2');
}

// ETAPAS DO ORÇAMENTO
function addEtapa() {
    const descEl = document.getElementById('item-desc');
    const horasEl = document.getElementById('item-horas');
    const descricao = descEl.value.trim();
    const horas = parseFloat(horasEl.value);

    if (!descricao || isNaN(horas) || horas <= 0) {
        alert('Informe a descrição da etapa e a quantidade de horas.');
        return;
    }

    appData.atual.etapas.push({ id: Date.now(), descricao, horas });
    descEl.value = '';
    horasEl.value = '';
    saveAppData();
    recalculateAll();
}

function removeEtapa(id) {
    appData.atual.etapas = appData.atual.etapas.filter(e => e.id !== id);
    saveAppData();
    recalculateAll();
}

// CÁLCULOS CENTRAIS
function calcularValorHora() {
    const horasMes = Math.max(1, appData.diasMes * appData.horasDia);
    const custoHora = appData.custosFixos / horasMes;
    return custoHora * (1 + appData.margemLucro / 100);
}

function recalculateAll() {
    const horasMes = Math.max(1, appData.diasMes * appData.horasDia);
    const custoHora = appData.custosFixos / horasMes;
    const valorHora = calcularValorHora();

    document.getElementById('res-horas-mes').textContent = `${horasMes} horas/mês`;
    document.getElementById('res-custo-hora').textContent = formatBRL(custoHora);
    document.getElementById('res-valor-hora').textContent = formatBRL(valorHora);

    const tbody = document.getElementById('lista-etapas');
    tbody.innerHTML = '';
    let totalHoras = 0;
    let valorEtapas = 0;

    if (appData.atual.etapas.length === 0) {
        tbody.innerHTML = `<tr><td colspan="4" style="text-align:center;color:#64748b;">Nenhuma etapa adicionada.</td></tr>`;
    } else {
        appData.atual.etapas.forEach(et => {
            const sub = et.horas * valorHora;
            totalHoras += et.horas;
            valorEtapas += sub;
            tbody.innerHTML += `
                <tr>
                    <td>${et.descricao}</td>
                    <td>${et.horas}h</td>
                    <td>${formatBRL(sub)}</td>
                    <td class="text-right">
                        <button type="button" class="btn-sm btn-del" onclick="removeEtapa(${et.id})">Remover</button>
                    </td>
                </tr>
            `;
        });
    }

    const totalBase = valorEtapas + appData.atual.custosAdicionais;
    const custoOperacional = (totalHoras * custoHora) + appData.atual.custosAdicionais;

    document.getElementById('orc-total-horas').textContent = `${totalHoras}h`;
    document.getElementById('orc-valor-etapas').textContent = formatBRL(valorEtapas);
    document.getElementById('orc-total-geral').textContent = formatBRL(totalBase);

    const descPct = appData.atual.descontoPercentual;
    document.getElementById('desconto-valor-label').textContent = `${descPct}%`;

    const valorAvista = (valorEtapas * (1 - descPct / 100)) + appData.atual.custosAdicionais;
    const valorParcelado = totalBase * 1.05;

    const cenarios = [
        { id: 'avista', titulo: `À Vista (${descPct}% desc.)`, desc: 'Desconto aplicado apenas sobre as horas técnicas.', valor: valorAvista },
        { id: 'entrada50', titulo: 'Padrão (50% + 50%)', desc: 'Metade na aprovação e metade na entrega.', valor: totalBase },
        { id: 'parcelado', titulo: 'Parcelado (3x)', desc: 'Inclui acréscimo de 5% para fluxo de caixa.', valor: valorParcelado }
    ];

    const scenContainer = document.getElementById('scenarios-container');
    scenContainer.innerHTML = '';

    cenarios.forEach(c => {
        const lucro = c.valor - custoOperacional;
        const margem = c.valor > 0 ? (lucro / c.valor) * 100 : 0;
        let badge = 'margin-good';
        if (margem < 10) badge = 'margin-bad';
        else if (margem < 20) badge = 'margin-warn';

        const isSel = appData.atual.condicaoSelecionada === c.id;
        scenContainer.innerHTML += `
            <div class="scenario-card ${isSel ? 'selected' : ''}">
                <div>
                    <strong>${c.titulo}</strong>
                    <div class="scenario-price">${formatBRL(c.valor)}</div>
                    <p style="font-size:0.84rem;color:#64748b;margin-bottom:12px;">${c.desc}</p>
                </div>
                <div>
                    <span class="margin-pill ${badge}">Margem Real: ${margem.toFixed(1)}% (${formatBRL(lucro)})</span>
                    <button type="button" class="${isSel ? 'btn-primary' : 'btn-secondary'}" style="width:100%;margin-top:12px;" onclick="escolherCenario('${c.id}')">
                        ${isSel ? '✓ Selecionado' : 'Selecionar'}
                    </button>
                </div>
            </div>
        `;
    });

    atualizarProposta(valorEtapas, valorHora, totalBase, valorAvista, valorParcelado);
    atualizarDashboardEHistorico(valorHora);
}

function escolherCenario(id) {
    appData.atual.condicaoSelecionada = id;
    document.getElementById('condicao-pagamento').value = id;
    saveAppData();
    recalculateAll();
}

function atualizarProposta(valorEtapas, valorHora, totalBase, valorAvista, valorParcelado) {
    const a = appData.atual;
    const rotuloDoc = (a.profDocTipo || 'cpf').toUpperCase();

    document.getElementById('doc-projeto-titulo').textContent = a.projetoTitulo || 'Prestação de Serviços';
    document.getElementById('doc-cliente-nome').textContent = a.clienteNome || 'Cliente';
    document.getElementById('doc-servico-descricao').textContent = a.servicoDescricao || 'Prestação de serviços técnicos especializados conforme itens detalhados abaixo.';
    document.getElementById('doc-data').textContent = new Date().toLocaleDateString('pt-BR');
    document.getElementById('doc-validade').textContent = `${a.validadeDias} dias`;
    document.getElementById('doc-prof-nome').textContent = a.profNome || 'Profissional Autônomo';
    document.getElementById('doc-prof-doc').textContent = a.profDoc ? `${rotuloDoc}: ${a.profDoc}` : '';
    document.getElementById('doc-prof-contato').textContent = a.profContato || '';

    const docTbody = document.getElementById('doc-lista-etapas');
    docTbody.innerHTML = '';

    if (a.etapas.length === 0) {
        docTbody.innerHTML = `<tr><td colspan="3" style="text-align:center;color:#64748b;">Nenhum item adicionado ao orçamento.</td></tr>`;
    } else {
        a.etapas.forEach(et => {
            docTbody.innerHTML += `
                <tr>
                    <td>${et.descricao}</td>
                    <td class="text-right">${et.horas}h</td>
                    <td class="text-right">${formatBRL(et.horas * valorHora)}</td>
                </tr>
            `;
        });
    }

    let valorFinal = totalBase;
    let desconto = 0;
    let texto = '50% na aprovação e 50% na entrega final.';

    if (a.condicaoSelecionada === 'avista') {
        valorFinal = valorAvista;
        desconto = totalBase - valorAvista;
        texto = `Pagamento à vista com ${a.descontoPercentual}% de desconto sobre os serviços.`;
    } else if (a.condicaoSelecionada === 'parcelado') {
        valorFinal = valorParcelado;
        texto = `Pagamento parcelado em 3x de ${formatBRL(valorParcelado / 3)}.`;
    }

    document.getElementById('doc-condicao-texto').textContent = texto;
    document.getElementById('doc-subtotal').textContent = formatBRL(valorEtapas);
    document.getElementById('doc-adicionais').textContent = formatBRL(a.custosAdicionais);

    const linhaDesc = document.getElementById('doc-linha-desconto');
    if (desconto > 0) {
        linhaDesc.style.display = 'flex';
        document.getElementById('doc-desconto').textContent = `- ${formatBRL(desconto)}`;
    } else {
        linhaDesc.style.display = 'none';
    }

    document.getElementById('doc-total-final').textContent = formatBRL(valorFinal);
}

// HISTÓRICO E RESUMO
function salvarOrcamentoNoHistorico() {
    const valorHora = calcularValorHora();
    const valorEtapas = appData.atual.etapas.reduce((acc, e) => acc + e.horas * valorHora, 0);
    const totalBase = valorEtapas + appData.atual.custosAdicionais;
    const valorAvista = (valorEtapas * (1 - appData.atual.descontoPercentual / 100)) + appData.atual.custosAdicionais;
    const valorParcelado = totalBase * 1.05;

    let valorFinal = totalBase;
    let labelCond = '50% + 50%';
    if (appData.atual.condicaoSelecionada === 'avista') {
        valorFinal = valorAvista;
        labelCond = `À vista (-${appData.atual.descontoPercentual}%)`;
    } else if (appData.atual.condicaoSelecionada === 'parcelado') {
        valorFinal = valorParcelado;
        labelCond = 'Parcelado 3x';
    }

    appData.salvos.unshift({
        id: Date.now(),
        data: new Date().toLocaleDateString('pt-BR'),
        projetoTitulo: appData.atual.projetoTitulo || 'Orçamento sem título',
        clienteNome: appData.atual.clienteNome || 'Não informado',
        condicao: labelCond,
        valorFinal,
        snapshot: JSON.parse(JSON.stringify(appData.atual))
    });

    saveAppData();
    recalculateAll();
    alert('Orçamento salvo no histórico com sucesso!');
    navigateTo('orcamentos-salvos');
}

function carregarOrcamentoSalvo(id, destino = 'novo-orcamento') {
    const item = appData.salvos.find(s => s.id === id);
    if (!item) return;
    appData.atual = JSON.parse(JSON.stringify(item.snapshot));
    saveAppData();
    syncInputsFromState();
    navigateTo(destino);
    if (destino === 'novo-orcamento') setWizardStep(1);
}

function excluirOrcamentoSalvo(id) {
    if (!confirm('Remover este orçamento do histórico?')) return;
    appData.salvos = appData.salvos.filter(s => s.id !== id);
    saveAppData();
    recalculateAll();
}

function iniciarNovoLimpo() {
    appData.atual = {
        ...defaultData.atual,
        projetoTitulo: '',
        clienteNome: '',
        servicoDescricao: '',
        etapas: []
    };
    saveAppData();
    syncInputsFromState();
    navigateTo('novo-orcamento');
    setWizardStep(1);
}

function atualizarDashboardEHistorico(valorHora) {
    const qtd = appData.salvos.length;
    const soma = appData.salvos.reduce((acc, item) => acc + item.valorFinal, 0);

    document.getElementById('dash-qtd-orcamentos').textContent = qtd;
    document.getElementById('dash-soma-orcamentos').textContent = formatBRL(soma);
    document.getElementById('dash-valor-hora').textContent = formatBRL(valorHora);

    const tbodySalvos = document.getElementById('lista-salvos');
    tbodySalvos.innerHTML = '';

    if (qtd === 0) {
        tbodySalvos.innerHTML = `<tr><td colspan="6" style="text-align:center;color:#64748b;">Nenhum orçamento salvo ainda.</td></tr>`;
        return;
    }

    appData.salvos.forEach(item => {
        tbodySalvos.innerHTML += `
            <tr>
                <td>${item.data}</td>
                <td><strong>${item.projetoTitulo}</strong></td>
                <td>${item.clienteNome}</td>
                <td>${item.condicao}</td>
                <td><strong>${formatBRL(item.valorFinal)}</strong></td>
                <td class="text-right">
                    <button type="button" class="btn-sm btn-open" onclick="carregarOrcamentoSalvo(${item.id}, 'novo-orcamento')">Editar</button>
                    <button type="button" class="btn-sm btn-pdf-sm" onclick="carregarOrcamentoSalvo(${item.id}, 'proposta')">Proposta</button>
                    <button type="button" class="btn-sm btn-del" onclick="excluirOrcamentoSalvo(${item.id})">Excluir</button>
                </td>
            </tr>
        `;
    });
}