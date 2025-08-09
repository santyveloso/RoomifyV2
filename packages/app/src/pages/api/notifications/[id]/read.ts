import { PrismaClient } from "@prisma/client";
import { NextApiRequest, NextApiResponse } from "next";
import { getSession } from "next-auth/react";

const prisma = new PrismaClient();

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse
) {
  const session = await getSession({ req });

  if (!session) {
    return res.status(401).json({ message: "Unauthorized" });
  }

  const { id } = req.query;

  if (req.method === "POST") {
    try {
      const notification = await prisma.notification.findUnique({
        where: { id: String(id) },
      });

      if (!notification) {
        return res.status(404).json({ message: "Notification not found" });
      }

      if (notification.userId !== session.user.id) {
        return res.status(403).json({ message: "Forbidden" });
      }

      const updatedNotification = await prisma.notification.update({
        where: { id: String(id) },
        data: { read: true },
      });

      res.status(200).json(updatedNotification);
    } catch (error) {
      res.status(500).json({ message: "An error occurred while updating the notification" });
    }
  } else {
    res.status(405).json({ message: "Method not allowed" });
  }
}
