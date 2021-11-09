#!/bin/bash

ACCOUNT_PREFIX=$1
echo "Setup for Account $ACCOUNT_PREFIX"
# Captura Account ID e Token
export TOKEN=$(ibmcloud iam oauth-tokens | cut -d " " -f 5)
#export ACCOUNT_ID=$(ibmcloud target | grep "Account: " | cut -d "(" -f2 | cut -d ")" -f1)
export ACCOUNT_ID=$(ibmcloud account list | grep "$ACCOUNT_PREFIX" | cut -d " " -f1)

# Configura Account ID e CF endpoint (por enquanto Dallas)
ibmcloud target -c $ACCOUNT_ID --cf-api https://api.us-south.cf.cloud.ibm.com/
export UAA_TOKEN=$(ibmcloud iam oauth-tokens | grep UAA | cut -d " " -f5)
#ibmcloud target -c $ACCOUNT_ID

echo "Getting IAM policies for account id $ACCOUNT_ID"
# Policies da conta:
curl -X GET "https://iam.cloud.ibm.com/v1/policies?account_id=$ACCOUNT_ID" -H "Authorization: Bearer $TOKEN" -H 'Content-Type: application/json' -o policies.json

set -x 

# Desabilita update checks
ibmcloud config --check-version=false

# Access groups:
ibmcloud iam access-groups --output json > groups.json

# Access Groups Members
set +x
for i in $(ibmcloud iam access-groups --output json | grep AccessGroupId | cut -d '"' -f4); 
do 
   echo "Getting members for access group id $i"
   curl -X GET "https://iam.cloud.ibm.com/v2/groups/$i/members?limit=100" -H "Authorization: $TOKEN" -H 'Content-Type: application/json' -o ${i}_members.json; 
   sleep 1
done

set -x
# Resource groups:
ibmcloud resource groups --output json > resource_groups.json

# Recursos da conta:
ibmcloud resource service-instances --output json > resources.json

# Clusters
ibmcloud ks cluster ls -s --json > clusters.json

# Usuarios:
ibmcloud account users --output json > users.json

# Account orgs
ibmcloud account orgs --output json > account_orgs.json

# Global Search for networking resources
#ibmcloud resource search "family:is" --output json > vpc_resources.json
ibmcloud resource search "type:dedicated OR type:gateway" --output json > networking_resources.json
ibmcloud resource search "type:vmware*" --output json > vmware_resources.json

# Trusted Profiles
ibmcloud iam trusted-profiles --output json > trusted_profiles.json

## Dados Cloud Foundry (orgs/spaces)
set +x

echo "Getting VPC information through Global Search..."
curl -X POST "https://api.global-search-tagging.cloud.ibm.com/v3/resources/search?limit=1000&account_id=$ACCOUNT_ID" -H "authorization: Bearer $TOKEN" -d '{"query" : "family:is", "fields" : ["*"]}' -H "Content-Type: application/json"  > vpc_resources.json

echo "Getting CF orgs and spaces..."
curl -X GET "https://api.us-south.cf.cloud.ibm.com/v2/organizations" -H "Authorization: bearer ${UAA_TOKEN}" -o organizations.json
curl -X GET "https://api.us-south.cf.cloud.ibm.com/v2/spaces" -H "Authorization: bearer ${UAA_TOKEN}" -o spaces.json

for i in `cat organizations.json | grep '"guid"' | cut -d '"' -f4 `
do
    echo "Getting managers, billing managers and auditors for org ${i}"
    curl -X GET "https://api.us-south.cf.cloud.ibm.com/v2/organizations/${i}/managers" -H "Authorization: bearer ${UAA_TOKEN}" -o org_${i}_managers.json
    curl -X GET "https://api.us-south.cf.cloud.ibm.com/v2/organizations/${i}/billing_managers" -H "Authorization: bearer ${UAA_TOKEN}" -o org_${i}_billing_managers.json
    curl -X GET "https://api.us-south.cf.cloud.ibm.com/v2/organizations/${i}/auditors" -H "Authorization: bearer ${UAA_TOKEN}" -o org_${i}_auditors.json
    sleep 1
done

for i in `cat spaces.json | grep '"guid"' | cut -d '"' -f4 `
do
    echo "Getting managers, developers and auditors for space ${i}"
    curl -X GET "https://api.us-south.cf.cloud.ibm.com/v2/spaces/${i}/managers" -H "Authorization: bearer ${UAA_TOKEN}" -o space_${i}_managers.json
    curl -X GET "https://api.us-south.cf.cloud.ibm.com/v2/spaces/${i}/developers" -H "Authorization: bearer ${UAA_TOKEN}" -o space_${i}_developers.json
    curl -X GET "https://api.us-south.cf.cloud.ibm.com/v2/spaces/${i}/auditors" -H "Authorization: bearer ${UAA_TOKEN}" -o space_${i}_auditors.json
    sleep 1
done

echo "Loading CF apps..."
curl -X GET "https://api.us-south.cf.cloud.ibm.com/v2/apps" -H "Authorization: bearer ${UAA_TOKEN}" -o cfapps.json
## Load CF Apps

set -x

# Joga para diretorio data
rm -vfr data/

mkdir data

mv *.json ./data

set +x
echo
echo "-------------------------------------------------------------------------"

echo "Data snapshot successfully taken."
echo "Now you can start typing commands to generate text reports about policies:"
echo "node policiesForResource.js [<ResourceName1> <ResourceName2> ...]"
echo "node resourceAccessForUser.js [<UserEmail1> <UserEmail2> ...]"
echo "node policiesForRole.js <Role1> [<Role2> ...]"
echo "node latestUserLogin.js <LogDNA_Export_Key>"
echo "node policiesByUserAndAccessGroup.js [<UserEmail> <UserEmail2> ...]"
echo "node policiesForService.js [<Service1> <Service2> ...]"
echo "node cfUserPolicies.js [<UserEmail> <UserEmail2> ...]"
echo "Check out README files for additional information"
echo "Please share your feedback at marcosbv@br.ibm.com. Have fun!"
