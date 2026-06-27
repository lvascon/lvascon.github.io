// pix.js
function formatarPIX(txid) {
  const MINHA_CHAVE_PIX = "lucasvascon@outlook.com"; 
  const NOME_RECEBEDOR = "LUCAS_EDUARDO_DE_LIMA_VAS"; 
  const CIDADE_RECEBEDOR = "CAMPINAS";          
  const VALOR_APOSTA = "10.00";                 

  const gerarTLV = (id, valor) => {
    const strValor = String(valor);
    const tamanho = strValor.length.toString().padStart(2, '0');
    return `${id}${tamanho}${strValor}`;
  };

  // Garante que o ID será processado, ou usa "***" por segurança caso chegue vazio
  const idValido = (txid && String(txid).trim() !== "") ? String(txid).trim() : "***";

  // BLOCO 26: Injetando o txid (ex: IDVDD9) como Comentário
  const sub00 = gerarTLV("00", "br.gov.bcb.pix");
  const sub01 = gerarTLV("01", MINHA_CHAVE_PIX);
  const sub02 = gerarTLV("02", idValido); 
  const tag26 = gerarTLV("26", sub00 + sub01 + sub02);

  // BLOCOS OBRIGATÓRIOS DO PADRÃO EMV
  const tag00 = gerarTLV("00", "01");
  const tag52 = gerarTLV("52", "0000");
  const tag53 = gerarTLV("53", "986");
  const tag54 = gerarTLV("54", parseFloat(VALOR_APOSTA).toFixed(2));
  const tag58 = gerarTLV("58", "BR");
  const tag59 = gerarTLV("59", NOME_RECEBEDOR);
  const tag60 = gerarTLV("60", CIDADE_RECEBEDOR);

  // BLOCO 62: Injetando o txid como Marcador Oficial TXID
  const sub62_05 = gerarTLV("05", idValido);
  const tag62 = gerarTLV("62", sub62_05);

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
  
  return payloadBase + crc.toString(16).toUpperCase().padStart(4, '0');
}