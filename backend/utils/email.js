const nodemailer = require('nodemailer');

// Transportador SMTP — configurado a partir das variáveis de ambiente.
// Para Gmail: usa uma "App Password" (não a password normal da conta).
// Ver instruções em: https://myaccount.google.com/apppasswords
let transporter = null;

function obterTransporter() {
  if (transporter) return transporter;

  if (!process.env.SMTP_HOST || !process.env.SMTP_USER || !process.env.SMTP_PASS) {
    return null; // Email não configurado
  }

  transporter = nodemailer.createTransport({
    host: process.env.SMTP_HOST,
    port: Number(process.env.SMTP_PORT) || 587,
    secure: Number(process.env.SMTP_PORT) === 465, // true para porta 465, false para 587/outras
    auth: {
      user: process.env.SMTP_USER,
      pass: process.env.SMTP_PASS
    }
  });

  return transporter;
}

// Envia um email. Lança erro se o SMTP não estiver configurado ou falhar.
async function enviarEmail({ to, subject, html }) {
  const t = obterTransporter();
  if (!t) {
    throw new Error('Email não configurado no servidor. Define SMTP_HOST, SMTP_USER e SMTP_PASS no .env.');
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
        <h2 style="color: #1A1A1A; font-size: 18px; margin: 0 0 16px;">Foste convidado para a CCA</h2>
        <p style="color: #444; font-size: 14px; line-height: 1.6; margin: 0 0 14px;">
          Foste convidado para te juntar à Comissão de Acompanhamento (CCA) na plataforma de
          gestão de propostas de estágios e projetos finais da ESMAD, com acesso a: <strong>${cursosTexto}</strong>.
        </p>
        <p style="color: #444; font-size: 14px; line-height: 1.6; margin: 0 0 22px;">
          Para aceitar o convite, cria a tua conta de docente utilizando este mesmo email.
          Serás automaticamente adicionado à CCA com as permissões acima.
        </p>
        <div style="text-align: center; margin-bottom: 10px;">
          <a href="${linkRegisto}" style="display:inline-block; background:#F15A24; color:#fff; text-decoration:none; padding:12px 28px; border-radius:8px; font-weight:700; font-size:14px;">
            Criar Conta
          </a>
        </div>
        <p style="color: #999; font-size: 12px; text-align: center; margin-top: 18px;">
          Se não esperavas este email, podes ignorá-lo.
        </p>
      </div>
    </div>
  `;
}

module.exports = { enviarEmail, templateConviteCCA };