import arc from '@architect/functions';

export const handler = arc.http(async req => {

  let queryDomain = req.query.d;

  let respObj = {};

  if(queryDomain) {
    let data = await arc.tables()
    let result = await data.domains.query({
      KeyConditionExpression: 'PK = :PK AND SK = :SK',
      ExpressionAttributeValues: {
        ':PK': `DOMAIN#${queryDomain}`,
        ':SK': `METADATA#latest`
      }
    })
    if(result.Items.length > 0) {
      respObj.status = 'success';
      respObj.data = result.Items;
    } else {
      respObj.status = 'failure';
      respObj.data = 'no matching domain';
    }
  } else {
    respObj.status = 'failure';
    respObj.data = 'no domain provided as d query parameter';
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