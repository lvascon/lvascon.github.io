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

const nomesJogosAdmin = [
  "África do Sul x Canadá", "Brasil x Japão", "Alemanha x Paraguai", "Países Baixos x Marrocos",
  "Costa do Marfim x Noruega", "França x Suécia", "México x 3CEFHI", "1L x 3EHIJK",
  "Bélgica x 3AEHIJ", "EUA x Bósnia e Herzegovina", "Espanha x 2J", "2K x 2L",
  "Suíça x 3EFGIJ", "Austrália x Egito", "Argentina x Cabo Verde", "1K x 3DEIJL"
];


// INJEÇÃO DINÂMICA DE INPUTS (Para não ter que escrever 16 linhas no HTML)
document.addEventListener("DOMContentLoaded", () => {
  let htmlReais = "", htmlEdit = "";
  for (let i = 1; i <= 16; i++) {
    htmlReais += `<div class="linha-jogo"><span style="color: var(--text-muted); font-size: 0.8rem;">J${i}: ${nomesJogosAdmin[i-1]}</span><div><input type="number" id="real-j${i}-a" class="input-edit-gol"> X <input type="number" id="real-j${i}-b" class="input-edit-gol"></div></div>`;
    htmlEdit += `<div class="linha-jogo"><span style="color: var(--text-muted); font-size: 0.8rem;">J${i}: ${nomesJogosAdmin[i-1]}</span><div><input type="number" id="edit-j${i}-a" class="input-edit-gol" min="0"> X <input type="number" id="edit-j${i}-b" class="input-edit-gol" min="0"></div></div>`;
  }
  document.getElementById('container-jogos-reais').innerHTML = htmlReais;
  document.getElementById('container-jogos-edicao').innerHTML = htmlEdit;
});

// AUTENTICAÇÃO
const btnLogin = document.getElementById('btn-login');
const feedbackLogin = document.getElementById('login-feedback');

onAuthStateChanged(auth, (user) => {
  if (user) {
    document.getElementById('auth-section').style.display = 'none'; document.getElementById('admin-section').style.display = 'block';
    buscarBilhetesDoBanco(); carregarConfiguracoes();
  } else {
    document.getElementById('auth-section').style.display = 'block'; document.getElementById('admin-section').style.display = 'none';
    btnLogin.innerText = "Acessar Sistema"; btnLogin.disabled = false;
  }
});

btnLogin.addEventListener('click', async () => {
  const email = document.getElementById('admin-email').value.trim(); const senha = document.getElementById('admin-senha').value;
  if(!email || !senha) return;
  btnLogin.innerText = "Autenticando..."; btnLogin.disabled = true; feedbackLogin.style.display = "none";
  try { await signInWithEmailAndPassword(auth, email, senha); } 
  catch (error) { feedbackLogin.innerText = "Credenciais incorretas."; feedbackLogin.style.display = "block"; btnLogin.innerText = "Acessar Sistema"; btnLogin.disabled = false; }
});

document.getElementById('btn-logout').addEventListener('click', () => signOut(auth));

// ABAS
document.getElementById('tab-pendentes').addEventListener('click', (e) => alternarAbaAdmin("pendente", e.target));
document.getElementById('tab-validados').addEventListener('click', (e) => alternarAbaAdmin("validado", e.target));
document.getElementById('tab-config').addEventListener('click', (e) => alternarAbaAdmin("config", e.target));

function alternarAbaAdmin(alvo, botaoAlvo) {
  document.querySelectorAll('.tab-btn').forEach(btn => btn.classList.remove('active')); botaoAlvo.classList.add('active');
  if(alvo === "config") {
    document.getElementById('visao-lista').style.display = 'none'; document.getElementById('visao-config').style.display = 'block'; document.body.classList.remove('tema-validado');
  } else {
    document.getElementById('visao-config').style.display = 'none'; document.getElementById('visao-lista').style.display = 'block';
    filtroStatusAtivo = alvo; document.getElementById('input-busca').value = ""; document.body.classList.toggle('tema-validado', alvo === "validado"); buscarBilhetesDoBanco();
  }
}

