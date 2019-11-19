#!/bin/bash
########################################################################################
##  This shell script generates CSV files containing policy reports and upload them to 
##  a IBM Cloud Object Storage instance
##
##  Params: CRN of COS instance,
##          region where COS is deployed,
##          bucket name and
##          LogDNA Activity Tracker export key for latest user login report generation
## Example:  ./saveAndUploadCSVReports.sh 'crn:v1:bluemix:public:cloud-object-storage:global:a/ACCOUNT:RESOURCE::' sao01 policy-reports-bucker dd5accde65d643629e64b77dd 
########################################################################################
set -x
# Install COS plugin (Web Terminal)
ibmcloud plugin install cloud-object-storage

# Setup CRN of Object Storage Instance (parameter 1)
ibmcloud cos config crn --crn $1

# Setup region (sao01)
ibmcloud cos config region --region $2

# Run reports 
mkdir -p csv
set +x
for i in latestUserLogin.js policiesForResource.js policiesForRole.js resourceAccessForUser.js
do
    
    CSV_FILE=$( echo $i | cut -d "." -f1 ).csv
    echo "Generating file $CSV_FILE"

    if [ $i == "latestUserLogin.js" ]
    then
       node $i --csv $4 > ./csv/$CSV_FILE
    elif [ $i == "policiesForRole.js" ]
    then
       node $i --csv Administrator Manager > ./csv/$CSV_FILE
    else
       node $i --csv > ./csv/$CSV_FILE 
    fi

done

set -x
# Generates a tar file and uploads it to COS
tar -zcvf policyReports.tar.gz ./csv
ibmcloud cos upload --bucket $3 --key policyReports.tar.gz --file policyReports.tar.gz && rm -vfr policyReports.tar.gz ./csv/*




