import { createClient } from "@supabase/supabase-js";
const supabaseUrl = "https://edhhzihroqofekxjpebp.supabase.co";
const supabaseKey =
  "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImVkaGh6aWhyb3FvZmVreGpwZWJwIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjYxMTAyMzgsImV4cCI6MjA4MTY4NjIzOH0.oZg8lFKzVqtdAaW4CjrkMouDnyzjFuSNmv6DNXt7hM4";
export const supabase = createClient(supabaseUrl, supabaseKey);
