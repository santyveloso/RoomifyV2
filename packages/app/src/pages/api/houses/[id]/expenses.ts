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

  if (req.method === "POST") {
    const { title, amount, currency, splitEqual, shares } = req.body;

    try {
      const house = await prisma.house.findUnique({
        where: { id: String(id) },
        include: { memberships: true },
      });

      if (!house) {
        return res.status(404).json({ message: "House not found" });
      }

      const isMember = house.memberships.some(
        (membership) => membership.userId === user.id
      );

      if (!isMember) {
        return res.status(403).json({ message: "Forbidden" });
      }

      const expense = await prisma.expense.create({
        data: {
          title,
          amount,
          currency,
          splitEqual,
          houseId: String(id),
          creatorId: user.id,
          shares: {
            create: shares,
          },
        },
      });

      res.status(201).json(expense);
    } catch (error) {
      res.status(500).json({ message: "An error occurred while creating the expense" });
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
        (membership) => membership.userId === user.id
      );

      if (!isMember) {
        return res.status(403).json({ message: "Forbidden" });
      }

      const expenses = await prisma.expense.findMany({
        where: { houseId: String(id) },
        include: { creator: true, shares: { include: { user: true } } },
      });

      res.status(200).json(expenses);
    } catch (error) {
      res.status(500).json({ message: "An error occurred while fetching the expenses" });
    }
  } else {
    res.status(405).json({ message: "Method not allowed" });
  }
}
