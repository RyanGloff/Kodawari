curl http://localhost:3000/api/task \
-X POST \
-H "Content-Type: application/json" \
-d "{\"name\": \"Severe\", \"deadline\": \"$(date -d "+1 days")\"}"

curl http://localhost:3000/api/task \
-X POST \
-H "Content-Type: application/json" \
-d "{\"name\": \"Warning\", \"deadline\": \"$(date -d "+10 days")\"}"

curl http://localhost:3000/api/task \
-X POST \
-H "Content-Type: application/json" \
-d "{\"name\": \"Green\", \"deadline\": \"$(date -d "+365 days")\"}"

curl http://localhost:3000/api/task \
-X POST \
-H "Content-Type: application/json" \
-d '{"name": "No Deadline"}'

COMPLETED_TASK_ID="$(curl http://localhost:3000/api/task \
-X POST \
-H "Content-Type: application/json" \
-d '{"name": "Completed"}' |
jq -r '.id')"

echo "Created task with id: ${COMPLETED_TASK_ID}"

curl http://localhost:3000/api/task/${COMPLETED_TASK_ID}/complete \
-X POST \
-H "Content-Type: application/json" \
-d '{"expectedRevision": "0"}'

COMPLETED_TASK_ID="$(curl http://localhost:3000/api/task \
-X POST \
-H "Content-Type: application/json" \
-d '{"name": "Deleted"}' |
jq -r '.id')"

echo "Created task with id: ${COMPLETED_TASK_ID}"

curl http://localhost:3000/api/task/${COMPLETED_TASK_ID} \
-X DELETE \
