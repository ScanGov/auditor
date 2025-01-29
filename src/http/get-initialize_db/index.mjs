/*
* This script is designed to be run once when a new cloud environment is created
* It will populate the database from the files created from manual audits Jan 2025
*/
import arc from '@architect/functions';
import { parse } from 'csv-parse/sync';
import * as fs from 'fs';

export async function handler (req) {

  let csv = fs.readFileSync('./domains.csv');
  const domainRecords = parse(csv, {
    columns: true,
    skip_empty_lines: true
  });

  let successcsv = fs.readFileSync('./success.csv');
  const successRecords = parse(successcsv, {
    columns: true,
    skip_empty_lines: true
  });
  let successMap = new Map();
  successRecords.forEach(r => {
    successMap.set(domain,domain);
  })
  let errorcsv = fs.readFileSync('./errors.csv');
  const errorRecords = parse(errorcsv, {
    columns: true,
    skip_empty_lines: true
  });
  let lowtrafficcsv = fs.readFileSync('./lowtraffic.csv');
  const lowTrafficRecords = parse(lowtrafficcsv, {
    columns: true,
    skip_empty_lines: true
  });
  let redirectcsv = fs.readFileSync('./newdomainredirects.csv');
  const redirectRecords = parse(redirectcsv, {
    columns: true,
    skip_empty_lines: true
  });

  let i = 0;
  while(i<domainRecords.length) {
    let outputString = '';
    let domain = domainRecords[i].domain;
    outputString += (`${i}: ${domain}`);
    let dbRecord = {};
    dbRecord.PK = `DOMAIN#${domain}`
    dbRecord.SK = "METADATA#latest";
    dbRecord.domain = domain;
    dbRecord.lastCheckedAt = "2025-01-25";
    dbRecord.GSI1SK = "2025-01-25";
    if(successMap.get(domain)) {
      dbRecord.status = "ONLINE";
      dbRecord.GSI1PK = "STATUS#ONLINE";
      dbRecord.historyLog = [{
        checkDate: '2025-01-25',
        result: 'ONLINE'
      }];
    } else {
      // see if it is in errors.csv, lowtraffic.csv or newdomainredirects.csv
      errorRecords.forEach(r => {
        if(r.domain == domain) {
          dbRecord.status = "OFFLINE";
          dbRecord.GSI1PK = "STATUS#OFFLINE";
          dbRecord.historyLog = [{
            checkDate: '2025-01-25',
            result: 'OFFLINE'
          }];
        }
      })
      lowTrafficRecords.forEach(r => {
        if(r.domain == domain) {
          dbRecord.status = "LOWTRAFFIC";
          dbRecord.GSI1PK = "STATUS#LOWTRAFFIC";
          dbRecord.historyLog = [{
            checkDate: '2025-01-25',
            result: 'ONLINE-NOCRUX'
          }];
        }
      })
      redirectRecords.forEach(r => {
        if(r.domain == domain) {
          dbRecord.status = "REDIRECTED";
          dbRecord.GSI1PK = "STATUS#REDIRECTED";
          dbRecord.historyLog = [{
            checkDate: '2025-01-25',
            result: 'REDIRECTED',
            redirectDestination: r.redirect
          }];
        }
      })
    }

    let data = await arc.tables()
    let result = await data.domains.query({
      KeyConditionExpression: 'PK = :PK AND SK = :SK',
      ExpressionAttributeValues: {
        ':PK': `DOMAIN#${domain}`,
        ':SK': `METADATA#latest`
      }
    })
    if(result.Items.length < 1) {
      data.domains.put(dbRecord);
    }
    i++;
  }




  return {
    statusCode: 200,
    headers: {
      'cache-control': 'no-cache, no-store, must-revalidate, max-age=0, s-maxage=0',
      'content-type': 'text/html; charset=utf8'
    },
    body: `
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1">
  <title>Architect</title>
  <style>
     * { margin: 0; padding: 0; box-sizing: border-box; } body { font-family: -apple-system, BlinkMacSystemFont, sans-serif; } .max-width-320 { max-width: 20rem; } .margin-left-8 { margin-left: 0.5rem; } .margin-bottom-16 { margin-bottom: 1rem; } .margin-bottom-8 { margin-bottom: 0.5rem; } .padding-32 { padding: 2rem; } .color-grey { color: #333; } .color-black-link:hover { color: black; } 
  </style>
</head>
<body class="padding-32">
  <div class="max-width-320">
    <img src="https://assets.arc.codes/logo.svg" />
    <div class="margin-left-8">
      <div class="margin-bottom-16">
        <h1 class="margin-bottom-16">
          Hello from an Architect Node.js function!
        </h1>
        <p class="margin-bottom-8">
          Get started by editing this file at:
        </p>
        <code>
          src/http/get-initialize_db/index.mjs
        </code>
      </div>
      <div>
        <p class="margin-bottom-8">
          View documentation at:
        </p>
        <code>
          <a class="color-grey color-black-link" href="https://arc.codes">https://arc.codes</a>
        </code>
      </div>
    </div>
  </div>
</body>
</html>
`
  }
}