import { createClient } from "@supabase/supabase-js";
import { NextApiRequest, NextApiResponse } from "next";

const supabaseUrl = process.env.SUPABASE_URL;
const supabaseAnonKey = process.env.SUPABASE_ANON_KEY;

if (!supabaseUrl) {
  throw new Error("SUPABASE_URL is not defined");
}

if (!supabaseAnonKey) {
  throw new Error("SUPABASE_ANON_KEY is not defined");
}

const supabase = createClient(
  supabaseUrl,
  supabaseAnonKey
);

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse
) {
  if (req.method === "POST") {
    const { file, fileName } = req.body;

    try {
      const { data, error } = await supabase.storage
        .from("receipts")
        .upload(fileName, file);

      if (error) throw error;

      res.status(200).json({ url: data.path });
    } catch (error) {
      res.status(500).json({ message: "An error occurred while uploading the file" });
    }
  } else {
    res.status(405).json({ message: "Method not allowed" });
  }
}
