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

  if (req.method === "POST") {
    const { name } = req.body;

    try {
      const house = await prisma.house.create({
        data: {
          name,
          memberships: {
            create: {
              userId: user.id,
              role: "ADMIN",
            },
          },
        },
      });
      res.status(201).json(house);
    } catch (error) {
      res.status(500).json({ message: "An error occurred while creating the house" });
    }
  } else {
    res.status(405).json({ message: "Method not allowed" });
  }
}
