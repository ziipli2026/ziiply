CREATE TABLE IF NOT EXISTS public.ziiply_beta_feedback (
  id bigint GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  user_id uuid REFERENCES public.ziiply_beta_users(id) ON DELETE SET NULL,
  message text NOT NULL CHECK (char_length(btrim(message)) BETWEEN 1 AND 4000),
  created_at timestamptz NOT NULL DEFAULT now()
);
