import arc from '@architect/functions';
import {
  PutObjectCommand,
  S3Client,
  S3ServiceException,
} from "@aws-sdk/client-s3";

export async function handler (event) {
  console.log(JSON.stringify(event, null, 2))





  // query the database and get a single domain
  // that is ONLINE
  // and was not reviewed recently
  let domain = '2020census.gov';












  console.log(`looking up ${domain}`);
  let domainData = await getDomainData(domain);
  if(domainData.status != 'success') {
    domainData = await getDomainData(domain, false); // request without appending www
  }
  console.log(`${domain} retrieved, crux data: ${domainData.status}`);

  let data = await arc.tables();

  let dbRecord = {};
  let result = await data.domains.query({
    KeyConditionExpression: 'PK = :PK AND SK = :SK',
    ExpressionAttributeValues: {
      ':PK': `DOMAIN#${domain}`,
      ':SK': `METADATA#latest`
    }
  })
  if(result.Items.length > 0) {
    dbRecord = result.Items[0];
  } else {
    dbRecord.PK = `DOMAIN#${domain}`
    dbRecord.SK = "METADATA#latest";
    dbRecord.domain = domain;  
  }

  let todayDate = new Date().toISOString().split('T')[0];
  dbRecord.lastCheckedAt = todayDate;
  dbRecord.GSI1SK = todayDate;

  let auditStatus = '';
  let redirectDestination = '';
  if(domainData.status == 'success') {
    auditStatus = 'ONLINE';
    const data = await domainData.response.json();
    let uploadingToS3Result = await uploadToS3(domain, JSON.stringify(data));
    console.log(uploadingToS3Result)
  } else {
    /* don't have CrUX data, will not write to S3 */
    let statusOfDomain = await fetchIt(domain);
    console.log('  '+statusOfDomain.status);

    if(statusOfDomain.status == 'error') {
      auditStatus = 'OFFLINE';
    }
    if(statusOfDomain.status == 'success') {
      if(statusOfDomain.value.indexOf(domain) > -1) {
        auditStatus = 'ONLINE-NOCRUX';
      } else {
        auditStatus = 'REDIRECTED';
        redirectDestination = statusOfDomain.value;
      }  
    }
  }
  dbRecord.status = auditStatus;
  dbRecord.GSI1PK = `STATUS#${auditStatus}`;
  let newHistoryLog = {
    checkDate: todayDate,
    result: auditStatus
  }
  if(auditStatus == 'REDIRECTED') {
    newHistoryLog.redirectDestination = redirectDestination;
  }
  if(dbRecord.historyLog) {
    dbRecord.historyLog.push(newHistoryLog)
  } else {
    dbRecord.historyLog = [newHistoryLog];
  }
  let dataInput = await data.domains.put(dbRecord);
  console.log(dataInput);






  return
}


async function fetchIt(domain) {
  return new Promise((resolve) => {

    let respObj = {};
    respObj.status = '';
    respObj.value = '';

    const controller = new AbortController()
    const timeoutId = setTimeout(() => controller.abort(), 5000)
    
    fetch('https://'+domain, { signal: controller.signal })
      .then(response => {
        if (!response.ok) {
          respObj.status = 'error';
          respObj.value = 'failed fetch, response not ok';
          resolve(respObj)
        }

        respObj.status = 'success';
        respObj.value = response.url;
        resolve(respObj)
        return response.text();
      })
      .then(data => {
        /* fetch success, cool */
      })
      .catch(error => {
        respObj.status = 'error';
        respObj.value = 'fetch error thrown';
        resolve(respObj)
      });
  });
}

async function uploadToS3(domain, fileContent) {
  return new Promise(async (resolve) => {

    let bucketName = 'audits.scangov.org';

    let s3ClientObject = {};
    s3ClientObject.region = (process.env.AWS_REGION ? process.env.AWS_REGION : 'us-east-1');
    if(process.env.status == 'development') {
      s3ClientObject.accessKeyId = process.env.AWS_ACCESS_KEY_ID;
      s3ClientObject.secretAccessKey = process.env.AWS_SECRET_ACCESS_KEY;
    }
    const client = new S3Client(s3ClientObject);

    let key = 'performance/'+domain+'.json';

    let info = {
      Bucket: bucketName,
      Key: key,
      Body: fileContent,
      ContentType: "application/json"
    };
    const command = new PutObjectCommand(info);

    try {
      const response = await client.send(command);
      resolve('wrote file');
    } catch (caught) {
      resolve('failed to write file');
      if (
        caught instanceof S3ServiceException &&
        caught.name === "EntityTooLarge"
      ) {
        console.error(
          `Error from S3 while uploading object to ${bucketName}. \
    The object was too large. To upload objects larger than 5GB, use the S3 console (160GB max) \
    or the multipart upload API (5TB max).`,
        );
      } else if (caught instanceof S3ServiceException) {
        console.error(
          `Error from S3 while uploading object to ${bucketName}.  ${caught.name}: ${caught.message}`,
        );
      } else {
        console.error(caught);
      }
    }
  })
}

async function getDomainData(domain, appendWWW = true) {
  let requestDomain = domain + '/';
  if(appendWWW) {
    requestDomain = 'www.'+domain;
  }
  console.log('requesting: '+requestDomain)
  return new Promise(async (resolve) => {
    try {
      const response = await fetch('https://chromeuxreport.googleapis.com/v1/records:queryRecord?key='+process.env.CRUX_API_KEY, {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json'
        },
        body: JSON.stringify({
            'origin': `https://${requestDomain}`
        })
      });
      if (!response.ok) {
        throw new Error('Network response was not ok for '+fullUrl);
      }
      resolve({'status': 'success', "response": response});
    } catch(error) {
      resolve({'status': 'fail', "error": error});
    }
  });
}