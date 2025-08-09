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
    const { title, description, frequency } = req.body;

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

      const chore = await prisma.chore.create({
        data: {
          title,
          description,
          frequency,
          houseId: String(id),
        },
      });

      res.status(201).json(chore);
    } catch (error) {
      res.status(500).json({ message: "An error occurred while creating the chore" });
    }
  } else if (req.method === "GET") {
    try {
      const house = await prisma.house.findUnique({
        where: { id: String(id) },
        include: { memberships: true },
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

      const chores = await prisma.chore.findMany({
        where: { houseId: String(id) },
        include: { assignments: { include: { user: true } } },
      });

      res.status(200).json(chores);
    } catch (error) {
      res.status(500).json({ message: "An error occurred while fetching the chores" });
    }
  } else {
    res.status(405).json({ message: "Method not allowed" });
  }
}
