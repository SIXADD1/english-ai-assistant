import axios from 'axios'
import { useUserStore } from '../stores/userStore'

const toCamelCase = (str: string): string => {
  return str.replace(/_([a-z])/g, (_, letter) => letter.toUpperCase())
}

const convertKeysToCamelCase = (obj: any): any => {
  if (obj === null || obj === undefined) return obj
  if (Array.isArray(obj)) return obj.map(convertKeysToCamelCase)
  if (typeof obj !== 'object' || obj instanceof Date || obj instanceof FormData) return obj

  const converted: any = {}
  for (const key of Object.keys(obj)) {
    const camelKey = toCamelCase(key)
    converted[camelKey] = convertKeysToCamelCase(obj[key])
  }
  return converted
}

const api = axios.create({
  baseURL: '/api',
  timeout: 30000,
  headers: {
    'Content-Type': 'application/json',
  },
})

api.interceptors.request.use(
  (config) => {
    const token = useUserStore.getState().token
    if (token) {
      config.headers.Authorization = `Bearer ${token}`
    }
    return config
  },
  (error) => {
    return Promise.reject(error)
  }
)

api.interceptors.response.use(
  (response) => {
    if (response.data && typeof response.data === 'object') {
      response.data = convertKeysToCamelCase(response.data)
    }
    return response
  },
  (error) => {
    if (error.response?.status === 401) {
      useUserStore.getState().logout()
    }
    return Promise.reject(error)
  }
)

export default api
