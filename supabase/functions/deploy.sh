#!/usr/bin/env bash
# Deploy helper — évite l'oubli du flag --no-verify-jwt qui cause systématiquement
# des 401 en prod (Resend webhook, cron send-reminders, appels frontend, etc.).
#
# Toutes nos edge functions gèrent leur propre authentification en interne :
#   - inbound-email : accepte n'importe quoi (webhook Resend sans auth header)
#   - classify-reply : appelée en interne avec service_role, pas de user session
#   - send-ticket-email : accepte user JWT OU service_role key (vérifie dans le code)
#   - send-reminders : appelée en interne, idem classify-reply
#
# La gateway Supabase ne doit donc JAMAIS vérifier les JWTs — c'est notre code qui
# le fait avec plus de nuance.
#
# Usage :
#   ./supabase/functions/deploy.sh                    # déploie les 4 fonctions
#   ./supabase/functions/deploy.sh send-ticket-email  # déploie une fonction précise

set -euo pipefail

PROJECT_REF="wqpeabufodrssmbqaiid"
FUNCTIONS=("inbound-email" "classify-reply" "send-ticket-email" "send-reminders")

if [ $# -gt 0 ]; then
  FUNCTIONS=("$@")
fi

cd "$(dirname "$0")/../.."

echo "→ Déploiement sur $PROJECT_REF : ${FUNCTIONS[*]}"
supabase functions deploy "${FUNCTIONS[@]}" --project-ref "$PROJECT_REF" --no-verify-jwt

echo "✓ Déploiement terminé — toutes les fonctions sont avec verify_jwt=false"
