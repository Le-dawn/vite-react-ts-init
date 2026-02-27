import { toast } from "sonner"
import { apiPrefix } from "@/config";
import { getAuthToken } from '@/utils/auth';
import { asyncRunSafe } from "@/utils";
import { refreshAccessTokenOrRelogin } from "./refresh-token";

const TIME_OUT = 100000

export interface CommonResponseType<T> {
  data: T
  message: string
  code: number
}

export const ContentType = {
  json: 'application/json',
  stream: 'text/event-stream',
  audio: 'audio/mpeg',
  form: 'application/x-www-form-urlencoded; charset=UTF-8',
  download: 'application/octet-stream', // for download (generic)
  downloadZip: 'application/zip', // for download
  upload: 'multipart/form-data', // for upload

  // Excel files
  excel: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
  excelLegacy: 'application/vnd.ms-excel',

  // PDF files
  pdf: 'application/pdf',

  // Word files
  word: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
  wordLegacy: 'application/msword',

  // PowerPoint files
  powerpoint: 'application/vnd.openxmlformats-officedocument.presentationml.presentation',
  powerpointLegacy: 'application/vnd.ms-powerpoint',

  // Text files
  text: 'text/plain',
  textCsv: 'text/csv',

  // Images
  png: 'image/png',
  jpeg: 'image/jpeg',
  gif: 'image/gif',
  svg: 'image/svg+xml',

  // Other common formats
  xml: 'application/xml',
  html: 'text/html',
  css: 'text/css',
  javascript: 'application/javascript',
}

export type FetchOptionType = Omit<RequestInit, 'body'> & {
  params?: Record<string, any>
  body?: BodyInit | Record<string, any> | null
}


export type IOtherOptions = {
  isPublicAPI?: boolean
  bodyStringify?: boolean
  needAllResponseContent?: boolean
  deleteContentType?: boolean
  getAbortController?: (abortController: AbortController) => void
}

export const baseOptions = {
  method: 'GET',
  mode: 'cors',
  // credentials: 'include', // always send cookies、HTTP Basic authentication.
  headers: new Headers({
    'Content-Type': ContentType.json,
  }),
  redirect: 'follow',
}

export function getAccessToken(isPublicAPI?: boolean) {
  if (isPublicAPI) {
    const sharedToken = globalThis.location.pathname.split('/').slice(-1)[0]
    const accessToken = localStorage.getItem('token') || JSON.stringify({ [sharedToken]: '' })
    let accessTokenJson = { [sharedToken]: '' }
    try {
      accessTokenJson = JSON.parse(accessToken)
    }
    catch (e) {

    }
    return accessTokenJson[sharedToken]
  }
  else {
    return getAuthToken()
  }
}

/**
 * 基础fetch封装
 */
