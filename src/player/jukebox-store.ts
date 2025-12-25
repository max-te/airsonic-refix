import { defineStore } from 'pinia'
import { watch } from 'vue'
import { API, Track } from '@/shared/api'

export const useJukeboxStore = defineStore('jukebox', {
  state: () => ({
    enabled: false,
    playlist: [] as Track[],
    currentIndex: -1,
    playing: false,
    gain: 1.0,
    position: 0,
    loading: false,
    error: null as null | Error,
    statusAge: 0,
    statusUpdateTime: 0,
  }),

  getters: {
    currentTrack(): Track | null {
      if (this.playlist && this.currentIndex >= 0 && this.currentIndex < this.playlist.length) {
        return this.playlist[this.currentIndex]
      }
      return null
    },

    hasNext(): boolean {
      return this.currentIndex < this.playlist.length - 1
    },

    hasPrevious(): boolean {
      return this.currentIndex > 0
    },

    progress(): number {
      if (this.currentTrack && this.currentTrack.duration > 0) {
        return (this.position + this.statusAge / 1000) / this.currentTrack.duration
      }
      return 0
    },
  },

  actions: {
    async loadPlaylist(api: API) {
      this.error = null

      try {
        const playlist = await api.getJukeboxPlaylist()
        this.playlist = playlist.entries
        this.currentIndex = playlist.currentIndex
        this.playing = playlist.playing
        this.gain = playlist.gain
        this.position = playlist.position
        this.statusAge = 0
        this.statusUpdateTime = now()
      } catch (err) {
        this.error = err as Error
        console.error('Failed to load jukebox playlist:', err)
      } finally {
        this.loading = false
      }
    },

    async updateStatus(api: API) {
      try {
        const status = await api.getJukeboxStatus()
        this.currentIndex = status.currentIndex
        this.playing = status.playing
        this.gain = status.gain
        this.position = status.position
        this.statusAge = 0
        this.statusUpdateTime = now()
      } catch (err) {
        this.error = err as Error
        console.error('Failed to update jukebox status:', err)
      }
    },

    async start(api: API) {
      this.playing = true
      try {
        const status = await api.jukeboxStart()
        this.playing = status.playing
        this.currentIndex = status.currentIndex
        this.position = status.position
        this.statusAge = 0
        this.statusUpdateTime = now()
      } catch (err) {
        this.error = err as Error
        console.error('Failed to start jukebox:', err)
      } finally {
        this.loading = false
      }
    },

    async stop(api: API) {
      this.playing = false
      try {
        const status = await api.jukeboxStop()
        this.playing = status.playing
        this.position = status.position
        this.statusAge = 0
        this.statusUpdateTime = now()
      } catch (err) {
        this.error = err as Error
        console.error('Failed to stop jukebox:', err)
      }
    },

    async skip(api: API, index: number, offset?: number) {
      this.playing = true
      this.currentIndex = index
      this.position = offset || 0
      try {
        const status = await api.jukeboxSkip(index, offset && Math.floor(offset))
        this.currentIndex = status.currentIndex
        this.playing = status.playing
        this.position = status.position
        this.statusAge = 0
        this.statusUpdateTime = now()
      } catch (err) {
        this.error = err as Error
        console.error('Failed to skip jukebox track:', err)
      }
    },

    async addTracks(api: API, tracks: Track[]) {
      this.loading = true
      try {
        const trackIds = tracks.map(track => track.id)
        await api.jukeboxAdd(trackIds)
        // Reload playlist to get updated order
        await this.loadPlaylist(api)
      } catch (err) {
        this.error = err as Error
        console.error('Failed to add tracks to jukebox:', err)
      } finally {
        this.loading = false
      }
    },

    async setTracks(api: API, tracks: Track[]) {
      this.loading = true
      try {
        const trackIds = tracks.map(track => track.id)
        await api.jukeboxSet(trackIds)
        // Reload playlist to get updated order
        await this.loadPlaylist(api)
      } catch (err) {
        this.error = err as Error
        console.error('Failed to set jukebox tracks:', err)
      } finally {
        this.loading = false
      }
    },

    async clear(api: API) {
      this.loading = true
      try {
        await api.jukeboxClear()
        this.playlist = []
        this.currentIndex = -1
        this.playing = false
        this.position = 0
        this.statusAge = 0
        this.statusUpdateTime = now()
      } catch (err) {
        this.error = err as Error
        console.error('Failed to clear jukebox:', err)
      } finally {
        this.loading = false
      }
    },

    async removeTrack(api: API, index: number) {
      this.playlist.splice(index, 1)
      if (index < this.currentIndex) this.currentIndex--
      try {
        await api.jukeboxRemove(index)
        await this.loadPlaylist(api)
      } catch (err) {
        this.error = err as Error
        console.error('Failed to remove track from jukebox:', err)
      }
    },

    async shuffle(api: API) {
      this.loading = true
      try {
        await api.jukeboxShuffle()
        // Reload playlist to get shuffled order
        await this.loadPlaylist(api)
      } catch (err) {
        this.error = err as Error
        console.error('Failed to shuffle jukebox:', err)
      } finally {
        this.loading = false
      }
    },

    async setGain(api: API, gain: number) {
      try {
        this.gain = gain
        const status = await api.jukeboxSetGain(gain)
        this.gain = status.gain
      } catch (err) {
        this.error = err as Error
        console.error('Failed to set jukebox gain:', err)
      }
    },

    toggleEnabled() {
      this.enabled = !this.enabled
    },

    setEnabled(enabled: boolean) {
      this.enabled = enabled
    },

    clearError() {
      this.error = null
    },
  },
})

// Auto-update status periodically when playing
let statusUpdateInterval: number | null = null
export function setupJukeboxStatusUpdates(jukeboxStore: ReturnType<typeof useJukeboxStore>, api: API) {
  watch(
    () => [jukeboxStore.enabled],
    ([enabled]) => {
      if (statusUpdateInterval) {
        clearInterval(statusUpdateInterval)
        statusUpdateInterval = null
      }

      if (enabled) {
        const animateProgress = () => {
          if (jukeboxStore.playing) {
            jukeboxStore.statusAge = now() - jukeboxStore.statusUpdateTime
          }
          if (jukeboxStore.enabled) {
            requestAnimationFrame(animateProgress)
          }
        }
        animateProgress()
        statusUpdateInterval = setInterval(() => {
          jukeboxStore.loadPlaylist(api)
        }, 5000)
      }
    },
    { immediate: true }
  )
}

function now() {
  return Number(document.timeline.currentTime || Date.now())
}
