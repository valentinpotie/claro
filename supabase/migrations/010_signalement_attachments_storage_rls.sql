-- Allow agency members to SELECT storage files placed at
-- ticket-documents/inbound-{inboundEmailId}/*  during the signalement flow (before
-- the ticket exists). Matches on foldername[1] starting with "inbound-" then checks
-- the remaining uuid is an inbound_emails row belonging to the user's agency.
CREATE POLICY "Agency members read their signalement attachments"
  ON storage.objects FOR SELECT
  USING (
    bucket_id = 'ticket-documents'
    AND (storage.foldername(name))[1] LIKE 'inbound-%'
    AND substring((storage.foldername(name))[1] FROM 9)::uuid IN (
      SELECT id FROM inbound_emails
      WHERE agency_id IN (
        SELECT agency_id FROM profiles WHERE id = auth.uid()
      )
    )
  );
