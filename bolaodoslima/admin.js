// admin.js
import { initializeApp } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-app.js";
import { getFirestore, collection, getDocs, getDoc, setDoc, updateDoc, deleteDoc, doc, query, where } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-firestore.js";
import { getAuth, signInWithEmailAndPassword, onAuthStateChanged, signOut } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-auth.js";

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

// 1. Autenticação (Mantida idêntica)
const btnLogin = document.getElementById('btn-login');
const feedbackLogin = document.getElementById('login-feedback');

onAuthStateChanged(auth, (user) => {
  if (user) {
    document.getElementById('auth-section').style.display = 'none';
    document.getElementById('admin-section').style.display = 'block';
    buscarBilhetesDoBanco();
    carregarConfiguracoes();
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
  btnLogin.innerText = "Autenticando..."; btnLogin.disabled = true; feedbackLogin.style.display = "none";
  try { await signInWithEmailAndPassword(auth, email, senha); } 
  catch (error) {
    feedbackLogin.innerText = "Credenciais incorretas."; feedbackLogin.style.display = "block";
    btnLogin.innerText = "Acessar Sistema"; btnLogin.disabled = false;
  }
});

document.getElementById('btn-logout').addEventListener('click', () => signOut(auth));

// 2. Navegação de Abas
document.getElementById('tab-pendentes').addEventListener('click', (e) => alternarAbaAdmin("pendente", e.target));
document.getElementById('tab-validados').addEventListener('click', (e) => alternarAbaAdmin("validado", e.target));
document.getElementById('tab-config').addEventListener('click', (e) => alternarAbaAdmin("config", e.target));

function alternarAbaAdmin(alvo, botaoAlvo) {
  document.querySelectorAll('.tab-btn').forEach(btn => btn.classList.remove('active'));
  botaoAlvo.classList.add('active');
  
  if(alvo === "config") {
    document.getElementById('visao-lista').style.display = 'none';
    document.getElementById('visao-config').style.display = 'block';
    document.body.classList.remove('tema-validado');
  } else {
    document.getElementById('visao-config').style.display = 'none';
    document.getElementById('visao-lista').style.display = 'block';
    filtroStatusAtivo = alvo;
    document.getElementById('input-busca').value = "";
    document.body.classList.toggle('tema-validado', alvo === "validado");
    buscarBilhetesDoBanco();
  }
}

// 3. Sistema de Busca
document.getElementById('input-busca').addEventListener('input', (e) => {
  const termo = e.target.value.toLowerCase().trim();
  document.querySelectorAll('.linha-aposta').forEach(linha => {
    linha.style.display = linha.textContent.toLowerCase().includes(termo) ? '' : 'none';
  });
});

// 4. Renderizar Tabela
async function buscarBilhetesDoBanco() {
  const container = document.getElementById('lista-bilhetes');
  container.innerHTML = `<p style="text-align: center; color: var(--text-muted); padding: 20px;">Carregando...</p>`;
  memoriaApostas = {}; 

  try {
    const q = query(collection(db, "bilhetes"), where("status", "==", filtroStatusAtivo));
    const snapshot = await getDocs(q);
    
    if(snapshot.empty) {
      container.innerHTML = `<p style="text-align: center; color: var(--text-muted); padding: 40px;">Nenhuma aposta encontrada.</p>`;
      return;
    }

    let htmlTabela = `<table class="admin-table"><thead><tr><th>ID/Apostador</th><th>MAR</th><th>HAI</th><th>ESC</th><th>Ações</th></tr></thead><tbody>`;

    snapshot.forEach((documento) => {
      const aposta = documento.data();
      memoriaApostas[documento.id] = aposta;
      const p1 = aposta.palpites[0] || {placarA: '-', placarB: '-'};
      const p2 = aposta.palpites[1] || {placarA: '-', placarB: '-'};
      const p3 = aposta.palpites[2] || {placarA: '-', placarB: '-'};

      htmlTabela += `
        <tr class="linha-aposta">
          <td><strong>${aposta.id_bilhete}</strong><br><span style="font-size:0.85rem;">${aposta.nome_apostador}</span></td>
          <td>${p1.placarA}x${p1.placarB}</td>
          <td>${p2.placarA}x${p2.placarB}</td>
          <td>${p3.placarA}x${p3.placarB}</td>
          <td class="td-acoes">
            ${aposta.status === 'pendente' 
              ? `<button class="btn-sm btn-validar" data-id="${documento.id}" data-action="validar">Aprovar</button>`
              : `<button class="btn-sm btn-desvalidar" data-id="${documento.id}" data-action="revogar">Voltar</button>`
            }
            <button class="btn-sm btn-editar" data-id="${documento.id}" data-action="editar">Editar</button>
            <button class="btn-sm btn-excluir" data-id="${documento.id}" data-action="excluir">Remover</button>
          </td>
        </tr>
      `;
    });
    htmlTabela += `</tbody></table>`;
    container.innerHTML = htmlTabela;
  } catch (error) { container.innerHTML = `<p style="color: red;">Erro: ${error.message}</p>`; }
}

// 5. Ações na Tabela
document.getElementById('lista-bilhetes').addEventListener('click', async (e) => {
  const btn = e.target.closest('.btn-sm');
  if (!btn) return;
  const idInterno = btn.getAttribute('data-id');
  const acao = btn.getAttribute('data-action');
  
  if (acao === "validar") {
    await updateDoc(doc(db, "bilhetes", idInterno), { status: "validado" });
    buscarBilhetesDoBanco();
  } else if (acao === "revogar") {
    await updateDoc(doc(db, "bilhetes", idInterno), { status: "pendente" });
    buscarBilhetesDoBanco();
  } else if (acao === "editar") {
    abrirModalEdicao(idInterno, memoriaApostas[idInterno]);
  } else if (acao === "excluir") {
    // Nova regra de exclusão com alerta de segurança
    if (confirm("Tem certeza que deseja EXCLUIR permanentemente este palpite? Essa ação não tem volta.")) {
      try {
        await deleteDoc(doc(db, "bilhetes", idInterno));
        buscarBilhetesDoBanco(); // Recarrega a tabela após apagar
      } catch (error) {
        alert("Erro ao excluir: " + error.message);
      }
    }
  }
});

// Modal e Edição de Palpites mantidos idênticos (apenas os IDs do HTML são SCO para jogo 3)
function abrirModalEdicao(idInterno, aposta) {
  document.getElementById('edit-id-banco').value = idInterno;
  document.getElementById('edit-nome').value = aposta.nome_apostador;
  document.getElementById('edit-j1-a').value = aposta.palpites[0].placarA; document.getElementById('edit-j1-b').value = aposta.palpites[0].placarB;
  document.getElementById('edit-j2-a').value = aposta.palpites[1].placarA; document.getElementById('edit-j2-b').value = aposta.palpites[1].placarB;
  document.getElementById('edit-j3-a').value = aposta.palpites[2].placarA; document.getElementById('edit-j3-b').value = aposta.palpites[2].placarB;
  document.getElementById('modal-editar').style.display = 'flex';
}
document.getElementById('btn-cancelar-edicao').addEventListener('click', () => document.getElementById('modal-editar').style.display = 'none');
document.getElementById('btn-salvar-edicao').addEventListener('click', async () => {
  const idInterno = document.getElementById('edit-id-banco').value;
  await updateDoc(doc(db, "bilhetes", idInterno), {
    nome_apostador: document.getElementById('edit-nome').value,
    palpites: [
      { jogo: "BRA x MAR", placarA: parseInt(document.getElementById('edit-j1-a').value), placarB: parseInt(document.getElementById('edit-j1-b').value) },
      { jogo: "BRA x HAI", placarA: parseInt(document.getElementById('edit-j2-a').value), placarB: parseInt(document.getElementById('edit-j2-b').value) },
      { jogo: "SCO x BRA", placarA: parseInt(document.getElementById('edit-j3-a').value), placarB: parseInt(document.getElementById('edit-j3-b').value) }
    ]
  });
  document.getElementById('modal-editar').style.display = 'none';
  buscarBilhetesDoBanco(); 
});


// ==========================================
// 6. MOTOR DE REGRAS E CÁLCULO DE PONTOS
// ==========================================

async function carregarConfiguracoes() {
  try {
    const docRef = doc(db, "configuracoes", "geral");
    const docSnap = await getDoc(docRef);
    if (docSnap.exists()) {
      const data = docSnap.data();
      document.getElementById('cfg-pts-resultado').value = data.pts_resultado || 1;
      document.getElementById('cfg-pts-exato').value = data.pts_exato || 2;
      
      document.getElementById('real-j1-a').value = data.real_j1_a !== undefined ? data.real_j1_a : "";
      document.getElementById('real-j1-b').value = data.real_j1_b !== undefined ? data.real_j1_b : "";
      document.getElementById('real-j2-a').value = data.real_j2_a !== undefined ? data.real_j2_a : "";
      document.getElementById('real-j2-b').value = data.real_j2_b !== undefined ? data.real_j2_b : "";
      document.getElementById('real-j3-a').value = data.real_j3_a !== undefined ? data.real_j3_a : "";
      document.getElementById('real-j3-b').value = data.real_j3_b !== undefined ? data.real_j3_b : "";
    }
  } catch(e) { console.warn("Documento de config não existe ainda. Usando default."); }
}

document.getElementById('btn-salvar-calcular').addEventListener('click', async () => {
  const btn = document.getElementById('btn-salvar-calcular');
  btn.innerText = "Processando..."; btn.disabled = true;

  try {
    // 1. Salvar configurações no banco
    const cfg = {
      pts_resultado: parseInt(document.getElementById('cfg-pts-resultado').value) || 0,
      pts_exato: parseInt(document.getElementById('cfg-pts-exato').value) || 0,
      real_j1_a: document.getElementById('real-j1-a').value, real_j1_b: document.getElementById('real-j1-b').value,
      real_j2_a: document.getElementById('real-j2-a').value, real_j2_b: document.getElementById('real-j2-b').value,
      real_j3_a: document.getElementById('real-j3-a').value, real_j3_b: document.getElementById('real-j3-b').value,
    };
    await setDoc(doc(db, "configuracoes", "geral"), cfg);

    // 2. Buscar bilhetes validados para calcular
    const q = query(collection(db, "bilhetes"), where("status", "==", "validado"));
    const snapshot = await getDocs(q);
    
    // Preparar dados reais reais p/ cálculo matemático
    const jogosReais = [
      { a: cfg.real_j1_a, b: cfg.real_j1_b },
      { a: cfg.real_j2_a, b: cfg.real_j2_b },
      { a: cfg.real_j3_a, b: cfg.real_j3_b }
    ];

    // Iterar bilhetes
    for (const documento of snapshot.docs) {
      const aposta = documento.data();
      let totalPontos = 0;

      aposta.palpites.forEach((palpite, idx) => {
        const real = jogosReais[idx];
        
        // Verifica se o jogo oficial já teve placar preenchido no admin
        if(real.a !== "" && real.b !== "") {
          const rA = parseInt(real.a); const rB = parseInt(real.b);
          const pA = palpite.placarA;  const pB = palpite.placarB;
          
          // Função auxiliar para definir quem ganhou ou empate (1, 0, -1)
          const mathSign = (x, y) => x > y ? 1 : x < y ? -1 : 0;
          
          const resultadoReal = mathSign(rA, rB);
          const resultadoPalpite = mathSign(pA, pB);

          if (resultadoReal === resultadoPalpite) {
            totalPontos += cfg.pts_resultado; // Acertou Resultado
          }
          if (rA === pA && rB === pB) {
            totalPontos += cfg.pts_exato; // Acertou Placar Exato (Pontos Extras)
          }
        }
      });

      // Atualiza o documento individualmente
      await updateDoc(doc(db, "bilhetes", documento.id), { pontuacao_total: totalPontos });
    }

    alert("Configurações salvas e Ranking atualizado com sucesso!");
    
  } catch (e) {
    alert("Erro ao processar cálculo: " + e.message);
  } finally {
    btn.innerText = "Salvar Regras e Recalcular Ranking Geral"; btn.disabled = false;
  }
});