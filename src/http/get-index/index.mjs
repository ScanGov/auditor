export async function handler (req) {
  return {
    statusCode: 200,
    headers: {
      'cache-control': 'no-cache, no-store, must-revalidate, max-age=0, s-maxage=0',
      'content-type': 'text/html; charset=utf8'
    },
    body: `This is the ScanGov audit runner tool. Checkout <a href="https://scangov.org">scangov.org</a> to browse all the data.`
  }
}
