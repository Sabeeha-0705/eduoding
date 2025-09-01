import nodemailer from "nodemailer";

const transporter = nodemailer.createTransport({
  service: "gmail",
  auth: {
    user: process.env.EMAIL_USER, // 👉 your gmail
    pass: process.env.EMAIL_PASS  // 👉 app password
  }
});

export const sendOTP = async (email, otp) => {
  await transporter.sendMail({
    from: `"Eduoding" <${process.env.EMAIL_USER}>`,
    to: email,
    subject: "Your OTP Code",
    html: `<h2>Your OTP is: ${otp}</h2><p>Valid for 5 minutes only.</p>`
  });
};
