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

  if (req.method === "GET") {
    try {
      const house = await prisma.house.findUnique({
        where: { id: String(id) },
        include: { memberships: { include: { user: true } } },
      });

      if (!house) {
        return res.status(404).json({ message: "House not found" });
      }

      const isMember = house.memberships.some(
        (membership) => membership.userId === session.user.id
      );

      if (!isMember) {
        return res.status(403).json({ message: "Forbidden" });
      }

      res.status(200).json(house);
    } catch (error) {
      res.status(500).json({ message: "An error occurred while fetching the house" });
    }
  } else {
    res.status(405).json({ message: "Method not allowed" });
  }
}
