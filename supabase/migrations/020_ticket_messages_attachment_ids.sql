-- Array des ticket_documents attachés à un message OUTBOUND (accord propriétaire avec
-- devis PDF, facture pour clôture, photos jointes en réponse manuelle, etc.).
--
-- Pour les messages INBOUND, le lien se fait via ticket_documents.ticket_message_id
-- (un doc appartient à UN mail reçu). Pour les OUTBOUND on utilise ce champ parce
-- qu'un même devis peut être envoyé dans plusieurs mails successifs au proprio.
--
-- Valeur par défaut NULL : les vieux messages outbound n'auront pas cette info —
-- acceptable, l'UI tolère l'absence. Seuls les nouveaux envois seront enrichis.

ALTER TABLE ticket_messages
  ADD COLUMN IF NOT EXISTS attachment_document_ids uuid[];

-- ────────────────────────────────────────────────────────────────────────────
-- ROLLBACK
-- ────────────────────────────────────────────────────────────────────────────
-- ALTER TABLE ticket_messages DROP COLUMN IF EXISTS attachment_document_ids;
