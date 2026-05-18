import { supabase } from './config.js';

// 1. VARIÁVEIS GLOBAIS NA MEMÓRIA DO APP
let produtosDoBanco = []; // Vai guardar a lista que vem do Supabase
let carrinho = [];        // Vai guardar os itens que o cliente está comprando

// 2. MAPEAMENTO DOS ELEMENTOS DO HTML
const selectProdutos = document.getElementById('produtos');
const inputQuantidade = document.getElementById('quantidade');
const botaoAdicionar = document.querySelector('.btn-adicionar');
const listaItensHtml = document.getElementById('listaItens');
const totalValorHtml = document.getElementById('totalValor');

// Certifique-se de que o seu botão de finalizar tenha a classe 'btn-finalizar' no HTML
const botaoGerarCupom = document.querySelector('.btn-finalizar'); 

// 3. FUNÇÃO PARA BUSCAR OS PRODUTOS NO SUPABASE E JOGAR NO SELECT
async function carregarProdutos() {
    const { data: produtos, error } = await supabase
        .from('produtos')
        .select('*');

    if (error) {
        console.log("Erro ao buscar produtos:", error);
    } else {
        produtosDoBanco = produtos;

        // Preenche o <select> com os produtos do banco
        produtos.forEach(produto => {
            let option = document.createElement('option');
            option.value = produto.id;
            option.textContent = `${produto.nome} - R$ ${Number(produto.preco).toFixed(2)}`;
            selectProdutos.appendChild(option);
        });
    }
}

// 4. FUNÇÃO PARA REMOVER UM ITEM DO CARRINHO
function removerItemDoCarrinho(idDoProduto) {
    carrinho = carrinho.filter(item => item.produtoId !== idDoProduto);
    atualizarInterfaceCarrinho();
}

// 5. FUNÇÃO PARA ATUALIZAR O VISUAL DO CARRINHO NA TELA
function atualizarInterfaceCarrinho() {
    listaItensHtml.innerHTML = '';
    let totalGeral = 0;

    carrinho.forEach(item => {
        const totalItem = item.precoUnitario * item.quantidade;
        totalGeral += totalItem;

        const li = document.createElement('li');
        li.className = 'item-carrinho';
        
        li.innerHTML = `
            <div style="display: flex; align-items: center; gap: 10px;">
                <button class="btn-remover" data-id="${item.produtoId}" style="background: none; border: none; color: red; cursor: pointer; font-weight: bold;">❌</button>
                <span class="item-qtd">${item.quantidade}x</span>
                <span class="item-detalhes">${item.nome}</span>
            </div>
            <span class="item-preco">R$ ${totalItem.toFixed(2)}</span>
        `;
        listaItensHtml.appendChild(li);
    });

    const botoesRemover = document.querySelectorAll('.btn-remover');
    botoesRemover.forEach(botao => {
        botao.addEventListener('click', (evento) => {
            const idParaRemover = evento.target.getAttribute('data-id');
            removerItemDoCarrinho(idParaRemover);
        });
    });

    totalValorHtml.textContent = `R$ ${totalGeral.toFixed(2)}`;
}

// 6. EVENTO DE CLIQUE DO BOTÃO "ADICIONAR ITEM"
botaoAdicionar.addEventListener('click', () => {
    const idSelecionado = selectProdutos.value;
    const qtdDigitada = parseInt(inputQuantidade.value);

    if (idSelecionado === 'selecioneProduto') {
        alert('Por favor, selecione um produto!');
        return;
    }
    if (isNaN(qtdDigitada) || qtdDigitada <= 0) {
        alert('Por favor, insira uma quantidade válida!');
        return;
    }

    const produtoEncontrado = produtosDoBanco.find(p => p.id === idSelecionado);
    const itemJaNoCarrinho = carrinho.find(item => item.produtoId === idSelecionado);

    if (itemJaNoCarrinho) {
        itemJaNoCarrinho.quantidade += qtdDigitada;
    } else {
        carrinho.push({
            produtoId: produtoEncontrado.id,
            nome: produtoEncontrado.nome,
            quantidade: qtdDigitada,
            precoUnitario: Number(produtoEncontrado.preco)
        });
    }

    atualizarInterfaceCarrinho();
    selectProdutos.value = 'selecioneProduto';
    inputQuantidade.value = 1;
});

// 7. GERAR CUPOM E SALVAR VENDA

async function gerarCupomEFinalizar() {
    if (carrinho.length === 0) {
        alert("O carrinho está vazio! Adicione itens antes de gerar o cupom.");
        return;
    }

    const numeroPedidoGerado = Math.floor(Math.random() * 900000) + 100000;

    const itensParaSalvar = carrinho.map(item => ({
        produto_id: item.produtoId,
        quantidade: item.quantidade,
        valor_unitario: item.precoUnitario,
        numero_pedido: numeroPedidoGerado
    }));

    const { error: erroVenda } = await supabase
        .from('vendas')
        .insert(itensParaSalvar);

    if (erroVenda) {
        alert("Erro ao salvar a venda no banco de dados.");
        console.error(erroVenda);
        return;
    }

    // Monta o cupom
    const dataAtual = new Date().toLocaleString('pt-BR');
    let totalVenda = 0;
    let itensCupom = '';

    carrinho.forEach(item => {
        const subtotal = item.precoUnitario * item.quantidade;
        totalVenda += subtotal;

        const textoItem = `${item.quantidade}x ${item.nome}`;
        const textoPreco = `R$ ${subtotal.toFixed(2)}`;
        const espacosNoMeio = 32 - (textoItem.length + textoPreco.length);
        const linhaFormatada = textoItem + ' '.repeat(Math.max(1, espacosNoMeio)) + textoPreco;

        itensCupom += `${linhaFormatada}\n`;
    });

    const textoDoCupom =
`--------------------------------
        CUPOM NAO FISCAL
--------------------------------
Data/Hora: ${dataAtual}
Pedido N: ${numeroPedidoGerado}
--------------------------------
ITENS:
${itensCupom}
--------------------------------
TOTAL GERAL:      R$ ${totalVenda.toFixed(2)}
--------------------------------
OBRIGADO PELA PREFERENCIA!
--------------------------------`;

    const ehCelular = /Android|iPhone|iPad/i.test(navigator.userAgent);

    if (ehCelular) {
        const codificado = encodeURIComponent(textoDoCupom);
        window.location.href = `rawbt://${codificado}`;

    } else {
        // ✅ USA innerHTML numa div oculta + window.print() direto, sem popup
        const divImpressao = document.createElement('div');
        divImpressao.id = 'area-impressao';
        divImpressao.innerHTML = `<pre style="font-family: monospace; font-size: 14px;">${textoDoCupom}</pre>`;
        document.body.appendChild(divImpressao);

        // Adiciona estilo para esconder tudo exceto o cupom na hora de imprimir
        const estilo = document.createElement('style');
        estilo.id = 'estilo-impressao';
        estilo.innerHTML = `
            @media print {
                body > *:not(#area-impressao) { display: none !important; }
                #area-impressao { display: block !important; }
            }
            #area-impressao { display: none; }
        `;
        document.body.appendChild(estilo);

        window.print();

        // Remove os elementos após imprimir
        document.body.removeChild(divImpressao);
        document.body.removeChild(estilo);
    }

    // Limpa o carrinho DEPOIS de tudo
    carrinho = [];
    atualizarInterfaceCarrinho();
    alert("Venda finalizada e salva!");
}

if (botaoGerarCupom) {
    botaoGerarCupom.addEventListener('click', gerarCupomEFinalizar);
}

carregarProdutos();
