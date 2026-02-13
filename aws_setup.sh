#!/bin/zsh

export AWS_DEFAULT_REGION=ap-northeast-1
export AWS_REGION=ap-northeast-1
export AWS_SECRET_ACCESS_KEY=dummy
export AWS_ACCESS_KEY_ID=dummy
export DYNAMODB_ENDPOINT=http://dynamodb-local:8000
export TABLE_NAME=wisaw-submissions

sudo service docker start
docker compose up -d

aws dynamodb create-table --endpoint-url http://localhost:8000 --table-name wisaw-submissions --attribute-definitions AttributeName=pk,AttributeType=S --key-schema AttributeName=pk,KeyType=HASH --billing-mode PAY_PER_REQUEST --region ap-northeast-1
aws dynamodb list-tables --endpoint-url http://localhost:8000
