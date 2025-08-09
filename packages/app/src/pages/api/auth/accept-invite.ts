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

  if (req.method === "POST") {
    const { invitationId } = req.body;

    try {
      const invitation = await prisma.invitation.findUnique({
        where: { id: invitationId },
        include: { house: true },
      });

      if (!invitation) {
        return res.status(404).json({ message: "Invitation not found" });
      }

      if (invitation.email !== session.user.email) {
        return res.status(403).json({ message: "This invitation is not for you" });
      }

      if (invitation.accepted) {
        return res.status(400).json({ message: "Invitation already accepted" });
      }

      const now = new Date();
      if (invitation.expiresAt < now) {
        return res.status(400).json({ message: "Invitation has expired" });
      }

      // Get the user by email to get their ID
      const user = await prisma.user.findUnique({
        where: { email: session.user.email },
      });

      if (!user) {
        return res.status(404).json({ message: "User not found" });
      }

      // Create membership
      const membership = await prisma.membership.create({
        data: {
          userId: user.id,
          houseId: invitation.houseId,
        },
      });

      // Mark invitation as accepted
      await prisma.invitation.update({
        where: { id: invitationId },
        data: { accepted: true },
      });

      res.status(200).json({ message: "Invitation accepted successfully", membership });
    } catch (error) {
      console.error(error);
      res.status(500).json({ message: "An error occurred while accepting the invitation" });
    }
  } else {
    res.status(405).json({ message: "Method not allowed" });
  }
}