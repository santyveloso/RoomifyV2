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
        (membership) => membership.userId === session.user.id
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
        balances.set(membership.user.name, 0);
      }

      for (const expense of expenses) {
        if (expense.splitEqual) {
          const amountPerUser = expense.amount / house.memberships.length;
          for (const membership of house.memberships) {
            if (membership.userId === expense.creatorId) {
              balances.set(
                membership.user.name,
                balances.get(membership.user.name) + (expense.amount - amountPerUser)
              );
            } else {
              balances.set(
                membership.user.name,
                balances.get(membership.user.name) - amountPerUser
              );
            }
          }
        } else {
          for (const share of expense.shares) {
            const user = house.memberships.find(
              (membership) => membership.userId === share.userId
            ).user;
            if (share.userId === expense.creatorId) {
              balances.set(
                user.name,
                balances.get(user.name) + (expense.amount - share.amount)
              );
            } else {
              balances.set(user.name, balances.get(user.name) - share.amount);
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
