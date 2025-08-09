import sgMail from "@sendgrid/mail";
import { NextApiRequest, NextApiResponse } from "next";

sgMail.setApiKey(process.env.SENDGRID_API_KEY);

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse
) {
  if (req.method === "POST") {
    const { to, subject, text, html } = req.body;

    const msg = {
      to,
      from: "no-reply@roomify.com",
      subject,
      text,
      html,
    };

    try {
      await sgMail.send(msg);
      res.status(200).json({ message: "Email sent successfully" });
    } catch (error) {
      res.status(500).json({ message: "An error occurred while sending the email" });
    }
  } else {
    res.status(405).json({ message: "Method not allowed" });
  }
}
