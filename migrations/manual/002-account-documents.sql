-- Development branch only. Run all statements in one transaction; never on app startup.
CREATE TABLE ziiply_accounts.documents (
  user_id text NOT NULL,
  id uuid NOT NULL,
  revision integer NOT NULL CHECK (revision > 0),
  snapshot jsonb NOT NULL CHECK (snapshot->>'version' = '1'),
  updated_at timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY (user_id, id),
  CHECK (octet_length(snapshot::text) <= 256000)
);
-- statement-breakpoint
ALTER TABLE ziiply_accounts.documents ENABLE ROW LEVEL SECURITY;
-- statement-breakpoint
CREATE TABLE ziiply_accounts.document_mutations (
  user_id text NOT NULL,
  mutation_id uuid NOT NULL,
  document_id uuid NOT NULL,
  request_body jsonb NOT NULL,
  response jsonb NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY (user_id, mutation_id),
  FOREIGN KEY (user_id, document_id) REFERENCES ziiply_accounts.documents (user_id, id)
);
-- statement-breakpoint
ALTER TABLE ziiply_accounts.document_mutations ENABLE ROW LEVEL SECURITY;
-- statement-breakpoint
CREATE FUNCTION ziiply_accounts.save_document(p_user text, p_id uuid, p_mutation uuid, p_expected integer, p_snapshot jsonb)
RETURNS jsonb LANGUAGE plpgsql SECURITY INVOKER SET search_path = pg_catalog, ziiply_accounts AS $$
DECLARE
  prior ziiply_accounts.document_mutations%ROWTYPE;
  current_doc ziiply_accounts.documents%ROWTYPE;
  saved ziiply_accounts.documents%ROWTYPE;
  request_payload jsonb;
  next_snapshot jsonb;
  result jsonb;
BEGIN
  -- Serialize this user's writes, including reuse of a mutation ID for a different document.
  PERFORM pg_advisory_xact_lock(hashtextextended(p_user, 0));
  request_payload := jsonb_build_object('id',p_id,'expectedRevision',p_expected,'snapshot',p_snapshot);
  SELECT * INTO prior FROM ziiply_accounts.document_mutations WHERE user_id=p_user AND mutation_id=p_mutation;
  IF FOUND THEN
    IF prior.request_body <> request_payload THEN RETURN jsonb_build_object('outcome','mutation_conflict'); END IF;
    RETURN prior.response || jsonb_build_object('replayed',true);
  END IF;
  SELECT * INTO current_doc FROM ziiply_accounts.documents WHERE user_id=p_user AND id=p_id FOR UPDATE;
  IF COALESCE(current_doc.revision,0) <> p_expected THEN
    RETURN jsonb_build_object('outcome','conflict','revision',COALESCE(current_doc.revision,0));
  END IF;
  next_snapshot := jsonb_build_object('version',1,'values',COALESCE(current_doc.snapshot->'values','{}'::jsonb) || (p_snapshot->'values'));
  IF octet_length(next_snapshot::text)>256000 THEN RETURN jsonb_build_object('outcome','too_large'); END IF;
  INSERT INTO ziiply_accounts.documents (user_id,id,revision,snapshot)
    VALUES (p_user,p_id,1,next_snapshot)
    ON CONFLICT (user_id,id) DO UPDATE SET revision=ziiply_accounts.documents.revision+1,snapshot=EXCLUDED.snapshot,updated_at=now()
    RETURNING * INTO saved;
  result := jsonb_build_object('outcome','saved','replayed',false,'document',jsonb_build_object('id',saved.id,'revision',saved.revision,'snapshot',saved.snapshot,'updatedAt',saved.updated_at));
  INSERT INTO ziiply_accounts.document_mutations(user_id,mutation_id,document_id,request_body,response)
    VALUES(p_user,p_mutation,p_id,request_payload,result);
  RETURN result;
END;
$$;
-- statement-breakpoint
REVOKE ALL ON FUNCTION ziiply_accounts.save_document(text,uuid,uuid,integer,jsonb) FROM PUBLIC;
