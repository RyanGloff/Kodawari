import { Request, Response, NextFunction } from "express";
import { createClient } from "@supabase/supabase-js";

const supabaseUrl = "https://edhhzihroqofekxjpebp.supabase.co";
const supabaseKey = "sb_secret_1mCJBK51JnZdOAKqNu4D2w_PTdqQqGQ";
const supabaseAdmin = createClient(
  supabaseUrl,
  supabaseKey,
  {
    auth: {
      persistSession: false,
    },
  }
);

export async function authenticate(
  req: Request,
  res: Response,
  next: NextFunction
) {
  const authHeader = req.headers.authorization;

  if (!authHeader) {
    return res.status(401).json({ error: "Missing Authorization header" });
  }

  const [scheme, token] = authHeader.split(" ");

  if (scheme !== "Bearer" || !token) {
    return res.status(401).json({ error: "Invalid Authorization format" });
  }

  const { data, error } = await supabaseAdmin.auth.getUser(token);

  if (error || !data.user) {
    return res.status(401).json({ error: "Invalid or expired token" });
  }

  req.user = {
    id: data.user.id,
    email: data.user.email,
    role: data.user.role,
  };

  next();
}

