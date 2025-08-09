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
  const { email } = req.body;

  if (req.method === "POST") {
    try {
      const house = await prisma.house.findUnique({
        where: { id: String(id) },
        include: { memberships: true },
      });

      if (!house) {
        return res.status(404).json({ message: "House not found" });
      }

      const isMember = house.memberships.some(
        (membership) => membership.userId === session.user.id && membership.role === "ADMIN"
      );

      if (!isMember) {
        return res.status(403).json({ message: "Forbidden" });
      }

      const userToInvite = await prisma.user.findUnique({
        where: { email },
      });

      if (!userToInvite) {
        return res.status(404).json({ message: "User not found" });
      }

      const membership = await prisma.membership.create({
        data: {
          userId: userToInvite.id,
          houseId: String(id),
        },
      });

      res.status(201).json(membership);
    } catch (error) {
      res.status(500).json({ message: "An error occurred while inviting the user" });
    }
  } else {
    res.status(405).json({ message: "Method not allowed" });
  }
}
