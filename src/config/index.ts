

export let apiPrefix = ''

if (process.env.NEXT_PUBLIC_API_PREFIX) {
  apiPrefix = process.env.NEXT_PUBLIC_API_PREFIX
}
else if (
  globalThis.document?.body?.getAttribute('data-api-prefix')
) {
  // Not build can not get env from process.env.NEXT_PUBLIC_ in browser https://nextjs.org/docs/basic-features/environment-variables#exposing-environment-variables-to-the-browser
  apiPrefix = globalThis.document.body.getAttribute('data-api-prefix') as string
}
else {
  apiPrefix = ''
}

export const API_PREFIX = apiPrefix
