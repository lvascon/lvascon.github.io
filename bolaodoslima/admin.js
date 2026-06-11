// admin.js
import { initializeApp } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-app.js";
import { getFirestore, collection, getDocs, updateDoc, doc, query, where, orderBy } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-firestore.js";
import { getAuth, signInWithEmailAndPassword, onAuthStateChanged, signOut } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-auth.js";

// UTILIZE EXATAMENTE A MESMA CONFIGURAÇÃO USADA NO SEU APP.JS
const firebaseConfig = {
  apiKey: "AIzaSyDWwybQMZYsQCIQhG-5sFW-zWinKwQ2PDs",
  authDomain: "bolao-dos-limas.firebaseapp.com",
  projectId: "bolao-dos-limas",
  storageBucket: "bolao-dos-limas.firebasestorage.app",
  messagingSenderId: "50465541905",
  appId: "1:50465541905:web:21ce77a1f31d84438e06b0"
};

const app = initializeApp(firebaseConfig);
const db = getFirestore(app);
const auth = getAuth(app);

let filtroStatusAtivo = "pendente";
let memoriaApostas = {};

const btnLogin = document.getElementById('btn-login');
const feedbackLogin = document.getElementById('login-feedback');
const inputBusca = document.getElementById('input-busca');

// 1. Autenticação
onAuthStateChanged(auth, (user) => {
  if (user) {
    document.getElementById('auth-section').style.display = 'none';
    document.getElementById('admin-section').style.display = 'block';
    buscarBilhetesDoBanco();
  } else {
    document.getElementById('auth-section').style.display = 'block';
    document.getElementById('admin-section').style.display = 'none';
    btnLogin.innerText = "Acessar Sistema";
    btnLogin.disabled = false;
  }
});

btnLogin.addEventListener('click', async () => {
  const email = document.getElementById('admin-email').value.trim();
  const senha = document.getElementById('admin-senha').value;
  if(!email || !senha) return;
  
  btnLogin.innerText = "Autenticando...";
  btnLogin.disabled = true;
  feedbackLogin.style.display = "none";

  try { await signInWithEmailAndPassword(auth, email, senha); } 
  catch (error) {
    feedbackLogin.innerText = "Credenciais incorretas.";
    feedbackLogin.style.display = "block";
    btnLogin.innerText = "Acessar Sistema";
    btnLogin.disabled = false;
  }
});

document.getElementById('btn-logout').addEventListener('click', () => signOut(auth));

// 2. Abas e Mudança de Tema (UX)
document.getElementById('tab-pendentes').addEventListener('click', (e) => alternarFiltroAbas("pendente", e.target));
document.getElementById('tab-validados').addEventListener('click', (e) => alternarFiltroAbas("validado", e.target));

function alternarFiltroAbas(statusAlvo, botaoAlvo) {
  filtroStatusAtivo = statusAlvo;
  
  // Atualiza as abas visualmente
  document.querySelectorAll('.tab-btn').forEach(btn => btn.classList.remove('active'));
  botaoAlvo.classList.add('active');
  
  // Limpa o campo de busca ao trocar de aba
  inputBusca.value = "";
  
  // Aplica o feedback visual na página inteira (Fundo Verde para Validados)
  if (statusAlvo === "validado") {
    document.body.classList.add('tema-validado');
  } else {
    document.body.classList.remove('tema-validado');
  }

  buscarBilhetesDoBanco();
}

// 3. Sistema de Busca Inteligente (Em tempo real)
inputBusca.addEventListener('input', (e) => {
  const termo = e.target.value.toLowerCase().trim();
  const linhasTabela = document.querySelectorAll('.linha-aposta'); // Pega todas as linhas da tabela
  
  linhasTabela.forEach(linha => {
    // textContent pega tudo que está escrito na linha (Nome, ID, Gols)
    const textoLinha = linha.textContent.toLowerCase();
    if (textoLinha.includes(termo)) {
      linha.style.display = ''; // Mostra
    } else {
      linha.style.display = 'none'; // Esconde
    }
  });
});

