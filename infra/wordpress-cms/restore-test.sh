#!/usr/bin/env bash
set -uo pipefail
D=/data/coolify/backups/databases/root-team-0/noa-wp-mysql-pilolo1nw5krlso5azw5u9hl
F=$(ls -t $D/*.dmp | head -1); echo "dump=$(basename "$F") bytes=$(stat -c %s "$F")"
docker run -d --rm --name noa-restore-test --network none -e MYSQL_ROOT_PASSWORD=restoretest -e MYSQL_DATABASE=restore_check mysql:8.4.13 >/dev/null
for i in $(seq 1 80); do docker logs noa-restore-test 2>&1 | grep -q 'ready for connections.*port: 3306' && break; sleep 3; done; sleep 2
timeout 120 docker exec -i noa-restore-test mysql -uroot -prestoretest restore_check < "$F" 2>&1 | grep -v Warning
Q="select count(*) from information_schema.tables where table_schema=DATABASE(); select option_value from wp_options where option_name in ('blogname','siteurl','timezone_string') order by option_name; select count(*) from wp_users; select count(*) from wp_posts;"
R=$(docker exec noa-restore-test mysql -uroot -prestoretest restore_check -N -e "$Q" 2>/dev/null | tr '\n' '|')
L=$(docker exec -e MYSQL_PWD="$(cat /srv/eljaymedia/secrets/newsonafrica/mysql-noa_wp-password)" pilolo1nw5krlso5azw5u9hl mysql -unoa_wp -h127.0.0.1 newsonafrica_wp -N -e "$Q" 2>/dev/null | tr '\n' '|')
echo "restored: $R"; echo "live:     $L"; [ -n "$R" ] && [ "$R" = "$L" ] && echo "RESTORE MATCH" || echo "RESTORE DIFF"
docker rm -f noa-restore-test >/dev/null; echo cleaned
