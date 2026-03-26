/**
 * formatters.js - Utilitários de padronização de dados
 */

/**
 * Formata uma string de telefone para o padrão (XX) XXXXX-XXXX
 * @param {string|null} tel
 * @returns {string}
 */
function formatPhoneBR(tel) {
  if (!tel) return '';

  // Remove tudo que não for dígito
  let cleaned = tel.toString().replace(/\D/g, '');

  // Se tiver 11 dígitos, é celular (XX) XXXXX-XXXX
  if (cleaned.length === 11) {
    return `(${cleaned.substring(0, 2)}) ${cleaned.substring(2, 7)}-${cleaned.substring(7)}`;
  }

  // Se tiver 10 dígitos, é fixo (XX) XXXX-XXXX
  if (cleaned.length === 10) {
    return `(${cleaned.substring(0, 2)}) ${cleaned.substring(2, 6)}-${cleaned.substring(6)}`;
  }

  // Se for maior que 11, tenta pegar os últimos 11 (caso venha com 55 na frente)
  if (cleaned.length > 11) {
    // Remove o 55 se estiver no começo
    if (cleaned.startsWith('55')) {
       cleaned = cleaned.substring(2);
       return formatPhoneBR(cleaned); // recursivo para aplicar 10 ou 11
    }
  }

  // Se não bater com nada, retorna limpo ou o que der
  return cleaned;
}

/**
 * Valida se uma string é uma data válida no formato YYYY-MM-DD
 * @param {string} dateStr
 * @returns {boolean}
 */
function isValidDate(dateStr) {
  if (!dateStr || typeof dateStr !== 'string') return false;
  // Verifica formato YYYY-MM-DD
  if (!/^\d{4}-\d{2}-\d{2}$/.test(dateStr)) return false;
  const date = new Date(dateStr + 'T12:00:00');
  return !isNaN(date.getTime());
}

module.exports = {
  formatPhoneBR,
  isValidDate
};
