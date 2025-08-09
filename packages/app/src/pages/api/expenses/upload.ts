import { createClient } from "@supabase/supabase-js";
import { NextApiRequest, NextApiResponse } from "next";
import { getSession } from "next-auth/react";

const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_ANON_KEY
);

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse
) {
  const session = await getSession({ req });

  if (!session) {
    return res.status(401).json({ message: "Unauthorized" });
  }

  if (req.method === "POST") {
    const { file } = req.body;

    try {
      const { data, error } = await supabase.storage
        .from("receipts")
        .upload(`${session.user.id}/${Date.now()}`, file);

      if (error) {
        return res.status(500).json({ message: error.message });
      }

      res.status(200).json({ url: data.path });
    } catch (error) {
      res.status(500).json({ message: "An error occurred while uploading the file" });
    }
  } else {
    res.status(405).json({ message: "Method not allowed" });
  }
}
