import sgMail from "@sendgrid/mail";
import { NextApiRequest, NextApiResponse } from "next";

const sendgridApiKey = process.env.SENDGRID_API_KEY;
const sendgridFromEmail = process.env.SENDGRID_FROM_EMAIL;

if (!sendgridApiKey) {
  throw new Error("SENDGRID_API_KEY is not defined");
}

if (!sendgridFromEmail) {
  throw new Error("SENDGRID_FROM_EMAIL is not defined");
}

sgMail.setApiKey(sendgridApiKey);

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse
) {
  if (req.method === "POST") {
    const { to, subject, text, html } = req.body;

    try {
      await sgMail.send({
        to,
        from: sendgridFromEmail as string,
        subject,
        text,
        html,
      });
      res.status(200).json({ message: "Email sent successfully" });
    } catch (error) {
      res.status(500).json({ message: "An error occurred while sending the email" });
    }
  } else {
    res.status(405).json({ message: "Method not allowed" });
  }
}
