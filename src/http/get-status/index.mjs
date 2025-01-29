import arc from '@architect/functions';

export const handler = arc.http(async req => {

  let queryStatus = req.query.status;

  let respObj = {};

  if(queryStatus) {
    let data = await arc.tables();

    let result = await data.domains.query({
      IndexName: "GSI1",
      KeyConditionExpression: "GSI1PK = :status",
      ExpressionAttributeValues: {
        ':status': `STATUS#${queryStatus}`
      }
    })
    console.log(result);
    if(result.Items.length > 0) {
      respObj.status = 'success';
      let domainList = [];
      result.Items.forEach(d => {
        domainList.push(d.domain);
      })
      respObj.data = domainList;
    } else {
      respObj.status = 'failure';
      respObj.data = 'no domains matching status';
    }
  } else {
    respObj.status = 'failure';
    respObj.data = 'no status provided as status query parameter';
  }

  return {
    statusCode: 200,
    headers: {
      'cache-control': 'no-cache, no-store, must-revalidate, max-age=0, s-maxage=0',
      'content-type': 'application/json; charset=utf8'
    },
    body: JSON.stringify(respObj)
  }
})