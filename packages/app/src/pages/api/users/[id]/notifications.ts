import { PrismaClient } from "@prisma/client";
import { NextApiRequest, NextApiResponse } from "next";
import { getSession } from "next-auth/react";

const prisma = new PrismaClient();

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse
) {
  const session = await getSession({ req });

  if (!session || !session.user?.email) {
    return res.status(401).json({ message: "Unauthorized" });
  }

  // Get the user by email to get their ID
  const user = await prisma.user.findUnique({
    where: { email: session.user.email },
  });

  if (!user) {
    return res.status(401).json({ message: "Unauthorized" });
  }

  const { id } = req.query;

  if (user.id !== id) {
    return res.status(403).json({ message: "Forbidden" });
  }

  if (req.method === "GET") {
    try {
      const notifications = await prisma.notification.findMany({
        where: { userId: String(id) },
      });
      res.status(200).json(notifications);
    } catch (error) {
      res.status(500).json({ message: "An error occurred while fetching the notifications" });
    }
  } else {
    res.status(405).json({ message: "Method not allowed" });
  }
}
