#!/bin/bash
########################################################################################
##  This shell script generates CSV files containing policy reports.
##  Those files are zipped into a file named policyReports.tar.gz.
##  If this command is run from IBM Cloud Shell the tar.gz file can be downloaded using 
##  IBM Cloud Shell UI.
##
## Params: 
## LogDNA Activity Tracker export key for latest user login report generation
## Example:  ./generateReports.sh dd5accde65d643629e64b77dd 
########################################################################################
set -x

# Run reports 
mkdir -p csv
set +x
for i in latestUserLogin.js policiesForResource.js policiesForRole.js resourceAccessForUser.js policiesByUserAndAccessGroup.js policiesForService.js
do
    
    CSV_FILE=$( echo $i | cut -d "." -f1 ).csv
    echo "Generating file $CSV_FILE"

    if [ $i == "latestUserLogin.js" ]
    then
       node $i --csv $1 > ./csv/$CSV_FILE
    elif [ $i == "policiesForRole.js" ]
    then
       node $i --csv Administrator Manager > ./csv/$CSV_FILE
    elif [ $i == "policiesForService.js" ]
    then
       node $i --csv account > ./csv/account_policies.csv
    else
       node $i --csv > ./csv/$CSV_FILE 
    fi

done

set -x
# Generates a tar.gz file
tar -zcvf policyReports.tar.gz ./csv


