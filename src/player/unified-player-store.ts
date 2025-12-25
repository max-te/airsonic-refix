import { defineStore } from 'pinia'
import { API, Track } from '@/shared/api'
import { useLocalPlayerStore } from './local-player-store'
import { useJukeboxStore } from './jukebox-store'

export const usePlayerStore = defineStore('player', {
  state: () => ({
    jukeboxMode: false,
  }),
  getters: {
    track: (state) => {
      const localStore = useLocalPlayerStore()
      const jukeboxStore = useJukeboxStore()
      return state.jukeboxMode ? jukeboxStore.currentTrack : localStore.track
    },
    trackId: (state) => {
      const localStore = useLocalPlayerStore()
      const jukeboxStore = useJukeboxStore()
      return state.jukeboxMode ? jukeboxStore.currentTrack?.id : localStore.trackId
    },
    progress: (state) => {
      const localStore = useLocalPlayerStore()
      const jukeboxStore = useJukeboxStore()
      return state.jukeboxMode ? jukeboxStore.progress : localStore.progress
    },
    hasNext: (state) => {
      const localStore = useLocalPlayerStore()
      const jukeboxStore = useJukeboxStore()
      return state.jukeboxMode ? jukeboxStore.hasNext : localStore.hasNext
    },
    hasPrevious: (state) => {
      const localStore = useLocalPlayerStore()
      const jukeboxStore = useJukeboxStore()
      return state.jukeboxMode ? jukeboxStore.hasPrevious : localStore.hasPrevious
    },
    isPlaying: (state) => {
      const localStore = useLocalPlayerStore()
      const jukeboxStore = useJukeboxStore()
      return state.jukeboxMode ? jukeboxStore.playing : localStore.isPlaying
    },
    queue: (state) => {
      const localStore = useLocalPlayerStore()
      const jukeboxStore = useJukeboxStore()
      return state.jukeboxMode ? jukeboxStore.playlist : localStore.queue
    },
    queueIndex: (state) => {
      const localStore = useLocalPlayerStore()
      const jukeboxStore = useJukeboxStore()
      return state.jukeboxMode ? jukeboxStore.currentIndex : localStore.queueIndex
    },
    volume: (state) => {
      const localStore = useLocalPlayerStore()
      const jukeboxStore = useJukeboxStore()
      return state.jukeboxMode ? jukeboxStore.gain : localStore.volume
    },
    currentTime: (state) => {
      if (state.jukeboxMode) {
        const jukeboxStore = useJukeboxStore()
        return jukeboxStore.position + jukeboxStore.statusAge / 1000
      }
      const localStore = useLocalPlayerStore()
      return localStore.currentTime
    },
    duration: (state) => {
      const localStore = useLocalPlayerStore()
      const jukeboxStore = useJukeboxStore()
      if (state.jukeboxMode) {
        const track = jukeboxStore.currentTrack
        return track?.duration || 0
      }
      return localStore.duration
    },
    repeat: () => {
      const localStore = useLocalPlayerStore()
      return localStore.repeat
    },
    shuffle: () => {
      const localStore = useLocalPlayerStore()
      return localStore.shuffle
    },
    playbackRate: () => {
      const localStore = useLocalPlayerStore()
      return localStore.playbackRate
    },
    streamTitle: () => {
      const localStore = useLocalPlayerStore()
      return localStore.streamTitle
    },
    replayGainMode: () => {
      const localStore = useLocalPlayerStore()
      return localStore.replayGainMode
    },
    podcastPlaybackRate: () => {
      const localStore = useLocalPlayerStore()
      return localStore.podcastPlaybackRate
    },
    scrobbled: () => {
      const localStore = useLocalPlayerStore()
      return localStore.scrobbled
    },
  },
  actions: {
    setJukeboxMode(enabled: boolean) {
      this.jukeboxMode = enabled
      const jukeboxStore = useJukeboxStore()
      jukeboxStore.setEnabled(enabled)
    },
    toggleJukeboxMode() {
      this.setJukeboxMode(!this.jukeboxMode)
    },
    async playNow(tracks: Track[], api: API) {
      const localStore = useLocalPlayerStore()
      const jukeboxStore = useJukeboxStore()

      if (this.jukeboxMode) {
        await jukeboxStore.setTracks(api, tracks)
        await jukeboxStore.skip(api, 0)
      } else {
        localStore.setShuffle(false)
        await localStore.playTrackList(tracks, 0)
      }
    },
    async shuffleNow(tracks: Track[], api: API) {
      const localStore = useLocalPlayerStore()
      const jukeboxStore = useJukeboxStore()

      if (this.jukeboxMode) {
        await jukeboxStore.setTracks(api, tracks)
        await jukeboxStore.shuffle(api)
      } else {
        localStore.setShuffle(true)
        await localStore.playTrackList(tracks)
      }
    },
    async playTrackList(tracks: Track[], api: API, index?: number) {
      const localStore = useLocalPlayerStore()
      const jukeboxStore = useJukeboxStore()

      if (this.jukeboxMode) {
        await jukeboxStore.setTracks(api, tracks)
        if (index !== undefined) {
          await jukeboxStore.skip(api, index)
        }
      } else {
        await localStore.playTrackList(tracks, index)
      }
    },
    async playTrackListIndex(index: number, api: API) {
      const localStore = useLocalPlayerStore()
      const jukeboxStore = useJukeboxStore()

      if (this.jukeboxMode) {
        await jukeboxStore.skip(api, index)
      } else {
        await localStore.playTrackListIndex(index, api)
      }
    },
    async resume(api: API) {
      const localStore = useLocalPlayerStore()
      const jukeboxStore = useJukeboxStore()

      if (this.jukeboxMode) {
        await jukeboxStore.start(api)
      } else {
        await localStore.resume()
      }
    },
    async pause(api: API) {
      const localStore = useLocalPlayerStore()
      const jukeboxStore = useJukeboxStore()

      if (this.jukeboxMode) {
        await jukeboxStore.stop(api)
      } else {
        await localStore.pause()
      }
    },
    async playPause(api: API) {
      return this.isPlaying ? this.pause(api) : this.resume(api)
    },
    async next(api: API) {
      const localStore = useLocalPlayerStore()
      const jukeboxStore = useJukeboxStore()

      if (this.jukeboxMode) {
        const currentIndex = jukeboxStore.currentIndex
        if (jukeboxStore.hasNext) {
          await jukeboxStore.skip(api, currentIndex + 1)
        }
      } else {
        await localStore.next()
      }
    },
    async previous(api: API) {
      const localStore = useLocalPlayerStore()
      const jukeboxStore = useJukeboxStore()

      if (this.jukeboxMode) {
        const currentTime = jukeboxStore.position
        const currentIndex = jukeboxStore.currentIndex
        if (currentTime > 3 && jukeboxStore.hasPrevious) {
          await jukeboxStore.skip(api, currentIndex)
        } else if (jukeboxStore.hasPrevious) {
          await jukeboxStore.skip(api, currentIndex - 1)
        }
      } else {
        await localStore.previous()
      }
    },
    async seek(value: number, api: API) {
      const localStore = useLocalPlayerStore()
      const jukeboxStore = useJukeboxStore()

      if (this.jukeboxMode) {
        const duration = this.duration
        if (isFinite(duration) && duration > 0) {
          const position = duration * value
          await jukeboxStore.skip(api, jukeboxStore.currentIndex, position)
        }
      } else {
        await localStore.seek(value)
      }
    },
    async loadQueue(api: API) {
      const localStore = useLocalPlayerStore()
      const jukeboxStore = useJukeboxStore()

      if (this.jukeboxMode) {
        await jukeboxStore.loadPlaylist(api)
      } else {
        await localStore.loadQueue(api)
      }
    },
    async resetQueue(api: API) {
      const localStore = useLocalPlayerStore()
      const jukeboxStore = useJukeboxStore()

      if (this.jukeboxMode) {
        await jukeboxStore.skip(api, 0, 0)
      } else {
        await localStore.resetQueue()
      }
    },
    async clearQueue(api: API) {
      const localStore = useLocalPlayerStore()
      const jukeboxStore = useJukeboxStore()

      if (this.jukeboxMode) {
        await jukeboxStore.clear(api)
      } else {
        await localStore.clearQueue()
      }
    },
    async addToQueue(tracks: Track[], api: API) {
      const localStore = useLocalPlayerStore()
      const jukeboxStore = useJukeboxStore()

      if (this.jukeboxMode) {
        await jukeboxStore.addTracks(api, tracks)
      } else {
        await localStore.addToQueue(tracks)
      }
    },
    async setNextInQueue(tracks: Track[], api: API) {
      const localStore = useLocalPlayerStore()
      const jukeboxStore = useJukeboxStore()

      if (this.jukeboxMode) {
        // For jukebox, we add tracks at the current position + 1
        await jukeboxStore.addTracks(api, tracks)
      } else {
        await localStore.setNextInQueue(tracks)
      }
    },
    async removeFromQueue(index: number, api: API) {
      const localStore = useLocalPlayerStore()
      const jukeboxStore = useJukeboxStore()

      if (this.jukeboxMode) {
        await jukeboxStore.removeTrack(api, index)
      } else {
        await localStore.removeFromQueue(index)
      }
    },
    async shuffleQueue(api: API) {
      const localStore = useLocalPlayerStore()
      const jukeboxStore = useJukeboxStore()

      if (this.jukeboxMode) {
        await jukeboxStore.shuffle(api)
      } else {
        await localStore.shuffleQueue()
      }
    },
    toggleReplayGain() {
      const localStore = useLocalPlayerStore()
      localStore.toggleReplayGain()
    },
    toggleRepeat() {
      const localStore = useLocalPlayerStore()
      localStore.toggleRepeat()
    },
    toggleShuffle() {
      const localStore = useLocalPlayerStore()
      localStore.toggleShuffle()
    },
    async setVolume(value: number, api: API) {
      const localStore = useLocalPlayerStore()
      const jukeboxStore = useJukeboxStore()

      if (this.jukeboxMode) {
        await jukeboxStore.setGain(api, value)
      } else {
        localStore.setVolume(value)
      }
    },
    setPlaybackRate(value: number) {
      const localStore = useLocalPlayerStore()
      localStore.setPlaybackRate(value)
    },
    setShuffle(enable: boolean) {
      const localStore = useLocalPlayerStore()
      localStore.setShuffle(enable)
    },
  },
})
