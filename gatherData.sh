#!/bin/bash

ACCOUNT_PREFIX=$1
echo "Setup for Account $ACCOUNT_PREFIX"
# Captura Account ID e Token
export TOKEN=$(ibmcloud iam oauth-tokens | cut -d " " -f 5)
#export ACCOUNT_ID=$(ibmcloud target | grep "Account: " | cut -d "(" -f2 | cut -d ")" -f1)
export ACCOUNT_ID=$(ibmcloud account list | grep "$ACCOUNT_PREFIX" | cut -d " " -f1)

# Configura Account ID
ibmcloud target -c $ACCOUNT_ID

echo "Getting IAM policies for account id $ACCOUNT_ID"
# Policies da conta:
curl -X GET "https://iam.cloud.ibm.com/v1/policies?account_id=$ACCOUNT_ID" -H "Authorization: Bearer $TOKEN" -H 'Content-Type: application/json' -o policies.json

set -x 
# Access groups:
ibmcloud iam access-groups --output json > groups.json

# Access Groups Members
set +x
for i in $(ibmcloud iam access-groups --output json | grep AccessGroupId | cut -d '"' -f4); 
do 
   echo "Getting members for access group id $i"
   curl -X GET "https://iam.cloud.ibm.com/v2/groups/$i/members?limit=100" -H "Authorization: $TOKEN" -H 'Content-Type: application/json' -o ${i}_members.json; 
done

set -x
# Resource groups:
ibmcloud resource groups --output json > resource_groups.json

# Recursos da conta:
ibmcloud resource service-instances --output json > resources.json

# Clusters
ibmcloud ks clusters --json > clusters.json

# Usuarios:
ibmcloud account users --output json > users.json

# Joga para diretorio data
rm -vfr data/

mkdir data

mv *.json ./data