export const baseFetch = <T>(
  url: string,
  fetchOptions: FetchOptionType,
  {
    isPublicAPI = false,
    bodyStringify = true,
    needAllResponseContent,
    deleteContentType,
    getAbortController,
  }: IOtherOptions,
): Promise<T> => {
  const options: typeof baseOptions & FetchOptionType = Object.assign({}, baseOptions, fetchOptions)
  if (getAbortController) {
    const abortController = new AbortController()
    getAbortController(abortController)
    options.signal = abortController.signal
  }
  const accessToken = getAccessToken(isPublicAPI)
  options.headers.set('Authorization', `Bearer ${accessToken}`)

  if (deleteContentType) {
    options.headers.delete('Content-Type')
  }
  else {
    const contentType = options.headers.get('Content-Type')
    if (!contentType)
      options.headers.set('Content-Type', ContentType.json)
  }

  let urlWithPrefix = (url.startsWith('http://') || url.startsWith('https://'))
    ? url
    : `${apiPrefix}${url.startsWith('/') ? url : `/${url}`}`

  const { method, params, body } = options
  // handle query
  if (method === 'GET' && params) {
    const paramsArray: string[] = []
    Object.keys(params).forEach((key) => {
      if (params[key] !== undefined && params[key] !== null)
        paramsArray.push(`${key}=${encodeURIComponent(params[key])}`)
    })
    if (urlWithPrefix.search(/\?/) === -1)
      urlWithPrefix += `?${paramsArray.join('&')}`

    else
      urlWithPrefix += `&${paramsArray.join('&')}`

    delete options.params
  }

  if (body && bodyStringify)
    options.body = JSON.stringify(body)

  // Handle timeout
  return Promise.race([
    new Promise((resolve, reject) => {
      setTimeout(() => {
        reject(new Error('request timeout'))
      }, TIME_OUT)
    }),
    new Promise((resolve, reject) => {
      globalThis.fetch(urlWithPrefix, options as RequestInit)
        .then((res) => {
          const resClone = res.clone()
          // Error handler
          if (!/^(2|3)\d{2}$/.test(String(res.status))) {
            const bodyJson = res.json()
            switch (res.status) {
              case 401:
                return Promise.reject(resClone)
              // fall through
              default:
                bodyJson.then((data: CommonResponseType<T>) => {
                  toast.error(data.message)
                })
            }
            return Promise.reject(resClone)
          }

          // handle delete api. Delete api not return content.
          if (res.status === 204) {
            resolve({ result: 'success' })
            return
          }

          // return data - handle file download types
          const contentType = options.headers.get('Content-type')
          const isFileDownload = [
            ContentType.download,
            ContentType.audio,
            ContentType.excel,
            ContentType.excelLegacy,
            ContentType.pdf,
            ContentType.word,
            ContentType.wordLegacy,
            ContentType.powerpoint,
            ContentType.powerpointLegacy,
            ContentType.text,
            ContentType.textCsv,
            ContentType.downloadZip,
            ContentType.png,
            ContentType.jpeg,
            ContentType.gif,
            ContentType.svg
          ].includes(contentType as string)

          if (isFileDownload)
            resolve(needAllResponseContent ? resClone : res.blob())

          else resolve(needAllResponseContent ? resClone : res.json())
        })
        .catch((err) => {
          const errMessage = err?.message || err
          if (typeof errMessage === 'string') {
            toast.error(errMessage)
          }
          reject(err)
        })
    }),
  ]) as Promise<T>
}


export const request = async<T>(url: string, options = {}, otherOptions?: IOtherOptions) => {
  try {
    const otherOptionsForBaseFetch = otherOptions || {}
    const [err, resp] = await asyncRunSafe<T>(baseFetch(url, options, otherOptionsForBaseFetch))
    if (err === null)
      return resp
    const errResp: Response = err as any
    if (errResp.status === 401) {
      const loginUrl = `${globalThis.location.origin}/login`

      // refresh token
      const [refreshErr] = await asyncRunSafe(refreshAccessTokenOrRelogin(TIME_OUT))
      if (refreshErr === null)
        return baseFetch<T>(url, options, otherOptionsForBaseFetch)
      if (location.pathname !== '/login') {
        globalThis.location.href = loginUrl
        return Promise.reject(err)
      }
    } else {
      return Promise.reject(err)
    }

  } catch (e) {
    return Promise.reject(e)
  }
}

/**
 * GET请求封装
 */
export const get = <T>(url: string, options = {}, otherOptions?: IOtherOptions) => {
  return request<T>(url, Object.assign({}, options, { method: 'GET' }), otherOptions)
}

/**
 * POST请求封装
 */
export const post = <T>(url: string, options = {}, otherOptions?: IOtherOptions) => {
  return request<T>(url, Object.assign({}, options, { method: 'POST' }), otherOptions)
}

/**
 * PUT请求封装
 */
export const put = <T>(url: string, options = {}, otherOptions?: IOtherOptions) => {
  return request<T>(url, Object.assign({}, options, { method: 'PUT' }), otherOptions)
}

/**
 * DELETE请求封装
 */
export const del = <T>(url: string, options = {}, otherOptions?: IOtherOptions) => {
  return request<T>(url, Object.assign({}, options, { method: 'DELETE' }), otherOptions)
}

/**
 * PATCH请求封装
 */
export const patch = <T>(url: string, options = {}, otherOptions?: IOtherOptions) => {
  return request<T>(url, Object.assign({}, options, { method: 'PATCH' }), otherOptions)
}
