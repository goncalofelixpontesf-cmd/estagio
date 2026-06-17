const cloudinary = require('cloudinary').v2;

cloudinary.config({
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
  api_key:    process.env.CLOUDINARY_API_KEY,
  api_secret: process.env.CLOUDINARY_API_SECRET
});

const configurado = !!(
  process.env.CLOUDINARY_CLOUD_NAME &&
  process.env.CLOUDINARY_API_KEY &&
  process.env.CLOUDINARY_API_SECRET
);

/**
 * Envia uma cópia de backup de um ficheiro (ex: CV em PDF) para o Cloudinary.
 * Não bloqueia o fluxo principal — se falhar ou não estiver configurado,
 * resolve com null e quem chamou decide como reagir (normalmente só registar aviso).
 *
 * @param {string} caminhoLocal - caminho absoluto do ficheiro já guardado em disco
 * @param {string} publicId     - identificador a usar no Cloudinary (sem extensão)
 * @returns {Promise<string|null>} URL segura do backup, ou null se não foi possível
 */
async function enviarBackupCV(caminhoLocal, publicId) {
  if (!configurado) {
    console.warn('[Cloudinary] Credenciais não configuradas no .env — backup do CV ignorado.');
    return null;
  }
  try {
    const resultado = await cloudinary.uploader.upload(caminhoLocal, {
      resource_type: 'raw',        // PDFs não são imagens, têm de ir como "raw"
      folder: 'esmad/cv-backups',
      public_id: publicId,
      overwrite: true
    });
    return resultado.secure_url;
  } catch (err) {
    console.error('[Cloudinary] Falha ao enviar backup do CV:', err.message);
    return null;
  }
}

module.exports = { enviarBackupCV };