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

  if (req.method === "GET") {
    try {
      const invitations = await prisma.invitation.findMany({
        where: { 
          email: session.user.email || undefined,
          accepted: false,
        },
        include: {
          house: true,
          invitedBy: true,
        },
        orderBy: {
          createdAt: "desc",
        },
      });

      // Filter out expired invitations
      const now = new Date();
      const validInvitations = invitations.filter(
        (invitation) => invitation.expiresAt > now
      );

      res.status(200).json(validInvitations);
    } catch (error) {
      res.status(500).json({ message: "An error occurred while fetching invitations" });
    }
  } else {
    res.status(405).json({ message: "Method not allowed" });
  }
}