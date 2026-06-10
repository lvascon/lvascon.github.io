// app.js
import { initializeApp } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-app.js";
import { getFirestore, collection, addDoc, serverTimestamp } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-firestore.js";

// SUBSTITUA COMPLETO COM AS SUAS CHAVES DO PASSO 1-A (ITEM 7)
const firebaseConfig = {
  apiKey: "AIzaSyDWwybQMZYsQCIQhG-5sFW-zWinKwQ2PDs",
  authDomain: "bolao-dos-limas.firebaseapp.com",
  projectId: "bolao-dos-limas",
  storageBucket: "bolao-dos-limas.firebasestorage.app",
  messagingSenderId: "50465541905",
  appId: "1:50465541905:web:21ce77a1f31d84438e06b0"
};

// Initialize Firebase
const app = initializeApp(firebaseConfig);
const db = getFirestore(app);

document.getElementById('btn-gerar').addEventListener('click', async () => {
  const nome = document.getElementById('nome_jogador').value.trim();
  
  const b1 = document.getElementById('bra1').value;
  const a1 = document.getElementById('adv1').value;
  const b2 = document.getElementById('bra2').value;
  const a2 = document.getElementById('adv2').value;
  const b3 = document.getElementById('bra3').value;
  const a3 = document.getElementById('adv3').value;
  
  if(!nome || b1==="" || a1==="" || b2==="" || a2==="" || b3==="" || a3==="") {
    alert("Por favor, preencha o seu nome e todos os placares!");
    return;
  }

  // Gera um ID de transação curto único legível (Ex: IDM3A9)
  const bilheteId = "ID" + Math.random().toString(36).substring(2, 6).toUpperCase();

  const pacoteDados = {
    id_bilhete: bilheteId,
    nome_apostador: nome,
    fase: "grupos",
    status: "pendente",
    timestamp: serverTimestamp(),
    palpites: [
      { jogo: "BRA x MAR", placarA: parseInt(b1), placarB: parseInt(a1) },
      { jogo: "BRA x HAI", placarA: parseInt(b2), placarB: parseInt(a2) },
      // Aqui a ordem muda para bater com o visual (Escócia primeiro)
      { jogo: "ESC x BRA", placarA: parseInt(a3), placarB: parseInt(b3) } 
    ]
  };

  try {
    document.getElementById('btn-gerar').innerText = "Processando...";
    document.getElementById('btn-gerar').disabled = true;

    // Salva no Firestore
    await addDoc(collection(db, "bilhetes"), pacoteDados);

    // Modifica a interface para o modo de pagamento
    document.getElementById('formulario-apostas').style.display = 'none';
    document.getElementById('qr-container').style.display = 'block';
    
    document.getElementById('span-nome').innerText = nome;
    document.getElementById('span-id').innerText = bilheteId;

    // Gera a string de pagamento PIX usando a função global do pix.js
    const payloadPix = await formatarPIX(bilheteId);
    
    // Alimenta a caixa de cópia em texto livre
    document.getElementById('pix-texto-codigo').innerText = payloadPix;

    // Renderiza graficamente o QR Code na div apropriada
    new QRCode(document.getElementById("qrcode"), {
      text: payloadPix,
      width: 180,
      height: 180,
      colorDark: "#0c0c0e",
      colorLight: "#ffffff"
    });

    // Ativa botão de ação rápida de copiar para o clipboard
    document.getElementById('btn-copia-cola').onclick = () => {
      navigator.clipboard.writeText(payloadPix);
      alert("Código PIX Copia e Cola copiado com sucesso! Abra o app do seu banco.");
    };

  } catch (error) {
    console.error("Erro ao registrar bilhete: ", error);
    alert("Erro de comunicação com o servidor. Verifique sua conexão.");
    document.getElementById('btn-gerar').innerText = "Confirmar e Gerar PIX";
    document.getElementById('btn-gerar').disabled = false;
  }
});