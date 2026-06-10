// pix.js
const MINHA_CHAVE_PIX = "s0456ac21-ca17-49bc-a7c7-a074336f1d5a"; // INSIRA SUA CHAVE AQUI (E-mail, Telefone ou CPF)
const NOME_RECEBEDOR = "Lucas Eduardo de Lima Vascon";     // SEU NOME COMPLETO (Sem acentos)
const CIDADE_RECEBEDOR = "Campinas";           // SUA CIDADE (Sem acentos)
const VALOR_APOSTA = "15.00";                   // Valor fixo do combo dos 3 jogos

function formatarPIX(txid) {
  // Constrói a requisição utilizando a API pública EMV do padrão do Banco Central
  const url = `https://gerarqrcodepix.com.br/api/v1?nome=${encodeURI(NOME_RECEBEDOR)}&cidade=${encodeURI(CIDADE_RECEBEDOR)}&chave=${MINHA_CHAVE_PIX}&valor=${VALOR_APOSTA}&saida=brcode&txid=${txid}`;
  
  return fetch(url)
    .then(res => {
      if(!res.ok) throw new Error();
      return res.json();
    })
    .then(data => data.brcode)
    .catch(() => {
      // Fallback estático de emergência simplificado caso a API sofra instabilidade
      return `00020101021226810014br.gov.bcb.pix0123${MINHA_CHAVE_PIX}520400005303986540515.005802BR5917${NOME_RECEBEDOR.substring(0,15)}6009${CIDADE_RECEBEDOR.substring(0,9)}62190515${txid}6304ABCD`;
    });
}