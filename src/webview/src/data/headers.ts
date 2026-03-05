export const STANDARD_HEADERS = [
  'Accept', 'Accept-Charset', 'Accept-Encoding', 'Accept-Language',
  'Authorization', 'Cache-Control', 'Connection', 'Content-Disposition',
  'Content-Encoding', 'Content-Language', 'Content-Length', 'Content-Type',
  'Cookie', 'Date', 'ETag', 'Expect', 'Forwarded', 'From', 'Host',
  'If-Match', 'If-Modified-Since', 'If-None-Match', 'If-Range',
  'If-Unmodified-Since', 'Keep-Alive', 'Origin', 'Pragma', 'Proxy-Authorization',
  'Range', 'Referer', 'TE', 'Trailer', 'Transfer-Encoding', 'Upgrade',
  'User-Agent', 'Via', 'Warning', 'X-Forwarded-For', 'X-Forwarded-Host',
  'X-Forwarded-Proto', 'X-Request-ID', 'X-Correlation-ID', 'X-API-Key',
];

export const HEADER_VALUES: Record<string, string[]> = {
  'Accept': [
    'application/json', 'application/xml', 'text/html', 'text/plain',
    'application/octet-stream', 'multipart/form-data', 'application/x-www-form-urlencoded',
    '*/*', 'image/png', 'image/jpeg', 'application/pdf',
  ],
  'Accept-Charset': ['utf-8', 'iso-8859-1', 'ascii'],
  'Accept-Encoding': ['gzip', 'deflate', 'br', 'identity', 'gzip, deflate, br'],
  'Accept-Language': ['en-US', 'en-GB', 'en', 'fr', 'de', 'es', 'ja', 'zh-CN', '*'],
  'Authorization': ['Bearer ', 'Basic ', 'Digest ', 'HMAC-SHA256 '],
  'Cache-Control': [
    'no-cache', 'no-store', 'max-age=0', 'max-age=3600', 'max-age=86400',
    'no-transform', 'only-if-cached', 'must-revalidate',
  ],
  'Connection': ['keep-alive', 'close', 'upgrade'],
  'Content-Encoding': ['gzip', 'deflate', 'br', 'identity'],
  'Content-Type': [
    'application/json', 'application/json; charset=utf-8',
    'application/xml', 'application/x-www-form-urlencoded',
    'multipart/form-data', 'text/plain', 'text/plain; charset=utf-8',
    'text/html', 'text/css', 'text/csv',
    'application/octet-stream', 'application/pdf',
    'application/javascript', 'application/graphql',
    'image/png', 'image/jpeg', 'image/svg+xml',
  ],
  'Expect': ['100-continue'],
  'Pragma': ['no-cache'],
  'Transfer-Encoding': ['chunked', 'compress', 'deflate', 'gzip'],
  'Upgrade': ['websocket', 'h2c'],
  'User-Agent': [
    'Mozilla/5.0 (Windows NT 10.0; Win64; x64)',
    'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7)',
    'curl/8.0', 'PostmanRuntime/7.36', 'OpenPost/1.0',
  ],
  'X-Forwarded-Proto': ['https', 'http'],
};
