const nodemailer = require('nodemailer');

function createTransporter() {
  return nodemailer.createTransport({
    host: process.env.SMTP_HOST,
    port: parseInt(process.env.SMTP_PORT || '587'),
    secure: process.env.SMTP_SECURE === 'true',
    auth: {
      user: process.env.SMTP_USER,
      pass: process.env.SMTP_PASS,
    },
  });
}

async function enviarEmail({ para, assunto, html }) {
  // Se SMTP nao estiver configurado, apenas loga no console
  if (!process.env.SMTP_HOST) {
    console.log('📧 [EMAIL SIMULADO] Para:', para);
    console.log('📧 [EMAIL SIMULADO] Assunto:', assunto);
    console.log('📧 [EMAIL SIMULADO] HTML:', html.substring(0, 200) + '...');
    return;
  }

  const transporter = createTransporter();
  await transporter.sendMail({
    from: process.env.SMTP_FROM || '"FuraFila Connect" <noreply@furafila.com>',
    to: para,
    subject: assunto,
    html,
  });
}

function gerarCorpoEmailConfirmacao(codigo) {
  return `
    <div style="font-family: Arial, sans-serif; max-width: 480px; margin: 0 auto;">
      <h2 style="color: #0047AB;">Confirme seu email</h2>
      <p>Você recebeu este email porque seu clínica foi cadastrada no <strong>FuraFila Connect</strong>.</p>
      <p>Use o código abaixo para confirmar seu email:</p>
      <div style="background: #f0f4ff; padding: 20px; border-radius: 8px; text-align: center; margin: 24px 0;">
        <span style="font-size: 2rem; font-weight: bold; letter-spacing: 8px; color: #0047AB;">${codigo}</span>
      </div>
      <p style="color: #666; font-size: 0.85rem;">Este código expira em <strong>30 minutos</strong>.</p>
      <p style="color: #666; font-size: 0.85rem;">Se você não fez este cadastro, pode ignorar este email.</p>
    </div>
  `;
}

function gerarCorpoEmailReset(codigo) {
  return `
    <div style="font-family: Arial, sans-serif; max-width: 480px; margin: 0 auto;">
      <h2 style="color: #0047AB;">Recuperação de senha</h2>
      <p>Você solicitou a recuperação de senha da sua clínica no <strong>FuraFila Connect</strong>.</p>
      <p>Use o código abaixo para redefinir sua senha:</p>
      <div style="background: #f0f4ff; padding: 20px; border-radius: 8px; text-align: center; margin: 24px 0;">
        <span style="font-size: 2rem; font-weight: bold; letter-spacing: 8px; color: #0047AB;">${codigo}</span>
      </div>
      <p style="color: #666; font-size: 0.85rem;">Este código expira em <strong>30 minutos</strong>.</p>
      <p style="color: #666; font-size: 0.85rem;">Se você não solicitou esta recuperação, pode ignorar este email.</p>
    </div>
  `;
}

module.exports = { enviarEmail, gerarCorpoEmailConfirmacao, gerarCorpoEmailReset };
