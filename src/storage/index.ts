import { createLocalStorageAdapter } from './localStorage'
import type { StorageAdapter } from './types'

/** Unico punto da cambiare per passare a Supabase in Fase 2. */
export const storage: StorageAdapter = createLocalStorageAdapter()

export type { StorageAdapter } from './types'
export { createInitialData } from './seed'
export { exportJson, parseBackup, InvalidBackupError } from './backup'
