// admin.js
import { initializeApp } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-app.js";
import { getFirestore, collection, getDocs, updateDoc, doc, query, where, orderBy } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-firestore.js";
import { getAuth, signInWithEmailAndPassword, onAuthStateChanged, signOut } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-auth.js";

// UTILIZE EXATAMENTE A MESMA CONFIGURAÇÃO USADA NO SEU APP.JS
const firebaseConfig = {
  apiKey: "SUA_API_KEY_AQUI",
  authDomain: "seu-projeto.firebaseapp.com",
  projectId: "seu-projeto",
  storageBucket: "seu-projeto.appspot.com",
  messagingSenderId: "000000000000",
  appId: "1:00000000:web:00000000"
};

const app = initializeApp(firebaseConfig);
const db = getFirestore(app);
const auth = getAuth(app);

let filtroStatusAtivo = "pendente";

// Escuta de autenticação ativa para troca de contexto de telas
onAuthStateChanged(auth, (user) => {
  if (user) {
    document.getElementById('auth-section').style.display = 'none';
    document.getElementById('admin-section').style.display = 'block';
    buscarBilhetesDoBanco();
  } else {
    document.getElementById('auth-section').style.display = 'block';
    document.getElementById('admin-section').style.display = 'none';
  }
});

// Ação de Login
document.getElementById('btn-login').addEventListener('click', async () => {
  const email = document.getElementById('admin-email').value.trim();
  const senha = document.getElementById('admin-senha').value;
  try {
    await signInWithEmailAndPassword(auth, email, senha);
  } catch (error) {
    alert("Falha no login: Credenciais incorretas.");
  }
});

// Ação de Logoff
document.getElementById('btn-logout').addEventListener('click', () => {
  signOut(auth);
});

// Chaveador de Abas do Menu
document.getElementById('tab-pendentes').addEventListener('click', (e) => alternarFiltroAbas("pendente", e.target));
document.getElementById('tab-validados').addEventListener('click', (e) => alternarFiltroAbas("validado", e.target));

function alternarFiltroAbas(statusAlvo, botaoAlvo) {
  filtroStatusAtivo = statusAlvo;
  document.querySelectorAll('.tab-btn').forEach(btn => btn.classList.remove('active'));
  botaoAlvo.classList.add('active');
  buscarBilhetesDoBanco();
}

// Resgate Inteligente dos registros no Firestore
async function buscarBilhetesDoBanco() {
  const visual Container = document.getElementById('lista-bilhetes');
  visualContainer.innerHTML = `<p style="text-align: center; color: var(--text-muted); padding: 20px;">Atualizando lista...</p>`;

  try {
    const consultaInstrucao = query(
      collection(db, "bilhetes"),
      where("status", "==", filtroStatusAtivo),
      orderBy("timestamp", "desc")
    );
    
    const snapshotResultados = await getDocs(consultaInstrucao);
    
    if(snapshotResultados.empty) {
      visualContainer.innerHTML = `<p style="text-align: center; color: var(--text-muted); padding: 20px;">Nenhum bilhete encontrado nesta categoria.</p>`;
      return;
    }

    visualContainer.innerHTML = ""; // Esvazia o container para reconstrução

    snapshotResultados.forEach((documento) => {
      const aposta = documento.data();
      const idInternoFirebase = documento.id;

      let blocosPlacarHtml = "";
      aposta.palpites.forEach(p => {
        blocosPlacarHtml += `<div style="font-size: 0.95rem; margin-top: 4px;">⚽ ${p.jogo}: <strong style="color: #fff;">${p.placarA} x ${p.placarB}</strong></div>`;
      });

      const elementoLinha = document.createElement('div');
      elementoLinha.className = "ticket-row";
      elementoLinha.innerHTML = `
        <div class="ticket-header">
          <span>${aposta.nome_apostador}</span>
          <span class="badge ${aposta.status}">${aposta.id_bilhete}</span>
        </div>
        <div class="ticket-body" style="color: var(--text-muted);">
          ${blocosPlacarHtml}
        </div>
        <div class="btn-actions">
          ${aposta.status === 'pendente' 
            ? `<button class="btn-sm btn-validar" data-id="${idInternoFirebase}" data-action="aprovar">Validar Entrada</button>`
            : `<button class="btn-sm btn-desvalidar" data-id="${idInternoFirebase}" data-action="revogar">Revogar Entrada</button>`
          }
          <button class="btn-sm btn-editar" data-id="${idInternoFirebase}" data-nome="${aposta.nome_apostador}" data-action="corrigir">Editar</button>
        </div>
      `;
      visualContainer.appendChild(elementoLinha);
    });

    // Acoplamento de escutas de eventos nos botões injetados de forma limpa
    configurarEventosBotoesMesa();

  } catch (error) {
    console.error(error);
    visualContainer.innerHTML = `<p style="text-align: center; color: #ff5252; padding: 20px;">Erro crítico ao ler o Firestore.</p>`;
  }
}

function configurarEventosBotoesMesa() {
  document.querySelectorAll('.btn-sm').forEach(botao => {
    botao.addEventListener('click', async (e) => {
      const idDoc = e.target.getAttribute('data-id');
      const acao = e.target.getAttribute('data-action');

      if (acao === "aprovar" || acao === "revogar") {
        const novoStatus = acao === "aprovar" ? "validado" : "pendente";
        if (confirm(`Mudar status do bilhete selecionado para [${novoStatus}]?`)) {
          await updateDoc(doc(db, "bilhetes", idDoc), { status: novoStatus });
          buscarBilhetesDoBanco();
        }
      } else if (acao === "corrigir") {
        const nomeAtual = e.target.getAttribute('data-nome');
        const novoNomeInput = prompt("Altere o nome completo do participante:", nomeAtual);
        if (novoNomeInput !== null && novoNomeInput.trim() !== "") {
          await updateDoc(doc(db, "bilhetes", idDoc), { nome_apostador: novoNomeInput.trim() });
          buscarBilhetesDoBanco();
        }
      }
    });
  });
}