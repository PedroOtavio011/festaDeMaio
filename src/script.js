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

    // Cria o número de pedido baseado no timestamp atual (único e numérico para o 'numero_pedido')
    const numeroPedidoGerado = Math.floor(Math.random() * 900000) + 100000;

    // Formatamos o carrinho para ter exatamente as colunas da tua imagem
    const itensParaSalvar = carrinho.map(item => ({
        produto_id: item.produtoId,
        quantidade: item.quantidade,
        valor_unitario: item.precoUnitario,
        numero_pedido: numeroPedidoGerado
    }));

    // PASSO 2: Envia todos os itens de uma vez para a tabela 'vendas'
    const { error: erroVenda } = await supabase
        .from('vendas')
        .insert(itensParaSalvar);

    if (erroVenda) {
        alert("Erro ao salvar a venda no banco de dados.");
        console.error(erroVenda);
        return;
    }

    // PASSO 3: Monta o texto do cupom para a impressão
    const dataAtual = new Date().toLocaleString('pt-BR');
    let totalVenda = 0;
    let itensCupom = '';

    carrinho.forEach(item => {
        const subtotal = item.precoUnitario * item.quantidade;
        totalVenda += subtotal;
        
        // Organiza: alinhado à esquerda e o preço à direita
        const textoItem = `${item.quantidade}x ${item.nome}`;
        const textoPreco = `R$ ${subtotal.toFixed(2)}`;
        
        // Calcula o espaço que sobra no meio para somar 32 caracteres exatos
        const espacosNoMeio = 32 - (textoItem.length + textoPreco.length);
        const linhaFormatada = textoItem + ' '.repeat(Math.max(1, espacosNoMeio)) + textoPreco;
        
        itensCupom += `${linhaFormatada}\n`;
    });

    const textoDoCupom = `
    --------------------------------
            CUPOM NÃO FISCAL        
    --------------------------------
    Data/Hora: ${dataAtual}
    Pedido №:  ${numeroPedidoGerado}
    --------------------------------
    ITENS:
    ${itensCupom}
    --------------------------------
    TOTAL GERAL:        R$ ${totalVenda.toFixed(2)}
    --------------------------------
    OBRIGADO PELA PREFERENCIA!   
    --------------------------------
    \n\n\n`;
    // PASSO 4: Abre a janela de impressão
    const ehCelular = /Android|iPhone|iPad/i.test(navigator.userAgent);

    if (ehCelular) {
        // --- LÓGICA PARA CELULAR (VIA RAWBT) ---
        // Formatamos o texto para o formato que o RawBT entende
        const textoCodificado = encodeURIComponent(textoDoCupom);
        
        // Este link especial abre o RawBT e manda ele imprimir direto
        const urlRawBT = `intent:${textoCodificado}#Intent;scheme=rawbt;package=ru.a2012.rawbtprint;end;`;
        
        // Faz o celular disparar a impressão
        window.location.href = urlRawBT;
    } else {
        // --- LÓGICA PARA PC  ---
        const janelaImpressao = window.open('', '_blank', 'width=400,height=600');
        janelaImpressao.document.write(`<pre style="font-family: monospace; font-size: 14px; padding: 10px;">${textoDoCupom}</pre>`);
        janelaImpressao.document.close();
        janelaImpressao.print();
        janelaImpressao.close();
    }

    // PASSO 5: Limpa o caixa
    carrinho = [];
    atualizarInterfaceCarrinho();
    alert("Venda finalizada e salva no banco!");
}


if (botaoGerarCupom) {
    botaoGerarCupom.addEventListener('click', gerarCupomEFinalizar);
}

carregarProdutos();