// 4. Renderização em Tabela
async function buscarBilhetesDoBanco() {
  const container = document.getElementById('lista-bilhetes');
  container.innerHTML = `<p style="text-align: center; color: var(--text-muted); padding: 20px;">Carregando dados...</p>`;
  memoriaApostas = {}; 

  try {
    const q = query(collection(db, "bilhetes"), where("status", "==", filtroStatusAtivo));
    const snapshot = await getDocs(q);
    
    if(snapshot.empty) {
      container.innerHTML = `<p style="text-align: center; color: var(--text-muted); padding: 40px;">Nenhuma aposta ${filtroStatusAtivo} encontrada.</p>`;
      return;
    }

    let htmlTabela = `
      <table class="admin-table">
        <thead>
          <tr>
            <th>ID</th>
            <th>Apostador</th>
            <th>MAR</th>
            <th>HAI</th>
            <th>ESC</th>
            <th>Ações</th>
          </tr>
        </thead>
        <tbody>
    `;

    snapshot.forEach((documento) => {
      const aposta = documento.data();
      const idInterno = documento.id;
      memoriaApostas[idInterno] = aposta;

      const p1 = aposta.palpites[0] || {placarA: '-', placarB: '-'};
      const p2 = aposta.palpites[1] || {placarA: '-', placarB: '-'};
      const p3 = aposta.palpites[2] || {placarA: '-', placarB: '-'};

      // Adicionada a classe 'linha-aposta' para o motor de busca achar
      htmlTabela += `
        <tr class="linha-aposta">
          <td><strong>${aposta.id_bilhete || "S/ID"}</strong></td>
          <td>${aposta.nome_apostador || "Sem Nome"}</td>
          <td>${p1.placarA}x${p1.placarB}</td>
          <td>${p2.placarA}x${p2.placarB}</td>
          <td>${p3.placarA}x${p3.placarB}</td>
          <td class="td-acoes">
            ${aposta.status === 'pendente' 
              ? `<button class="btn-sm btn-validar" data-id="${idInterno}" data-action="validar">Aprovar</button>`
              : `<button class="btn-sm btn-desvalidar" data-id="${idInterno}" data-action="revogar">Voltar Pendente</button>`
            }
            <button class="btn-sm btn-editar" data-id="${idInterno}" data-action="editar">Editar</button>
            <button class="btn-sm btn-excluir" data-id="${idInterno}" data-action="excluir">Remover</button>
          </td>
        </tr>
      `;
    });

    htmlTabela += `</tbody></table>`;
    container.innerHTML = htmlTabela;

  } catch (error) {
    container.innerHTML = `<p style="text-align: center; color: #ef4444; padding: 20px;">Erro Técnico: ${error.message}</p>`;
  }
}

// 5. Ações da Tabela
document.getElementById('lista-bilhetes').addEventListener('click', async (e) => {
  const btn = e.target.closest('.btn-sm');
  if (!btn) return;

  const idInterno = btn.getAttribute('data-id');
  const acao = btn.getAttribute('data-action');
  const apostaAtual = memoriaApostas[idInterno];
  const nomeTag = apostaAtual.nome_apostador;
  const idTag = apostaAtual.id_bilhete;

  try {
    if (acao === "validar") {
      if (confirm(`Aprovar palpite de ${nomeTag} (${idTag})?`)) {
        await updateDoc(doc(db, "bilhetes", idInterno), { status: "validado" });
        buscarBilhetesDoBanco();
      }
    } 
    else if (acao === "revogar") {
      if (confirm(`Voltar palpite de ${nomeTag} (${idTag}) para PENDENTE?`)) {
        await updateDoc(doc(db, "bilhetes", idInterno), { status: "pendente" });
        buscarBilhetesDoBanco();
      }
    }
    else if (acao === "excluir") {
      if (confirm(`EXCLUIR permanentemente o palpite de ${nomeTag} (${idTag})?`)) {
        await deleteDoc(doc(db, "bilhetes", idInterno));
        buscarBilhetesDoBanco();
      }
    }
    else if (acao === "editar") {
      abrirModalEdicao(idInterno, apostaAtual);
    }
  } catch (error) {
    alert("Erro: " + error.message);
  }
});

// 6. Lógica do Modal
const modalEditar = document.getElementById('modal-editar');

function abrirModalEdicao(idInterno, aposta) {
  document.getElementById('edit-id-banco').value = idInterno;
  document.getElementById('edit-nome').value = aposta.nome_apostador;
  
  if (aposta.palpites.length === 3) {
    document.getElementById('edit-j1-a').value = aposta.palpites[0].placarA;
    document.getElementById('edit-j1-b').value = aposta.palpites[0].placarB;
    document.getElementById('edit-j2-a').value = aposta.palpites[1].placarA;
    document.getElementById('edit-j2-b').value = aposta.palpites[1].placarB;
    document.getElementById('edit-j3-a').value = aposta.palpites[2].placarA;
    document.getElementById('edit-j3-b').value = aposta.palpites[2].placarB;
  }
  modalEditar.style.display = 'flex';
}

document.getElementById('btn-cancelar-edicao').addEventListener('click', () => {
  modalEditar.style.display = 'none';
});

document.getElementById('btn-salvar-edicao').addEventListener('click', async () => {
  const idInterno = document.getElementById('edit-id-banco').value;
  const btnSalvar = document.getElementById('btn-salvar-edicao');
  
  btnSalvar.innerText = "Salvando...";
  btnSalvar.disabled = true;

  const novosDados = {
    nome_apostador: document.getElementById('edit-nome').value.trim(),
    palpites: [
      { jogo: "BRA x MAR", placarA: parseInt(document.getElementById('edit-j1-a').value), placarB: parseInt(document.getElementById('edit-j1-b').value) },
      { jogo: "BRA x HAI", placarA: parseInt(document.getElementById('edit-j2-a').value), placarB: parseInt(document.getElementById('edit-j2-b').value) },
      { jogo: "ESC x BRA", placarA: parseInt(document.getElementById('edit-j3-a').value), placarB: parseInt(document.getElementById('edit-j3-b').value) }
    ]
  };

  try {
    await updateDoc(doc(db, "bilhetes", idInterno), novosDados);
    modalEditar.style.display = 'none';
    buscarBilhetesDoBanco(); 
  } catch (error) {
    alert("Erro ao salvar: " + error.message);
  } finally {
    btnSalvar.innerText = "Salvar";
    btnSalvar.disabled = false;
  }
});