document.getElementById('input-busca').addEventListener('input', (e) => {
  const termo = e.target.value.toLowerCase().trim();
  document.querySelectorAll('.linha-aposta').forEach(linha => { linha.style.display = linha.textContent.toLowerCase().includes(termo) ? '' : 'none'; });
});

// TABELA
async function buscarBilhetesDoBanco() {
  const container = document.getElementById('lista-bilhetes');
  container.innerHTML = `<p style="text-align: center; color: var(--text-muted); padding: 20px;">Carregando...</p>`;
  memoriaApostas = {}; 

  try {
    const q = query(collection(db, "bilhetes"), where("status", "==", filtroStatusAtivo));
    const snapshot = await getDocs(q);
    if(snapshot.empty) { container.innerHTML = `<p style="text-align: center; color: var(--text-muted); padding: 40px;">Nenhuma aposta encontrada.</p>`; return; }

    let htmlTabela = `<table class="admin-table"><thead><tr><th>ID/Apostador</th><th>Palpites (1-16)</th><th>Ações</th></tr></thead><tbody>`;

    snapshot.forEach((documento) => {
      const aposta = documento.data(); memoriaApostas[documento.id] = aposta;
      
      let palpitesStr = `<div style="max-height: 60px; overflow-y: auto; font-size: 0.75rem; white-space: normal; color: var(--text-muted);">`;
      if (aposta.palpites) {
        aposta.palpites.forEach((p, idx) => { palpitesStr += `<strong>J${idx+1}:</strong> ${p.placarA}x${p.placarB} | `; });
      }
      palpitesStr += `</div>`;

      htmlTabela += `
        <tr class="linha-aposta">
          <td><strong>${aposta.id_bilhete}</strong><br><span style="font-size:0.85rem;">${aposta.nome_apostador}</span><br><span style="font-size: 0.8rem; color: green; font-weight: bold;">Pts: ${aposta.pontuacao_total || 0}</span></td>
          <td style="min-width: 250px; max-width: 350px;">${palpitesStr}</td>
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
    htmlTabela += `</tbody></table>`; container.innerHTML = htmlTabela;
  } catch (error) { container.innerHTML = `<p style="color: red;">Erro: ${error.message}</p>`; }
}

// AÇÕES TABELA
document.getElementById('lista-bilhetes').addEventListener('click', async (e) => {
  const btn = e.target.closest('.btn-sm'); if (!btn) return;
  const idInterno = btn.getAttribute('data-id'); const acao = btn.getAttribute('data-action');
  
  if (acao === "validar") { await updateDoc(doc(db, "bilhetes", idInterno), { status: "validado" }); buscarBilhetesDoBanco(); } 
  else if (acao === "revogar") { await updateDoc(doc(db, "bilhetes", idInterno), { status: "pendente" }); buscarBilhetesDoBanco(); } 
  else if (acao === "editar") { abrirModalEdicao(idInterno, memoriaApostas[idInterno]); } 
  else if (acao === "excluir") {
    if (confirm("Tem certeza que deseja EXCLUIR permanentemente este palpite?")) {
      try { await deleteDoc(doc(db, "bilhetes", idInterno)); buscarBilhetesDoBanco(); } catch (error) { alert("Erro: " + error.message); }
    }
  }
});

// EDIÇÃO
function abrirModalEdicao(idInterno, aposta) {
  document.getElementById('edit-id-banco').value = idInterno;
  document.getElementById('edit-nome').value = aposta.nome_apostador;
  for (let i = 1; i <= 16; i++) {
    const p = aposta.palpites[i-1];
    document.getElementById(`edit-j${i}-a`).value = p ? p.placarA : 0;
    document.getElementById(`edit-j${i}-b`).value = p ? p.placarB : 0;
  }
  document.getElementById('modal-editar').style.display = 'flex';
}
document.getElementById('btn-cancelar-edicao').addEventListener('click', () => document.getElementById('modal-editar').style.display = 'none');

document.getElementById('btn-salvar-edicao').addEventListener('click', async () => {
  const idInterno = document.getElementById('edit-id-banco').value;
  let novosPalpites = [];
  for (let i = 1; i <= 16; i++) {
    novosPalpites.push({
      jogo: nomesJogosAdmin[i-1],
      placarA: parseInt(document.getElementById(`edit-j${i}-a`).value) || 0,
      placarB: parseInt(document.getElementById(`edit-j${i}-b`).value) || 0
    });
  }
  await updateDoc(doc(db, "bilhetes", idInterno), { nome_apostador: document.getElementById('edit-nome').value, palpites: novosPalpites });
  document.getElementById('modal-editar').style.display = 'none'; buscarBilhetesDoBanco(); 
});

// CÁLCULO DE PONTOS
async function carregarConfiguracoes() {
  try {
    const docRef = doc(db, "configuracoes", "geral"); const docSnap = await getDoc(docRef);
    if (docSnap.exists()) {
      const data = docSnap.data();
      document.getElementById('cfg-pts-resultado').value = data.pts_resultado || 1;
      document.getElementById('cfg-pts-exato').value = data.pts_exato || 2;
      for (let i = 1; i <= 16; i++) {
        document.getElementById(`real-j${i}-a`).value = data[`real_j${i}_a`] !== undefined ? data[`real_j${i}_a`] : "";
        document.getElementById(`real-j${i}-b`).value = data[`real_j${i}_b`] !== undefined ? data[`real_j${i}_b`] : "";
      }
    }
  } catch(e) { console.warn("Documento de config não existe ainda."); }
}

document.getElementById('btn-salvar-calcular').addEventListener('click', async () => {
  const btn = document.getElementById('btn-salvar-calcular'); btn.innerText = "Processando..."; btn.disabled = true;
  try {
    const cfg = {
      pts_resultado: parseInt(document.getElementById('cfg-pts-resultado').value) || 0,
      pts_exato: parseInt(document.getElementById('cfg-pts-exato').value) || 0
    };
    for(let i = 1; i <= 16; i++){
      cfg[`real_j${i}_a`] = document.getElementById(`real-j${i}-a`).value;
      cfg[`real_j${i}_b`] = document.getElementById(`real-j${i}-b`).value;
    }
    await setDoc(doc(db, "configuracoes", "geral"), cfg);

    const q = query(collection(db, "bilhetes"), where("status", "==", "validado"));
    const snapshot = await getDocs(q);
    
    let jogosReais = [];
    for(let i = 1; i <= 16; i++){ jogosReais.push({ a: cfg[`real_j${i}_a`], b: cfg[`real_j${i}_b`] }); }

    for (const documento of snapshot.docs) {
      const aposta = documento.data(); let totalPontos = 0;
      if(aposta.palpites) {
        aposta.palpites.forEach((palpite, idx) => {
          const real = jogosReais[idx];
          if(real.a !== "" && real.b !== "") {
            const rA = parseInt(real.a); const rB = parseInt(real.b);
            const pA = palpite.placarA;  const pB = palpite.placarB;
            const mathSign = (x, y) => x > y ? 1 : x < y ? -1 : 0;
            const resultadoReal = mathSign(rA, rB); const resultadoPalpite = mathSign(pA, pB);

            if (resultadoReal === resultadoPalpite) totalPontos += cfg.pts_resultado;
            if (rA === pA && rB === pB) totalPontos += cfg.pts_exato;
          }
        });
      }
      await updateDoc(doc(db, "bilhetes", documento.id), { pontuacao_total: totalPontos });
    }
    alert("Ranking atualizado!");
  } catch (e) { alert("Erro: " + e.message); } 
  finally { btn.innerText = "Salvar Regras e Recalcular Ranking Geral"; btn.disabled = false; }
});