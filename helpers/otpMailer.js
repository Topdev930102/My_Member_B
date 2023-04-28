const nodemailer = require("nodemailer");

const OtpMailer = async (recipient, body) => {
  let transporter = nodemailer.createTransport({
    host: "mail.mymanager.com",
    port: 587,
    secure: false,
    auth: {
      user: "admin@mymanager.com",
      pass: "Rr42728292",
    },
    tls: {
      rejectUnauthorized: false,
    },
  });

  let mailOptions = {
    from: '"My Member" <hello@mymanager.com>',
    to: recipient,
    subject: "OTP Code",
    text: "Let us verify that its you!",
    html: body,
  };

  transporter.sendMail(mailOptions, function (error, info) {
    if (error) {
      console.log("Email Sending failed", error);
    } else {
      console.log("Otp Send to your email" + info.response);
    }
  });
};

module.exports = { OtpMailer };
