import { Queue } from "bullmq";
import { NextApiRequest, NextApiResponse } from "next";
import Redis from "ioredis";

const connection = new Redis();
const choresQueue = new Queue("chores", { connection });

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse
) {
  if (req.method === "POST") {
    await choresQueue.add("rotate", {});
    res.status(200).json({ message: "Chore rotation job scheduled" });
  } else {
    res.status(405).json({ message: "Method not allowed" });
  }
}
