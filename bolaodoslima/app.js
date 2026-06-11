// app.js
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

// Controle de Abas
document.getElementById('tab-fazer-aposta').addEventListener('click', (e) => {
  alternarAbasApp('aposta', e.target);
});
document.getElementById('tab-ranking').addEventListener('click', (e) => {
  alternarAbasApp('ranking', e.target);
  carregarRanking();
});

function alternarAbasApp(tela, botaoClicado) {
  document.querySelectorAll('.tab-btn').forEach(btn => btn.classList.remove('active'));
  botaoClicado.classList.add('active');

  document.getElementById('formulario-apostas').style.display = tela === 'aposta' ? 'flex' : 'none';
  document.getElementById('secao-ranking').style.display = tela === 'ranking' ? 'flex' : 'none';
  document.getElementById('qr-container').style.display = 'none'; // Sempre esconde o QR ao trocar de aba
}

// Botão Voltar do Pagamento
document.getElementById('btn-voltar').addEventListener('click', () => {
  document.getElementById('qr-container').style.display = 'none';
  document.getElementById('formulario-apostas').style.display = 'flex';
  document.getElementById('menu-publico').style.display = 'flex';
});

// Gerar Aposta
document.getElementById('btn-gerar').addEventListener('click', async () => {
  const nome = document.getElementById('nome_jogador').value.trim();
  const b1 = document.getElementById('bra1').value; const a1 = document.getElementById('adv1').value;
  const b2 = document.getElementById('bra2').value; const a2 = document.getElementById('adv2').value;
  const a3 = document.getElementById('adv3').value; const b3 = document.getElementById('bra3').value;
  
  if(!nome || b1==="" || a1==="" || b2==="" || a2==="" || b3==="" || a3==="") {
    alert("Por favor, preencha todos os campos!");
    return;
  }

  const dataLimite = new Date("2026-06-13T19:00:00-03:00");
  if (new Date() > dataLimite) {
    alert("⚠️ Apostas Encerradas! O primeiro jogo já começou ou está prestes a começar.");
    return; 
  }

  const bilheteId = "ID" + Math.random().toString(36).substring(2, 6).toUpperCase();

  const pacoteDados = {
    id_bilhete: bilheteId,
    nome_apostador: nome,
    fase: "grupos",
    status: "pendente",
    pontuacao_total: 0, // Inicia zerado
    timestamp: serverTimestamp(),
    palpites: [
      { jogo: "BRA x MAR", placarA: parseInt(b1), placarB: parseInt(a1) },
      { jogo: "BRA x HAI", placarA: parseInt(b2), placarB: parseInt(a2) },
      { jogo: "SCO x BRA", placarA: parseInt(a3), placarB: parseInt(b3) } 
    ]
  };

  try {
    document.getElementById('btn-gerar').innerText = "Processando...";
    document.getElementById('btn-gerar').disabled = true;

    await addDoc(collection(db, "bilhetes"), pacoteDados);

    // Renderiza Resumo Visual
    document.getElementById('resumo-visual').innerHTML = `
      <div style="font-weight: 800; text-align: center; margin-bottom: 8px;">Conferência:</div>
      <ul>
        <li><span>BRA x MAR</span> <span>${b1} - ${a1}</span></li>
        <li><span>BRA x HAI</span> <span>${b2} - ${a2}</span></li>
        <li><span>SCO x BRA</span> <span>${a3} - ${b3}</span></li>
      </ul>
    `;

    document.getElementById('formulario-apostas').style.display = 'none';
    document.getElementById('menu-publico').style.display = 'none'; // Esconde menu no check-out
    document.getElementById('qr-container').style.display = 'block';
    
    document.getElementById('span-nome').innerText = nome;
    document.getElementById('span-id').innerText = bilheteId;

    const payloadPix = await formatarPIX(bilheteId); // do pix.js
    document.getElementById('pix-texto-codigo').innerText = payloadPix;
    
    document.getElementById("qrcode").innerHTML = ""; // Limpa QR anterior se tiver
    new QRCode(document.getElementById("qrcode"), {
      text: payloadPix, width: 180, height: 180, colorDark: "#0c0c0e", colorLight: "#ffffff"
    });

    document.getElementById('btn-copia-cola').onclick = () => {
      navigator.clipboard.writeText(payloadPix);
      alert("Código PIX copiado com sucesso!");
    };

  } catch (error) {
    console.error("Erro: ", error);
    alert("Erro de comunicação com o servidor.");
  } finally {
    document.getElementById('btn-gerar').innerText = "Confirmar e Gerar PIX";
    document.getElementById('btn-gerar').disabled = false;
  }
});

// Carregar Ranking Dinâmico
async function carregarRanking() {
  const container = document.getElementById('tabela-ranking-container');
  container.innerHTML = `<p style="text-align: center; color: var(--text-muted);">Carregando base de dados...</p>`;
  
  try {
    const q = query(collection(db, "bilhetes"), where("status", "==", "validado"));
    const snapshot = await getDocs(q);
    
    if(snapshot.empty) {
      container.innerHTML = `<p style="text-align: center; padding: 20px;">Nenhum bilhete validado ainda.</p>`;
      return;
    }

    let bilhetes = [];
    snapshot.forEach(doc => bilhetes.push(doc.data()));

    // Ordenação Client-Side
    bilhetes.sort((a, b) => (b.pontuacao_total || 0) - (a.pontuacao_total || 0));

    let html = `
      <table class="admin-table ranking-table">
        <thead>
          <tr>
            <th>Pos</th>
            <th>Apostador</th>
            <th>Pontos</th>
            <th>Palpites Registrados</th>
          </tr>
        </thead>
        <tbody>
    `;

    bilhetes.forEach((b, index) => {
      const pts = b.pontuacao_total || 0;
      const p1 = b.palpites[0] || {placarA: '-', placarB: '-'};
      const p2 = b.palpites[1] || {placarA: '-', placarB: '-'};
      const p3 = b.palpites[2] || {placarA: '-', placarB: '-'};
      
      let strPalpites = `BRA ${p1.placarA}x${p1.placarB} MAR | BRA ${p2.placarA}x${p2.placarB} HAI | SCO ${p3.placarA}x${p3.placarB} BRA`;

      html += `
        <tr>
          <td><strong>#${index + 1}</strong></td>
          <td>
            ${b.nome_apostador}<br>
            <span class="id-discreto">${b.id_bilhete}</span>
          </td>
          <td><span class="badge-pontos">${pts} pts</span></td>
          <td class="td-palpites">${strPalpites}</td>
        </tr>
      `;
    });

    html += `</tbody></table>`;
    container.innerHTML = html;

  } catch (error) {
    container.innerHTML = `<p style="color: red; text-align:center;">Erro ao carregar ranking.</p>`;
    console.error(error);
  }
}