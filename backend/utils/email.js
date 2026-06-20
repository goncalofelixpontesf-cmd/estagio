const nodemailer = require('nodemailer');

// Transportador SMTP — Outlook / Microsoft 365
// Configuração no .env:
//   SMTP_HOST=smtp.office365.com
//   SMTP_PORT=587
//   SMTP_USER=o-teu-email@esmad.ipp.pt
//   SMTP_PASS=a-tua-password-do-outlook
let transporter = null;

function obterTransporter() {
  if (transporter) return transporter;

  if (!process.env.SMTP_HOST || !process.env.SMTP_USER || !process.env.SMTP_PASS) {
    return null;
  }

  transporter = nodemailer.createTransport({
    host:   process.env.SMTP_HOST || 'smtp.office365.com',
    port:   Number(process.env.SMTP_PORT) || 587,
    secure: false,        // Outlook usa STARTTLS na porta 587, não SSL direto
    requireTLS: true,     // Forçar TLS (obrigatório para Office365)
    auth: {
      user: process.env.SMTP_USER,
      pass: process.env.SMTP_PASS
    },
    tls: {
      ciphers: 'SSLv3'    // Compatibilidade com servidores Microsoft
    }
  });

  return transporter;
}

async function enviarEmail({ to, subject, html }) {
  const t = obterTransporter();
  if (!t) {
    throw new Error('Email não configurado. Define SMTP_HOST, SMTP_USER e SMTP_PASS no .env (ver instruções abaixo).');
  }
  await t.sendMail({
    from: `"ESMAD — Gestão de Propostas" <${process.env.SMTP_USER}>`,
    to,
    subject,
    html
  });
}

// Template do email de convite para a CCA
function templateConviteCCA({ cursosCCA, linkRegisto }) {
  const cursosTexto = cursosCCA && cursosCCA.length
    ? cursosCCA.join(' e ')
    : 'todos os cursos';

  return `
    <div style="font-family: Arial, sans-serif; max-width: 520px; margin: 0 auto; padding: 24px;">
      <div style="background: #F15A24; padding: 20px; border-radius: 12px 12px 0 0; text-align: center;">
        <span style="color: #fff; font-size: 22px; font-weight: 800; letter-spacing: 2px;">ESMAD</span>
      </div>
      <div style="background: #fff; padding: 28px; border: 1px solid #eee; border-radius: 0 0 12px 12px;">
        <h2 style="color: #1A1A1A; font-size: 18px; margin: 0 0 16px;">Convite para a CCA</h2>
        <p style="color: #444; font-size: 14px; line-height: 1.6; margin: 0 0 14px;">
          Foi convidado/a para integrar a Comissão de Coordenação Académica (CCA) na plataforma de
          gestão de propostas de estágios e projetos finais da ESMAD, com acesso a: <strong>${cursosTexto}</strong>.
        </p>
        <p style="color: #444; font-size: 14px; line-height: 1.6; margin: 0 0 22px;">
          Para aceitar o convite, crie a sua conta de docente utilizando este mesmo endereço de email.
          Será automaticamente adicionado/a à CCA com as permissões indicadas.
        </p>
        <div style="text-align: center; margin-bottom: 10px;">
          <a href="${linkRegisto}" style="display:inline-block; background:#F15A24; color:#fff; text-decoration:none; padding:12px 28px; border-radius:8px; font-weight:700; font-size:14px;">
            Criar Conta
          </a>
        </div>
        <p style="color: #999; font-size: 12px; text-align: center; margin-top: 18px;">
          Se não esperava este email, pode ignorá-lo.
        </p>
      </div>
    </div>
  `;
}

module.exports = { enviarEmail, templateConviteCCA };