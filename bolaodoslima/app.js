import { initializeApp } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-app.js";
import { getFirestore, collection, addDoc, getDocs, query, where, serverTimestamp } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-firestore.js";

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

const nomesJogos = [
  "África do Sul x Canadá", "Brasil x Japão", "Alemanha x Paraguai", "Holanda x Marrocos",
  "Costa do Marfim x Noruega", "França x Suécia", "México x Equador", "Inglaterra x RD do Congo",
  "Bélgica x Senegal", "EUA x Bósnia e Herzegovina", "Espanha x Áustria", "Portugal x Croácia",
  "Suíça x Argélia", "Austrália x Egito", "Argentina x Cabo Verde", "Colômbia x Gana"
];

document.getElementById('tab-fazer-aposta').addEventListener('click', (e) => alternarAbasApp('aposta', e.target));
document.getElementById('tab-ranking').addEventListener('click', (e) => { alternarAbasApp('ranking', e.target); carregarRanking(); });

function alternarAbasApp(tela, botaoClicado) {
  document.querySelectorAll('.tab-btn').forEach(btn => btn.classList.remove('active'));
  botaoClicado.classList.add('active');
  document.getElementById('formulario-apostas').style.display = tela === 'aposta' ? 'flex' : 'none';
  document.getElementById('secao-ranking').style.display = tela === 'ranking' ? 'flex' : 'none';
  document.getElementById('qr-container').style.display = 'none';
}

document.getElementById('btn-voltar').addEventListener('click', () => {
  document.getElementById('qr-container').style.display = 'none';
  document.getElementById('formulario-apostas').style.display = 'flex';
  document.getElementById('menu-publico').style.display = 'flex';
});

document.getElementById('btn-gerar').addEventListener('click', async () => {
  const nome = document.getElementById('nome_jogador').value.trim();
  let palpitesRegistrados = [];
  let todosPreenchidos = true;

  for (let i = 1; i <= 16; i++) {
    const pHome = document.getElementById(`home${i}`).value;
    const pAway = document.getElementById(`away${i}`).value;
    if (pHome === "" || pAway === "") todosPreenchidos = false;
    palpitesRegistrados.push({ jogo: nomesJogos[i-1], placarA: parseInt(pHome), placarB: parseInt(pAway) });
  }

  if (!nome || !todosPreenchidos) {
    alert("Por favor, preencha o seu nome e TODOS os 16 placares!");
    return;
  }

  const dataLimite = new Date("2026-06-28T16:00:00-03:00");
  if (new Date() > dataLimite) {
    alert("⚠️ Apostas Encerradas! O primeiro jogo dos 16-Avos já começou.");
    return; 
  }

  const bilheteId = "ID" + Math.random().toString(36).substring(2, 6).toUpperCase();
  const pacoteDados = {
    id_bilhete: bilheteId, nome_apostador: nome, fase: "16-avos", status: "pendente",
    pontuacao_total: 0, timestamp: serverTimestamp(), palpites: palpitesRegistrados
  };

  try {
    document.getElementById('btn-gerar').innerText = "Processando...";
    document.getElementById('btn-gerar').disabled = true;

    await addDoc(collection(db, "bilhetes"), pacoteDados);

    let htmlResumo = `<div style="font-weight: 800; text-align: center; margin-bottom: 8px;">Conferência (16 Jogos):</div><ul style="font-size: 0.8rem;">`;
    palpitesRegistrados.forEach((p, index) => {
      htmlResumo += `<li><span>J${index + 1}: ${p.jogo}</span> <span>${p.placarA} - ${p.placarB}</span></li>`;
    });
    htmlResumo += `</ul>`;
    document.getElementById('resumo-visual').innerHTML = htmlResumo;

    document.getElementById('formulario-apostas').style.display = 'none';
    document.getElementById('menu-publico').style.display = 'none'; 
    document.getElementById('qr-container').style.display = 'block';
    
    document.getElementById('span-nome').innerText = nome;
    document.getElementById('span-id').innerText = bilheteId;

    const payloadPix = await formatarPIX(bilheteId);
    document.getElementById('pix-texto-codigo').innerText = payloadPix;
    document.getElementById("qrcode").innerHTML = ""; 
    new QRCode(document.getElementById("qrcode"), { text: payloadPix, width: 180, height: 180, colorDark: "#0c0c0e", colorLight: "#ffffff" });

    document.getElementById('btn-copia-cola').onclick = () => {
      navigator.clipboard.writeText(payloadPix);
      alert("Código PIX copiado com sucesso!");
    };
  } catch (error) {
    console.error("Erro: ", error); alert("Erro de comunicação com o servidor.");
  } finally {
    document.getElementById('btn-gerar').innerText = "Confirmar e Gerar PIX";
    document.getElementById('btn-gerar').disabled = false;
  }
});

async function carregarRanking() {
  const container = document.getElementById('tabela-ranking-container');
  container.innerHTML = `<p style="text-align: center; color: var(--text-muted);">Carregando base de dados...</p>`;
  
  try {
    const q = query(collection(db, "bilhetes"), where("status", "==", "validado"));
    const snapshot = await getDocs(q);
    if(snapshot.empty) { container.innerHTML = `<p style="text-align: center; padding: 20px;">Nenhum bilhete validado ainda.</p>`; return; }

    let bilhetes = [];
    snapshot.forEach(doc => bilhetes.push(doc.data()));
    bilhetes.sort((a, b) => (b.pontuacao_total || 0) - (a.pontuacao_total || 0));

    let html = `<table class="admin-table ranking-table"><thead><tr><th>Pos</th><th>Apostador</th><th>Pontos</th><th>Palpites Registrados</th></tr></thead><tbody>`;

    bilhetes.forEach((b, index) => {
      const pts = b.pontuacao_total || 0;
      let strPalpites = `<div style="max-height: 80px; overflow-y: auto; font-size: 0.75rem; white-space: normal; line-height: 1.4;">`;
      b.palpites.forEach((p, i) => {
        strPalpites += `<strong>J${i+1}:</strong> ${p.placarA}x${p.placarB} | `;
      });
      strPalpites += `</div>`;

      html += `<tr>
          <td><strong>#${index + 1}</strong></td>
          <td>${b.nome_apostador}<br><span class="id-discreto">${b.id_bilhete}</span></td>
          <td><span class="badge-pontos">${pts} pts</span></td>
          <td class="td-palpites" style="min-width: 200px;">${strPalpites}</td>
        </tr>`;
    });
    html += `</tbody></table>`;
    container.innerHTML = html;
  } catch (error) {
    container.innerHTML = `<p style="color: red; text-align:center;">Erro ao carregar ranking.</p>`;
  }
}