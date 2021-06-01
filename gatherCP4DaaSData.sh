mkdir -p csv

export TOKEN=$(ibmcloud iam oauth-tokens | grep Bearer | cut -d ' ' -f5)
node gatherCP4DaaSData.js > ./csv/cp4daas_data.csv
