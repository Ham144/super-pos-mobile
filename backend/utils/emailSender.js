import { createCurrentSmtpTransporter, getEffectiveSystemConfig } from "./systemConfig.js";

const emailSender = async ({ to, subject, html }) => {
  if (!to || !subject || !html) {
    return ["", "Gagal, diperlukan to subject dan html"];
  }

  try {
    const config = await getEffectiveSystemConfig();
    const transporter = await createCurrentSmtpTransporter();

    await transporter.sendMail({
      from: config.EMAIL_USER,
      to: to,
      subject,
      html,
    });

    return [true, false];
  } catch (error) {
    console.log(error);
    return ["", `terjadi kesalahan ${JSON.stringify(error)}`];
  }
};

export default emailSender;
