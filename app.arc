@app
scangovdata

@http
get /
get /initialize-db
get /all
get /one
get /status

@scheduled
audit cron(*/15 * ? * SUN,MON,TUE,WED,THU,FRI,SAT *)

@tables
domains
  PK *String
  SK **String

@tables-indexes
domains
  GSI1PK *String
  GSI1SK **String
  name GSI1

@aws
profile scangov
region us-west-2
timeout 900