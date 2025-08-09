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

  if (req.method === "GET") {
    try {
      const houses = await prisma.house.findMany({
        where: {
          memberships: {
            some: {
              userId: user.id,
            },
          },
        },
        include: {
          memberships: {
            include: {
              user: true,
            },
          },
        },
      });
      res.status(200).json(houses);
    } catch (error) {
      res.status(500).json({ message: "An error occurred while fetching houses" });
    }
  } else {
    res.status(405).json({ message: "Method not allowed" });
  }
}