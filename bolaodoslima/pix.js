// pix.js
function formatarPIX(txid) {
  // ATENÇÃO: Use a chave exata que funcionou no seu teste de validação.
  // Se a chave for inválida, o app do banco rejeita o Pix Copia e Cola na mesma hora.
  const MINHA_CHAVE_PIX = "43169231880"; 
  const NOME_RECEBEDOR = "LUCAS_EDUARDO_DE_LIMA_VAS"; // Mantido com os underlines para bater com seu banco
  const CIDADE_RECEBEDOR = "CAMPINAS";          
  const VALOR_APOSTA = "15.00";                 

  // Gera um ID de transação curto único legível (Ex: IDM3A9)
  const bilheteId = "ID" + Math.random().toString(36).substring(2, 6).toUpperCase();

  // Função auxiliar para construir os blocos TLV
  const gerarTLV = (id, valor) => {
    const strValor = String(valor);
    const tamanho = strValor.length.toString().padStart(2, '0');
    return `${id}${tamanho}${strValor}`;
  };

  // BLOCO 26: Injetando o bilheteId como Comentário Visual (Sub-tag 02)
  const sub00 = gerarTLV("00", "br.gov.bcb.pix");
  const sub01 = gerarTLV("01", MINHA_CHAVE_PIX);
  const sub02 = gerarTLV("02", bilheteId); 
  const tag26 = gerarTLV("26", sub00 + sub01 + sub02);

  // BLOCOS OBRIGATÓRIOS DO PADRÃO EMV
  const tag00 = gerarTLV("00", "01");
  const tag52 = gerarTLV("52", "0000");
  const tag53 = gerarTLV("53", "986");
  const tag54 = gerarTLV("54", parseFloat(VALOR_APOSTA).toFixed(2));
  const tag58 = gerarTLV("58", "BR");
  const tag59 = gerarTLV("59", NOME_RECEBEDOR);
  const tag60 = gerarTLV("60", CIDADE_RECEBEDOR);

  // BLOCO 62: Injetando o bilheteId como Marcador Oficial de TXID (Sub-tag 05)
  const sub62_05 = gerarTLV("05", bilheteId);
  const tag62 = gerarTLV("62", sub62_05);

  // Concatena tudo para realizar o Hash
  const payloadBase = tag00 + tag26 + tag52 + tag53 + tag54 + tag58 + tag59 + tag60 + tag62 + "6304";

  // CÁLCULO CRIPTOGRÁFICO DO CRC16-CCITT-FALSE
  let crc = 0xFFFF;
  for (let i = 0; i < payloadBase.length; i++) {
    crc ^= (payloadBase.charCodeAt(i) << 8);
    for (let j = 0; j < 8; j++) {
      if ((crc & 0x8000) !== 0) {
        crc = (crc << 1) ^ 0x1021;
      } else {
        crc = (crc << 1);
      }
      crc &= 0xFFFF;
    }
  }
  
  // Assinatura de 4 dígitos em Hexadecimal
  const crcFinal = crc.toString(16).toUpperCase().padStart(4, '0');
  const payloadFinal = payloadBase + crcFinal;
  
  return { bilheteId, payloadFinal };
}

// -----------------------------------------------------
// TESTANDO NA PRÁTICA 
// -----------------------------------------------------
const { bilheteId, payloadFinal } = formatarPIX();

console.log("=== ID DA APOSTA ===");
console.log(bilheteId);

console.log("\n=== PIX COPIA E COLA ===");
console.log(payloadFinal);

// Link para exibir o QR code no seu site
const urlQrCode = `https://api.qrserver.com/v1/create-qr-code/?size=300x300&data=${encodeURIComponent(payloadFinal)}`;

console.log("\n=== LINK DO QR CODE ===");
console.log(urlQrCode);