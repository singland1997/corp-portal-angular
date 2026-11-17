function handler(event) {
  var request = event.request;
  var uri = request.uri;

  // Until an API origin is configured, never serve index.html for API requests.
  if (uri === '/api' || uri.startsWith('/api/')) {
    return {
      statusCode: 503,
      statusDescription: 'Service Unavailable',
      headers: {
        'content-type': { value: 'application/json' },
        'cache-control': { value: 'no-store' },
      },
      body: JSON.stringify({ message: 'API origin is not configured.' }),
    };
  }

  // Assets keep their original path: missing JS/CSS must not return HTML.
  if (!uri.startsWith('/assets/') && !uri.startsWith('/media/') && !uri.includes('.')) {
    request.uri = '/index.html';
  }

  return request;
}
