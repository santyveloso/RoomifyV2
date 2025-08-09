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

  if (req.method === "PATCH") {
    const { name } = req.body;

    try {
      const house = await prisma.house.findUnique({
        where: { id: String(id) },
        include: { memberships: true },
      });

      if (!house) {
        return res.status(404).json({ message: "House not found" });
      }

      const currentUserMembership = house.memberships.find(
        (membership) => membership.userId === user.id
      );

      if (!currentUserMembership || currentUserMembership.role !== "ADMIN") {
        return res.status(403).json({ message: "Forbidden" });
      }

      const updatedHouse = await prisma.house.update({
        where: { id: String(id) },
        data: { name },
      });

      res.status(200).json(updatedHouse);
    } catch (error) {
      console.error(error);
      res.status(500).json({ message: "An error occurred while updating the house" });
    }
  } else {
    res.status(405).json({ message: "Method not allowed" });
  }
}