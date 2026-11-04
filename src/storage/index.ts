// Unico punto di accesso ai dati: il resto dell'app vede solo StorageAdapter.
export type { StorageAdapter } from './types'
export { createLocalStorageAdapter } from './localStorage'
export { createSupabaseAdapter } from './supabase'
export { createOfflineAdapter } from './offline'
export { createInitialData } from './seed'
export { exportJson, parseBackup, InvalidBackupError } from './backup'
