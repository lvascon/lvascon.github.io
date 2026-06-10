// pix.js
function formatarPIX(txid) {
  const MINHA_CHAVE_PIX = "s0456ac21-ca17-49bc-a7c7-a074336f1d5a"; // Chave Pix (UUID, E-mail, CPF/CNPJ, Telefone)
  const NOME_RECEBEDOR = "LUCAS EDUARDO DE LIMA VAS"; // Máximo de 25 caracteres
  const CIDADE_RECEBEDOR = "CAMPINAS";          // Máximo de 15 caracteres
  const VALOR_APOSTA = "15.00";                 // Valor fixo

  // Função auxiliar para limpar acentos e caracteres especiais indesejados
  const sanitizar = (texto, limite) => {
    if (!texto) return "";
    return String(texto)
      .normalize("NFD")
      .replace(/[\u0300-\u036f]/g, "")
      .replace(/[^A-Za-z0-9\s]/g, "")
      .trim()
      .substring(0, limite);
  };

  // Função auxiliar para construir blocos no padrão TLV (ID + Tamanho + Valor)
  const gerarTLV = (id, valor) => {
    const strValor = String(valor);
    const tamanho = strValor.length.toString().padStart(2, '0');
    return `${id}${tamanho}${strValor}`;
  };

  // Prepara a chave (remove traços e pontos que possam interferir, mas mantém hífens para UUID)
  const chaveLimpa = MINHA_CHAVE_PIX.trim();

  // CONSTRUÇÃO DO BLOCO 26 (Contém o Pix e o seu TXID como Comentário)
  const sub00 = gerarTLV("00", "br.gov.bcb.pix");
  const sub01 = gerarTLV("01", chaveLimpa);
  
  // Aqui o seu txid é injetado como o comentário da transferência (Sub-tag 02) [cite: 3, 4]
  const sub02 = txid ? gerarTLV("02", sanitizar(txid, 30)) : ""; 
  
  const tag26 = gerarTLV("26", sub00 + sub01 + sub02);

  // CONSTRUÇÃO DOS DEMAIS BLOCOS
  const tag00 = gerarTLV("00", "01");
  const tag52 = gerarTLV("52", "0000");
  const tag53 = gerarTLV("53", "986");
  
  // Garante que o valor tenha sempre 2 casas decimais separadas por ponto
  const tag54 = gerarTLV("54", parseFloat(VALOR_APOSTA).toFixed(2));
  const tag58 = gerarTLV("58", "BR");
  const tag59 = gerarTLV("59", sanitizar(NOME_RECEBEDOR, 25));
  const tag60 = gerarTLV("60", sanitizar(CIDADE_RECEBEDOR, 15));

  // Bloco 62 (TXID oficial): Preenchido com *** já que o seu identificador foi pro comentário
  const sub62_05 = gerarTLV("05", "***");
  const tag62 = gerarTLV("62", sub62_05);

  // Concatena tudo e adiciona o início da Tag 63 para o cálculo do CRC
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
      crc &= 0xFFFF; // Garante que não passe de 16 bits no JavaScript
    }
  }
  
  // Formata o CRC final para Hexadecimal de 4 dígitos
  const crcHex = crc.toString(16).toUpperCase().padStart(4, '0');

  // Retorna a string final do PIX Copia e Cola validada
  return payloadBase + crcHex;
}

