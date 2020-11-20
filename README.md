# Utility to get policy and user information from IBM Cloud platform

## Description
IBM Cloud provides a flexible way to grant permissions to users to access resources defining policies in *Access Groups* and *Resource Groups*. However, it is not easy to track all users a resource have been granted access to or all resources a user has access based on policies defined at user and access group level.
Auditors expect to have answers to a couple of questions:
* What cloud resources does a user has access to?
* Looking for resource X, what users can view, edit or remove it?
* What users have any kind of Administrator policy set to them?
* What was the user latest login?
* What users can see account service X?

This utility gathers account data through *IBM Cloud CLI* and uses Node.js programs to cross information among resources, users, access groups, resource groups and policies to get a rapid answer for above questions.

## Pre-requisites
In order to use this utility, you must have:
* IBM command-line interface installed;
* Node.js vesion 10 or superior;
* User must be authenticated in IBM CLI;
* Linux Bash interpreter;
* curl utility installed

## Usage
The utility can be downloaded using the following command:
```
curl https://raw.githubusercontent.com/marcosbv/ibmcloud-policy-reports/master/download.sh | bash -s "<partial_account_name>"
```
Partial account name is an optional parameter that contains the acount name you want to retrieve data from. The reason of this parameter is in use cases where an user has access to more than one account. Download shell script will grep that string in *ibmcloud account list* command to get the correct account. If this parameter is not passed, script *gatherData.sh* is not called from *download.sh* script; therefore, you have to run data collection before using report programs.

There are two phases when using this utility:
1) Information collect: informatin about resources, users, access groups, group membership, clusters, policies are captured using IBM CLI command-line and REST API calls using curl. All JSON files generated from capturing process are stored under **data** directory as a snapshot.
This step can be run anytime using the *gatherData.sh* script. It also runs when you use the *download.sh* script using the account partial name as a parameter as described above.
To invoke data collection, once you have downloaded this utility, execute this command from the folder where utility resides:
```
./gatherData.sh "<partial_account_name>"
```
In this command, (partial) account name is required; otherwise, an error is thrown.

2) Report Node.js programs to analyze data: once snapshot is taken, you can run the following programs to retrieve your data:

**policiesForResource.js**: generate a report looking for policies grouped by resource and user.
Usage:
```
node policiesForResource.js [--csv] [Resource1 Resource2 ...]
```
--csv: write report using CSV format. Otherwise, default report output is used.
Resource: one or more resources to look for. If not informed, all resources are returned.


**policiesForRole.js**: generate a report looking for policies that contains one of roles in the arguments. It groups the policies by user.
Usage:
```
node policiesForRole.js [--csv] Role1 [Role2 Role3...]
```
--csv: write report using CSV format. Otherwise, default report output is used.
Roles: role names as declared in IBM Cloud (Administrator, Manager). At least one role is required.

**resourceAccessForUser.js**: show all resources an user has access to. It groups policies by user and resource.
```
node resourceAccessForUser.js [--csv] [Email1 Email2 ...]
```
--csv: write report using CSV format. Otherwise, default report output is used.
Emails: list of user e-mail to filter out. If not specified, all users are returned.


**latestUserLogin.js**: returns the latest date a user accessed the platform. It uses Frankfurt Activity Tracker instance to get this info.
```
node latestUserLogin.js APIKEY
```
APIKEY: Active Tracker API Key. More details about how to generate this key can be seen [here.](https://cloud.ibm.com/docs/services/Activity-Tracker-with-LogDNA?topic=logdnaat-export#export_api)


**policiesByUserAndAccessGroup.js**: Returns a list of policies grouped by user and ordered by access group.
```
node policiesByUserAndAccessGroup.js [--csv] [Email1 Email2 ...]
```
--csv: write report using CSV format. Otherwise, default report output is used.

Emails: list of user e-mail to filter out. If not specified, all users are returned.

**policiesForService.js**: Returns a list of policies that matches the specified Service Catalog IDs. It groups all policies by user. 
```
node policiesForService.js [--csv] ServiceName1 [ServiceName2 ServiceName3 ...]
```
--csv: write report using CSV format. 
Otherwise, default report output is used.

ServiceNames: list of service names to look for. This program looks for exact service name, ignoring 'all' policies, except with explicitly declared using the string *all_iam_services*. There is a special word **account**: if used, all account services (billing, support, iam-identity, enterprise) are searched.

*Note: the service name can be retrieved using the command 
```ibmcloud catalog service-marketplace```*


## Limitations and Known Issues

* It is not possible to look for Cloud Foundry resources
* Only the first 100 users from an access group can be returned
* As Activity Tracker is used to look for login events, messages older than storage retention policy will be shown as **no LogDNA record**, even though that user have already logged in before.
