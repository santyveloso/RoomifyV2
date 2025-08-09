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
        (membership) => membership.userId === user.id && membership.role === "ADMIN"
      );

      if (!isMember) {
        return res.status(403).json({ message: "Forbidden" });
      }

      // Check if user is already a member
      const existingUser = await prisma.user.findUnique({
        where: { email },
      });

      if (existingUser) {
        const existingMembership = await prisma.membership.findUnique({
          where: {
            userId_houseId: {
              userId: existingUser.id,
              houseId: String(id),
            },
          },
        });

        if (existingMembership) {
          return res.status(400).json({ message: "User is already a member of this house" });
        }

        // Create membership for existing user
        const membership = await prisma.membership.create({
          data: {
            userId: existingUser.id,
            houseId: String(id),
          },
        });

        res.status(201).json(membership);
      } else {
        // Create invitation for new user
        const expiresAt = new Date();
        expiresAt.setDate(expiresAt.getDate() + 7); // Invitation expires in 7 days

        const invitation = await prisma.invitation.create({
          data: {
            email,
            houseId: String(id),
            invitedById: user.id,
            expiresAt,
          },
        });

        // TODO: Send email invitation
        res.status(201).json({ message: "Invitation sent successfully" });
      }
    } catch (error) {
      console.error(error);
      res.status(500).json({ message: "An error occurred while inviting the user" });
    }
  } else {
    res.status(405).json({ message: "Method not allowed" });
  }
}
