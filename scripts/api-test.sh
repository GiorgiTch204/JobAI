#!/bin/bash
# End-to-end API checks against a running JobAI server.
# Usage: bash scripts/api-test.sh [base-url]   (default http://localhost:3000)
B=${1:-http://localhost:3000}
PASS=0; FAIL=0
J_USER=/tmp/jar_user.txt; J_ADMIN=/tmp/jar_admin.txt; J_NEW=/tmp/jar_new.txt
rm -f $J_USER $J_ADMIN $J_NEW

ck() { # ck "name" "expected_substring" "actual"
  if echo "$3" | grep -q "$2"; then echo "  ok   $1"; PASS=$((PASS+1));
  else echo "  FAIL $1"; echo "       want: $2"; echo "       got : $(echo "$3" | head -c 300)"; FAIL=$((FAIL+1)); fi
}
code() { # code "name" expected url [curl args...]
  local name="$1" exp="$2" url="$3"; shift 3
  local got=$(curl -s -o /dev/null -w "%{http_code}" "$url" "$@")
  if [ "$got" = "$exp" ]; then echo "  ok   $name ($got)"; PASS=$((PASS+1));
  else echo "  FAIL $name — want $exp got $got"; FAIL=$((FAIL+1)); fi
}

echo "— public surface —"
ck "health" '"status":"healthy"' "$(curl -s $B/api/health)"
ck "jobs list is public" '"ok":true' "$(curl -s $B/api/jobs)"
ck "open jobs only" '"total":15' "$(curl -s $B/api/jobs?perPage=50)"
ck "search filter" '"total":1' "$(curl -s '$B/api/jobs?search=internship' 2>/dev/null || curl -s "$B/api/jobs?employmentType=INTERNSHIP")"
ck "facets on request" '"facets"' "$(curl -s "$B/api/jobs?facets=1")"
ck "no match data when signed out" '"resumeUsed":null' "$(curl -s $B/api/jobs)"

echo "— auth guards —"
code "GET /api/auth/me needs a session" 401 "$B/api/auth/me"
code "GET /api/resumes needs a session" 401 "$B/api/resumes"
code "GET /api/admin/users needs a session" 401 "$B/api/admin/users"
code "POST /api/jobs needs admin" 401 "$B/api/jobs" -X POST -H 'Content-Type: application/json' -d '{}'

echo "— registration validation —"
ck "weak password rejected" 'at least 8 characters' "$(curl -s -X POST $B/api/auth/register -H 'Content-Type: application/json' -d '{"name":"Test User","email":"t1@test.dev","password":"short"}')"
ck "password needs a number" 'at least one number' "$(curl -s -X POST $B/api/auth/register -H 'Content-Type: application/json' -d '{"name":"Test User","email":"t1@test.dev","password":"passwordpassword"}')"
ck "bad email rejected" 'email address' "$(curl -s -X POST $B/api/auth/register -H 'Content-Type: application/json' -d '{"name":"Test User","email":"nope","password":"Password1"}')"
ck "short name rejected" 'full name' "$(curl -s -X POST $B/api/auth/register -H 'Content-Type: application/json' -d '{"name":"T","email":"t1@test.dev","password":"Password1"}')"
ck "field errors are keyed" '"fields"' "$(curl -s -X POST $B/api/auth/register -H 'Content-Type: application/json' -d '{"name":"T","email":"nope","password":"x"}')"
ck "non-JSON body handled" '"ok":false' "$(curl -s -X POST $B/api/auth/register -H 'Content-Type: application/json' -d 'not json')"

echo "— register a real account —"
REG=$(curl -s -c $J_NEW -X POST $B/api/auth/register -H 'Content-Type: application/json' -d '{"name":"Ana Test","email":"ana.test@jobai.dev","password":"Password1"}')
ck "account created" '"message":"Account created."' "$REG"
ck "role defaults to USER" '"role":"USER"' "$REG"
ck "password hash never returned" '^0$' "$(echo "$REG" | grep -c 'passwordHash\|password_hash')"
ck "session cookie is httpOnly" 'HttpOnly' "$(grep -i jobai_session $J_NEW | head -1; grep -c '#HttpOnly_' $J_NEW >/dev/null && echo HttpOnly)"
ck "duplicate email refused" 'already has an account' "$(curl -s -X POST $B/api/auth/register -H 'Content-Type: application/json' -d '{"name":"Ana Test","email":"ana.test@jobai.dev","password":"Password1"}')"
ck "new session reads /me" '"ana.test@jobai.dev"' "$(curl -s -b $J_NEW $B/api/auth/me)"
ck "/me carries stats" '"hasResume":false' "$(curl -s -b $J_NEW $B/api/auth/me)"

echo "— login —"
ck "wrong password refused" 'do not match' "$(curl -s -X POST $B/api/auth/login -H 'Content-Type: application/json' -d '{"email":"demo@jobai.dev","password":"wrong"}')"
ck "unknown email gives same message" 'do not match' "$(curl -s -X POST $B/api/auth/login -H 'Content-Type: application/json' -d '{"email":"ghost@nowhere.dev","password":"whatever"}')"
LOGIN=$(curl -s -c $J_USER -X POST $B/api/auth/login -H 'Content-Type: application/json' -d '{"email":"demo@jobai.dev","password":"Demo12345"}')
ck "member signs in" '"message":"Signed in."' "$LOGIN"
ck "email is case-insensitive" '"ok":true' "$(curl -s -X POST $B/api/auth/login -H 'Content-Type: application/json' -d '{"email":"DEMO@JOBAI.DEV","password":"Demo12345"}')"
ADMIN=$(curl -s -c $J_ADMIN -X POST $B/api/auth/login -H 'Content-Type: application/json' -d '{"email":"admin@jobai.dev","password":"Admin12345"}')
ck "admin signs in" '"role":"ADMIN"' "$ADMIN"

echo "— member data —"
ck "jobs now carry a match score" '"match":{"score"' "$(curl -s -b $J_USER $B/api/jobs)"
ck "jobs show applied status" '"applicationStatus"' "$(curl -s -b $J_USER $B/api/jobs)"
ck "resume list" '"resumes":\[{' "$(curl -s -b $J_USER $B/api/resumes)"
ck "applications list" '"total":3' "$(curl -s -b $J_USER $B/api/applications)"
ck "score endpoint" '"score"' "$(curl -s -b $J_USER -X POST $B/api/cv/score -H 'Content-Type: application/json' -d '{}')"
ck "optimize endpoint rewrites" '"optimized":"Owned' "$(curl -s -b $J_USER -X POST $B/api/cv/optimize -H 'Content-Type: application/json' -d '{"text":"Responsible for the checkout page"}')"
ck "summary draft" '"summary"' "$(curl -s -b $J_USER -X POST $B/api/cv/summary -H 'Content-Type: application/json' -d '{}')"
ck "sessions listed" '"current":true' "$(curl -s -b $J_USER $B/api/auth/sessions)"

echo "— apply flow —"
JOB=$(curl -s -b $J_USER "$B/api/jobs?perPage=50" | python3 -c "
import json,sys
data=json.load(sys.stdin)
free=[j for j in data['jobs'] if not j.get('applicationStatus')]
print(free[0]['id'])")
ck "apply succeeds" '"message":"Application sent' "$(curl -s -b $J_USER -X POST $B/api/jobs/$JOB/apply -H 'Content-Type: application/json' -d '{"coverLetter":"I would like to apply."}')"
ck "duplicate apply refused" 'already applied' "$(curl -s -b $J_USER -X POST $B/api/jobs/$JOB/apply -H 'Content-Type: application/json' -d '{}')"
ck "apply without a CV refused" 'before you apply' "$(curl -s -b $J_NEW -X POST $B/api/jobs/$JOB/apply -H 'Content-Type: application/json' -d '{}')"
code "apply to unknown job 404s" 404 "$B/api/jobs/job_nope/apply" -b $J_USER -X POST -H 'Content-Type: application/json' -d '{}'
ck "save a job" '"saved":true' "$(curl -s -b $J_USER -X POST $B/api/jobs/$JOB/save)"
ck "unsave a job" '"saved":false' "$(curl -s -b $J_USER -X DELETE $B/api/jobs/$JOB/save)"

echo "— ownership isolation —"
MY_CV=$(curl -s -b $J_USER $B/api/resumes | python3 -c "import json,sys; print(json.load(sys.stdin)['resumes'][0]['id'])")
code "another member cannot read my CV" 404 "$B/api/resumes/$MY_CV" -b $J_NEW
code "another member cannot edit my CV" 404 "$B/api/resumes/$MY_CV" -b $J_NEW -X PATCH -H 'Content-Type: application/json' -d '{"summary":"hacked"}'
code "another member cannot delete my CV" 404 "$B/api/resumes/$MY_CV" -b $J_NEW -X DELETE
MY_APP=$(curl -s -b $J_USER $B/api/applications | python3 -c "import json,sys; print(json.load(sys.stdin)['applications'][0]['id'])")
code "another member cannot read my application" 404 "$B/api/applications/$MY_APP" -b $J_NEW
code "member cannot reach admin users" 403 "$B/api/admin/users" -b $J_USER
code "member cannot reach admin overview" 403 "$B/api/admin/overview" -b $J_USER
code "member cannot post a job" 403 "$B/api/jobs" -b $J_USER -X POST -H 'Content-Type: application/json' -d '{"title":"x","company":"y","location":"z","description":"'"$(printf 'd%.0s' {1..40})"'"}'

echo "— résumé CRUD —"
NEW_CV=$(curl -s -b $J_NEW -X POST $B/api/resumes -H 'Content-Type: application/json' -d '{"title":"My first CV","fullName":"Ana Test","summary":"Junior developer looking for a first role in web development, currently finishing a bootcamp.","skills":["HTML","CSS","JavaScript"]}')
ck "resume created with a score" '"atsScore"' "$NEW_CV"
ck "first resume is primary" '"isPrimary":true' "$NEW_CV"
NEW_CV_ID=$(echo "$NEW_CV" | python3 -c "import json,sys; print(json.load(sys.stdin)['resume']['id'])")
ck "resume update rescores" '"report"' "$(curl -s -b $J_NEW -X PATCH $B/api/resumes/$NEW_CV_ID -H 'Content-Type: application/json' -d '{"skills":["HTML","CSS","JavaScript","React","Git","Node.js","SQL","Figma"]}')"
ck "resume validation rejects a long summary" '"ok":false' "$(curl -s -b $J_NEW -X PATCH $B/api/resumes/$NEW_CV_ID -H 'Content-Type: application/json' -d '{"summary":"'"$(printf 'x%.0s' {1..1300})"'"}')"
ck "second resume is not primary" '"isPrimary":false' "$(curl -s -b $J_NEW -X POST $B/api/resumes -H 'Content-Type: application/json' -d '{"title":"Variant"}')"
ck "set primary" 'now your primary CV' "$(curl -s -b $J_NEW -X POST $B/api/resumes/$NEW_CV_ID/primary)"

echo "— admin —"
ck "overview totals" '"totals"' "$(curl -s -b $J_ADMIN $B/api/admin/overview)"
ck "overview has a series" '"series"' "$(curl -s -b $J_ADMIN $B/api/admin/overview)"
ck "users list with counts" '"applicationCount"' "$(curl -s -b $J_ADMIN $B/api/admin/users)"
ck "user search" '"total":1' "$(curl -s -b $J_ADMIN "$B/api/admin/users?search=nino")"
USER_ID=$(curl -s -b $J_ADMIN "$B/api/admin/users?search=nino" | python3 -c "import json,sys; print(json.load(sys.stdin)['users'][0]['id'])")
ck "user dossier" '"resumes"' "$(curl -s -b $J_ADMIN $B/api/admin/users/$USER_ID)"
ck "dossier has sessions" '"sessions"' "$(curl -s -b $J_ADMIN $B/api/admin/users/$USER_ID)"
ck "suspend a member" '"status":"SUSPENDED"' "$(curl -s -b $J_ADMIN -X PATCH $B/api/admin/users/$USER_ID -H 'Content-Type: application/json' -d '{"status":"SUSPENDED"}')"
ck "reactivate a member" '"status":"ACTIVE"' "$(curl -s -b $J_ADMIN -X PATCH $B/api/admin/users/$USER_ID -H 'Content-Type: application/json' -d '{"status":"ACTIVE"}')"
ADMIN_ID=$(curl -s -b $J_ADMIN $B/api/auth/me | python3 -c "import json,sys; print(json.load(sys.stdin)['user']['id'])")
ck "admin cannot demote themselves" 'your own admin access' "$(curl -s -b $J_ADMIN -X PATCH $B/api/admin/users/$ADMIN_ID -H 'Content-Type: application/json' -d '{"role":"USER"}')"
ck "admin cannot suspend themselves" 'your own account' "$(curl -s -b $J_ADMIN -X PATCH $B/api/admin/users/$ADMIN_ID -H 'Content-Type: application/json' -d '{"status":"SUSPENDED"}')"
ck "admin cannot delete themselves" 'your own account' "$(curl -s -b $J_ADMIN -X DELETE $B/api/admin/users/$ADMIN_ID)"
ck "applications with status tally" '"byStatus"' "$(curl -s -b $J_ADMIN $B/api/admin/applications)"
APP_ID=$(curl -s -b $J_ADMIN $B/api/admin/applications | python3 -c "import json,sys; print(json.load(sys.stdin)['applications'][0]['id'])")
ck "status change" '"status":"IN_REVIEW"' "$(curl -s -b $J_ADMIN -X PATCH $B/api/admin/applications -H 'Content-Type: application/json' -d '{"applicationId":"'$APP_ID'","status":"IN_REVIEW","note":"Shortlisted"}')"
ck "invalid status refused" '"ok":false' "$(curl -s -b $J_ADMIN -X PATCH $B/api/admin/applications -H 'Content-Type: application/json' -d '{"applicationId":"'$APP_ID'","status":"BOGUS"}')"
ck "activity log" '"activity"' "$(curl -s -b $J_ADMIN $B/api/admin/activity)"
ck "activity records the apply" 'Applied to' "$(curl -s -b $J_ADMIN "$B/api/admin/activity?search=Applied")"
ck "csv export" 'Email,Role,Status' "$(curl -s -b $J_ADMIN "$B/api/admin/export?dataset=users" | head -1)"
ck "csv export jobs" 'Applications,Tags' "$(curl -s -b $J_ADMIN "$B/api/admin/export?dataset=jobs" | head -1)"
ck "unknown dataset refused" 'Unknown dataset' "$(curl -s -b $J_ADMIN "$B/api/admin/export?dataset=bogus")"

echo "— admin job management —"
NEWJOB=$(curl -s -b $J_ADMIN -X POST $B/api/jobs -H 'Content-Type: application/json' -d '{"title":"Test engineer","company":"Testing Co","location":"Tbilisi, Georgia","workMode":"REMOTE","description":"We are hiring a test engineer to own our automated test suite end to end.","tags":["Playwright"],"salaryMin":"2000","salaryMax":"3000"}')
ck "job created" '"status":"OPEN"' "$NEWJOB"
ck "salary string coerced" '"salaryMin":2000' "$NEWJOB"
NEWJOB_ID=$(echo "$NEWJOB" | python3 -c "import json,sys; print(json.load(sys.stdin)['job']['id'])")
ck "job updated" '"status":"CLOSED"' "$(curl -s -b $J_ADMIN -X PATCH $B/api/jobs/$NEWJOB_ID -H 'Content-Type: application/json' -d '{"status":"CLOSED"}')"
ck "invalid job rejected" 'at least 30 characters' "$(curl -s -b $J_ADMIN -X POST $B/api/jobs -H 'Content-Type: application/json' -d '{"title":"Too short","company":"X","location":"Y","description":"brief"}')"
ck "job deleted" '"message":"Job deleted."' "$(curl -s -b $J_ADMIN -X DELETE $B/api/jobs/$NEWJOB_ID)"
code "deleting twice 404s" 404 "$B/api/jobs/$NEWJOB_ID" -b $J_ADMIN -X DELETE

echo "— withdraw + logout + revocation —"
ck "withdraw own application" '"status":"WITHDRAWN"' "$(curl -s -b $J_USER -X PATCH $B/api/applications/$MY_APP)"
ck "logout" '"message":"Signed out."' "$(curl -s -b $J_USER -c $J_USER -X POST $B/api/auth/logout)"
code "session is dead after logout" 401 "$B/api/auth/me" -b $J_USER

echo "— suspended account cannot sign in —"
ck "suspend Nino" '"status":"SUSPENDED"' "$(curl -s -b $J_ADMIN -X PATCH $B/api/admin/users/$USER_ID -H 'Content-Type: application/json' -d '{"status":"SUSPENDED"}')"
ck "suspended login refused" 'suspended' "$(curl -s -X POST $B/api/auth/login -H 'Content-Type: application/json' -d '{"email":"nino.beridze@example.com","password":"Member12345"}')"
curl -s -b $J_ADMIN -X PATCH $B/api/admin/users/$USER_ID -H 'Content-Type: application/json' -d '{"status":"ACTIVE"}' > /dev/null

echo "— rate limiting —"
for i in $(seq 1 9); do curl -s -o /dev/null -X POST $B/api/auth/login -H 'Content-Type: application/json' -d '{"email":"ratelimit@test.dev","password":"wrong"}'; done
ck "throttled after repeated failures" 'Too many failed attempts' "$(curl -s -X POST $B/api/auth/login -H 'Content-Type: application/json' -d '{"email":"ratelimit@test.dev","password":"wrong"}')"

echo
echo "passed: $PASS   failed: $FAIL"
[ "$FAIL" = "0" ] || exit 1
