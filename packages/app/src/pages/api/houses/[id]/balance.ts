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
        (membership) => membership.userId === user.id
      );

      if (!isMember) {
        return res.status(403).json({ message: "Forbidden" });
      }

      const expenses = await prisma.expense.findMany({
        where: { houseId: String(id) },
        include: { shares: true },
      });

      const balances = new Map<string, number>();

      for (const membership of house.memberships) {
        balances.set(membership.user.name || membership.user.email, 0);
      }

      for (const expense of expenses) {
        if (expense.splitEqual) {
          const amountPerUser = Number(expense.amount) / house.memberships.length;
          for (const membership of house.memberships) {
            const userName = membership.user.name || membership.user.email;
            const currentBalance = balances.get(userName) || 0;
            if (membership.userId === expense.creatorId) {
              balances.set(
                userName,
                currentBalance + (Number(expense.amount) - amountPerUser)
              );
            } else {
              balances.set(
                userName,
                currentBalance - amountPerUser
              );
            }
          }
        } else {
          for (const share of expense.shares) {
            const membership = house.memberships.find(
              (membership) => membership.userId === share.userId
            );
            
            if (!membership) continue;
            
            const userName = membership.user.name || membership.user.email;
            const currentBalance = balances.get(userName) || 0;
            if (share.userId === expense.creatorId) {
              balances.set(
                userName,
                currentBalance + (Number(expense.amount) - Number(share.amount))
              );
            } else {
              balances.set(userName, currentBalance - Number(share.amount));
            }
          }
        }
      }

      res.status(200).json(Object.fromEntries(balances));
    } catch (error) {
      res.status(500).json({ message: "An error occurred while calculating the balance" });
    }
  } else {
    res.status(405).json({ message: "Method not allowed" });
  }
}
