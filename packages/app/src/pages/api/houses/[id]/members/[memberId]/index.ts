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

  const { id, memberId } = req.query;

  if (req.method === "DELETE") {
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

      // Prevent admin from removing themselves
      if (memberId === user.id) {
        return res.status(400).json({ message: "You cannot remove yourself as admin" });
      }

      // Check if member exists in house
      const memberMembership = house.memberships.find(
        (membership) => membership.userId === memberId
      );

      if (!memberMembership) {
        return res.status(404).json({ message: "Member not found in this house" });
      }

      // Remove membership
      await prisma.membership.delete({
        where: {
          id: memberMembership.id,
        },
      });

      res.status(200).json({ message: "Member removed successfully" });
    } catch (error) {
      console.error(error);
      res.status(500).json({ message: "An error occurred while removing the member" });
    }
  } else {
    res.status(405).json({ message: "Method not allowed" });
  }
}