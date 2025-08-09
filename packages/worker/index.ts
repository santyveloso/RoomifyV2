import { Worker } from "bullmq";
import Redis from "ioredis";
import { PrismaClient } from "@prisma/client";

const connection = new Redis();
const prisma = new PrismaClient();

new Worker(
  "chores",
  async (job) => {
    console.log("Processing chore rotation job");

    const chores = await prisma.chore.findMany({
      where: { active: true },
      include: { assignments: true, house: { include: { memberships: true } } },
    });

    for (const chore of chores) {
      const lastAssignment = chore.assignments.sort(
        (a, b) => new Date(b.dueDate).getTime() - new Date(a.dueDate).getTime()
      )[0];

      const lastAssigneeIndex = chore.house.memberships.findIndex(
        (membership) => membership.userId === lastAssignment.userId
      );

      const nextAssigneeIndex =
        (lastAssigneeIndex + 1) % chore.house.memberships.length;

      const nextAssignee = chore.house.memberships[nextAssigneeIndex];

      const nextDueDate = new Date();
      if (chore.frequency === "WEEKLY") {
        nextDueDate.setDate(nextDueDate.getDate() + 7);
      } else if (chore.frequency === "MONTHLY") {
        nextDueDate.setMonth(nextDueDate.getMonth() + 1);
      }

      await prisma.choreAssignment.create({
        data: {
          choreId: chore.id,
          userId: nextAssignee.userId,
          dueDate: nextDueDate,
        },
      });
    }
  },
  { connection }
);