#!/usr/bin/env bash
# Load NOA R2 credentials from root-only files into the Coolify service env and restart.
# Never prints secret values (only lengths / sha256 prefixes).
set -euo pipefail
S=/srv/eljaymedia/secrets/newsonafrica
SVC=fv3fqo7fe0dryfdgho4xcceg
T=$(cat /srv/eljaymedia/secrets/coolify/api-token)
ak=$(tr -d '\r\n' < $S/r2-access-key-id); sk=$(tr -d '\r\n' < $S/r2-secret-access-key)
if [ -s $S/r2-account-id ]; then acct=$(tr -d '\r\n' < $S/r2-account-id); else
  acct=$(docker exec coolify-db psql -U coolify -d coolify -At -c "select endpoint from s3_storages where id=1" | sed -E 's#https://([0-9a-f]{32})\.r2\.cloudflarestorage\.com.*#\1#'); fi
[[ $acct =~ ^[0-9a-f]{32}$ ]] || { echo "bad account id"; exit 1; }
[ ${#ak} -eq 32 ] || { echo "access key id length ${#ak}, expected 32"; exit 1; }
[ ${#sk} -eq 64 ] || { echo "secret length ${#sk}, expected 64"; exit 1; }
for kv in "NOA_R2_ACCOUNT_ID=$acct" "NOA_R2_ACCESS_KEY_ID=$ak" "NOA_R2_SECRET_ACCESS_KEY=$sk"; do
  k=${kv%%=*}; v=${kv#*=}
  jq -n --arg k "$k" --arg v "$v" '{key:$k,value:$v,is_preview:false}' | curl -fsS -o /dev/null -X PATCH -H "Authorization: Bearer $T" -H 'Content-Type: application/json' --data @- "http://127.0.0.1:8000/api/v1/services/$SVC/envs"
  echo "$k set (sha256 $(printf %s "$v" | sha256sum | cut -c1-12))"
done
curl -fsS -X POST -H "Authorization: Bearer $T" "http://127.0.0.1:8000/api/v1/services/$SVC/restart?latest=false"; echo
