// learn more about HTTP functions here: https://arc.codes/http
export async function handler (req) {
  return {
    statusCode: 200,
    headers: {
      'cache-control': 'no-cache, no-store, must-revalidate, max-age=0, s-maxage=0',
      'content-type': 'text/html; charset=utf8'
    },
    body: `List of domains tracked can be viewed at <a href="https://scangov.org">scangov.org</a> or retrieved by status at /status using the query parameter status. Valid values for the status query parameter are ONLINE, OFFLINE, REDIRECTED, ONLINE-NOCRUX.`
  }
}