/**
 * @name react-jinke-music-player
 * @description Maybe the best beautiful HTML5 responsive player component for react :)
 * @author Jinke.Li <1359518268@qq.com>
 * @license MIT
 */

import React, { PureComponent, createRef, cloneElement } from 'react'
import { createPortal } from 'react-dom'
import cls from 'classnames'
import download from 'downloadjs'
import getIsMobile from 'is-mobile'
import Slider from 'rc-slider/lib/Slider'
import Switch from 'rc-switch'
import Draggable from 'react-draggable'
import AudioListsPanel from './components/AudioListsPanel'
import CircleProcessBar from './components/CircleProcessBar'
import {
  AnimatePauseIcon,
  AnimatePlayIcon,
  CloseIcon,
  DeleteIcon,
  DownloadIcon,
  FaMinusSquareOIcon,
  LoopIcon,
  LyricIcon,
  MdVolumeDownIcon,
  MdVolumeMuteIcon,
  NextAudioIcon,
  OrderPlayIcon,
  PlayListsIcon,
  PrevAudioIcon,
  ReloadIcon,
  RepeatIcon,
  ShufflePlayIcon,
  LoadIcon,
} from './components/Icon'

import AudioPlayerMobile from './components/PlayerMobile'
import PlayModel from './components/PlayModel'
import { AUDIO_LIST_REMOVE_ANIMATE_TIME } from './config/animate'
import { SPACE_BAR_KEYCODE } from './config/keycode'
import LOCALE from './config/locale'
import { MEDIA_QUERY } from './config/mediaQuery'
import { MODE } from './config/mode'
import NETWORK_STATE from './config/networkState'
import PLAY_MODE from './config/playMode'
import PROP_TYPES from './config/propTypes'
import { sliderBaseOptions } from './config/slider'
import { THEME } from './config/theme'
import LOCALE_CONFIG from './locale'
import Lyric from './lyric'
import {
  arrayEqual,
  createRandomNum,
  formatTime,
  isSafari,
  uuId,
} from './utils'

import 'rc-slider/assets/index.css'
import 'rc-switch/assets/index.css'

const IS_MOBILE = getIsMobile()

const DEFAULT_ICON = {
  pause: <AnimatePauseIcon />,
  play: <AnimatePlayIcon />,
  destroy: <CloseIcon />,
  close: <CloseIcon />,
  delete: <DeleteIcon />,
  download: <DownloadIcon />,
  toggle: <FaMinusSquareOIcon />,
  lyric: <LyricIcon />,
  volume: <MdVolumeDownIcon />,
  mute: <MdVolumeMuteIcon />,
  next: <NextAudioIcon />,
  prev: <PrevAudioIcon />,
  playLists: <PlayListsIcon />,
  reload: <ReloadIcon />,
  loop: <LoopIcon />,
  order: <OrderPlayIcon />,
  orderLoop: <RepeatIcon />,
  shuffle: <ShufflePlayIcon />,
  loading: <LoadIcon />,
}

export default class ReactJkMusicPlayer extends PureComponent {
  isDrag = false

  initPlayId = '' // 初始播放id

  state = {
    audioLists: [],
    playId: this.initPlayId, // 播放id
    name: '', // 当前歌曲名
    cover: '', // 当前歌曲封面
    singer: '', // 当前歌手
    musicSrc: '', // 当前歌曲链
    lyric: '', // 当前歌词
    currentLyric: '',
    isMobile: IS_MOBILE,
    toggle: this.props.mode === MODE.FULL,
    pause: true,
    playing: false,
    currentTime: 0,
    soundValue: 100,
    moveX: 0,
    moveY: 0,
    loading: false,
    audioListsPanelVisible: false,
    playModelNameVisible: false,
    theme: this.props.theme || this.darkThemeName,
    playMode: this.props.playMode || this.props.defaultPlayMode || '', // 当前播放模式
    currentAudioVolume: 0, // 当前音量  静音后恢复到之前记录的音量
    initAnimate: false,
    isInitAutoPlay: this.props.autoPlay,
    isInitRemember: false,
    loadedProgress: 0,
    removeId: -1,
    isNeedMobileHack: IS_MOBILE,
    audioLyricVisible: false,
    isAutoPlayWhenUserClicked: false,
    playIndex: this.props.playIndex || this.props.defaultPlayIndex || 0,
  }

  static defaultProps = {
    audioLists: [],
    theme: THEME.DARK,
    mode: MODE.MINI,
    defaultPlayMode: PLAY_MODE.order,
    defaultPosition: {
      left: 0,
      top: 0,
    },
    once: false, // onAudioPlay 事件  是否只触发一次
    drag: true,
    toggleMode: true, // 能换在迷你 和完整模式下 互相切换
    showMiniModeCover: true, // 迷你模式下 是否显示封面图
    showDownload: true,
    showPlay: true,
    showReload: true,
    showPlayMode: true,
    showThemeSwitch: true,
    showLyric: false,
    playModeTipVisible: false, // 手机端切换播放模式
    autoPlay: true,
    defaultVolume: 1,
    showProgressLoadBar: true, // 音频预加载进度
    seeked: true,
    playModeShowTime: 600, // 播放模式提示 显示时间,
    bounds: 'body', // mini 模式拖拽的可移动边界
    showMiniProcessBar: false, // 是否在迷你模式 显示进度条
    loadAudioErrorPlayNext: true, // 加载音频失败时 是否尝试播放下一首
    preload: false, // 是否在页面加载后立即加载音频
    glassBg: false, // 是否是毛玻璃效果
    remember: false, // 是否记住当前播放状态
    remove: true, // 音乐是否可以删除
    defaultPlayIndex: 0, // 默认播放索引
    getContainer: () => document.body, // 播放器挂载的节点
    autoHiddenCover: false, // 当前播放歌曲没有封面时是否自动隐藏
    onBeforeAudioDownload: () => {}, // 下载前转换音频地址等
    spaceBar: false, // 是否可以通过空格键 控制播放暂停
    showDestroy: false,
    showMediaSession: false,
    locale: LOCALE.en_US,
    responsive: true,
    icon: DEFAULT_ICON,
  }

  static propTypes = PROP_TYPES

  get locale() {
    const { locale } = this.props
    if (typeof locale === 'string') {
      return LOCALE_CONFIG[this.props.locale]
    }
    return locale ? { ...LOCALE_CONFIG[LOCALE.en_US], ...locale } : {}
  }

  get audioDuration() {
    const { audioLists, playId } = this.state
    if (!audioLists.length || !this.audio) {
      return 0
    }
    const { duration } = audioLists.find((audio) => audio.id === playId) || {}

    return Math.max(Number(duration) || this.audio.duration || 0, 0)
  }

  get isAudioCanPlay() {
    const { autoPlay } = this.props
    const { isInitAutoPlay, isAutoPlayWhenUserClicked } = this.state
    return isInitAutoPlay || autoPlay || isAutoPlayWhenUserClicked
  }

  get iconMap() {
    const Spin = () => (
      <span className="loading group">{this.props.icon.loading}</span>
    )
    return { ...DEFAULT_ICON, ...this.props.icon, loading: <Spin /> }
  }

  constructor(props) {
    super(props)

    this.audio = null
    this.targetId = 'music-player-controller'

    this._PLAY_MODE_ = Object.values(PLAY_MODE)
    this._PLAY_MODE_LENGTH_ = this._PLAY_MODE_.length

    this.player = createRef()
    this.destroyBtn = createRef()
  }

  render() {
    const {
      className,
      drag,
      style,
      showDownload,
      showPlay,
      showReload,
      showPlayMode,
      showThemeSwitch,
      toggleMode,
      showMiniModeCover,
      extendsContent,
      defaultPlayMode,
      seeked,
      showProgressLoadBar,
      bounds,
      defaultPosition,
      showMiniProcessBar,
      preload,
      glassBg,
      remove,
      lyricClassName,
      showLyric,
      getContainer,
      autoHiddenCover,
      showDestroy,
      responsive,
    } = this.props

    const { locale } = this

    const {
      toggle,
      playing,
      currentTime,
      soundValue,
      moveX,
      moveY,
      loading,
      audioListsPanelVisible,
      pause,
      theme,
      name,
      cover,
      singer,
      musicSrc,
      playId,
      isMobile,
      playMode,
      playModeTipVisible,
      playModelNameVisible,
      initAnimate,
      loadedProgress,
      audioLists,
      removeId,
      currentLyric,
      audioLyricVisible,
      isPlayDestroyed,
    } = this.state

    const preloadState =
      preload === false || preload === 'none'
        ? {}
        : preload === true
        ? { preload: 'auto' }
        : { preload }

    const panelToggleAnimate = initAnimate
      ? { show: audioListsPanelVisible, hide: !audioListsPanelVisible }
      : { show: audioListsPanelVisible }

    const currentPlayMode =
      PLAY_MODE[playMode || defaultPlayMode] || PLAY_MODE.order
    const currentPlayModeName = locale.playModeText[currentPlayMode]

    const miniModeCoverConfig =
      (showMiniModeCover && !autoHiddenCover) || (autoHiddenCover && cover)
        ? {
            style: {
              backgroundImage: `url(${cover})`,
            },
          }
        : {}

    const formattedCurrentTime = formatTime(currentTime)
    const formattedAudioDuration = formatTime(this.audioDuration)

    const progressHandler = seeked
      ? {
          onChange: this.onProgressChange,
          onAfterChange: this.onAudioSeeked,
        }
      : {}

    // 进度条
    const ProgressBar = (
      <Slider
        max={Math.ceil(this.audioDuration)}
        defaultValue={0}
        value={Math.ceil(currentTime)}
        {...progressHandler}
        {...sliderBaseOptions}
      />
    )

    // 下载按钮
    const DownloadComponent = showDownload && (
      <span
        className="group audio-download"
        onClick={this.onAudioDownload}
        title={locale.downloadText}
      >
        {this.iconMap.download}
      </span>
    )

    // 主题开关
    const ThemeSwitchComponent = showThemeSwitch && (
      <span className="group theme-switch">
        <Switch
          className="theme-switch-container"
          onChange={this.themeChange}
          checkedChildren={locale.lightThemeText}
          unCheckedChildren={locale.darkThemeText}
          checked={theme === THEME.LIGHT}
          title={locale.switchThemeText}
        />
      </span>
    )

    // 重放
    const ReloadComponent = showReload && (
      <span
        className="group reload-btn"
        onClick={this.onAudioReload}
        title={locale.reloadText}
      >
        {this.iconMap.reload}
      </span>
    )

    // 歌词
    const LyricComponent = showLyric && (
      <span
        className={cls('group lyric-btn', {
          'lyric-btn-active': audioLyricVisible,
        })}
        onClick={this.toggleAudioLyric}
        title={locale.toggleLyricText}
      >
        {this.iconMap.lyric}
      </span>
    )

    // 播放模式
    const PlayModeComponent = showPlayMode && (
      <span
        className={cls('group loop-btn')}
        onClick={this.togglePlayMode}
        title={locale.playModeText[currentPlayMode]}
      >
        {this.renderPlayModeIcon(currentPlayMode)}
      </span>
    )

    const miniProcessBarR = isMobile ? 30 : 40

    const DestroyComponent = showDestroy && (
      <span
        title={locale.destroyText}
        className="group destroy-btn"
        ref={this.destroyBtn}
        onClick={!drag || toggle ? this.onDestroyPlayer : undefined}
      >
        {this.iconMap.destroy}
      </span>
    )

    const AudioController = (
      <div
        className={cls('react-jinke-music-player')}
        style={defaultPosition}
        tabIndex="-1"
      >
        <div className={cls('music-player')}>
          {showMiniProcessBar && (
            <CircleProcessBar
              progress={currentTime / this.audioDuration}
              r={miniProcessBarR}
            />
          )}
          <div
            id={this.targetId}
            className={cls('scale', 'music-player-controller', {
              'music-player-playing': this.state.playing,
            })}
            {...miniModeCoverConfig}
          >
            {loading ? (
              this.iconMap.loading
            ) : (
              <>
                <span className="controller-title">
                  {locale.controllerTitle}
                </span>
                <div className="music-player-controller-setting">
                  {toggle ? locale.closeText : locale.openText}
                </div>
              </>
            )}
          </div>
          {DestroyComponent}
        </div>
      </div>
    )

    const container = getContainer() || document.body
    const audioTitle = this.getAudioTitle()

    if (isPlayDestroyed) {
      return null
    }

    return createPortal(
      <div
        className={cls(
          'react-jinke-music-player-main',
          {
            'light-theme': theme === THEME.LIGHT,
            'dark-theme': theme === THEME.DARK,
          },
          className,
        )}
        style={style}
        ref={this.player}
        tabIndex="-1"
      >
        {toggle && isMobile && responsive && (
          <AudioPlayerMobile
            playing={playing}
            loading={loading}
            pause={pause}
            name={name}
            singer={singer}
            cover={cover}
            themeSwitch={ThemeSwitchComponent}
            duration={formattedAudioDuration}
            currentTime={formattedCurrentTime}
            progressBar={ProgressBar}
            onPlay={this.onTogglePlay}
            currentPlayModeName={currentPlayModeName}
            playMode={PlayModeComponent}
            audioNextPlay={this.audioNextPlay}
            audioPrevPlay={this.audioPrevPlay}
            icon={{
              ...this.iconMap,
              reload: ReloadComponent,
              download: DownloadComponent,
              lyric: LyricComponent,
            }}
            playModeTipVisible={playModeTipVisible}
            openAudioListsPanel={this.openAudioListsPanel}
            onClose={this.onHidePanel}
            extendsContent={extendsContent}
            glassBg={glassBg}
            autoHiddenCover={autoHiddenCover}
            onCoverClick={this.onCoverClick}
            locale={locale}
          />
        )}

        {toggle ? undefined : drag ? (
          <Draggable
            bounds={bounds}
            position={{ x: moveX, y: moveY }}
            onDrag={this.onControllerDrag}
            onStop={this.onControllerDragStop}
            onStart={this.onControllerDragStart}
          >
            {AudioController}
          </Draggable>
        ) : (
          AudioController
        )}
        {toggle && (!isMobile || !responsive) && (
          <div
            className={cls('music-player-panel', 'translate', {
              'glass-bg': glassBg,
            })}
          >
            <section className="panel-content">
              {/* lgtm [js/trivial-conditional] */}
              {(!autoHiddenCover || (autoHiddenCover && cover)) && (
                <div
                  className={cls('img-content', 'img-rotate', {
                    'img-rotate-pause': pause || !playing || !cover,
                  })}
                  style={{ backgroundImage: `url(${cover})` }}
                  onClick={() => this.onCoverClick()}
                />
              )}
              <div className="progress-bar-content">
                <span className="audio-title" title={audioTitle}>
                  {audioTitle}
                </span>
                <section className="audio-main">
                  <span className="current-time" title={formattedCurrentTime}>
                    {loading ? '--' : formattedCurrentTime}
                  </span>
                  <div className="progress-bar">
                    {showProgressLoadBar && (
                      <div
                        className="progress-load-bar"
                        style={{ width: `${Math.min(loadedProgress, 100)}%` }}
                      />
                    )}
                    {ProgressBar}
                  </div>
                  <span className="duration" title={formattedAudioDuration}>
                    {loading ? '--' : formattedAudioDuration}
                  </span>
                </section>
              </div>
              <div className="player-content">
                {loading ? (
                  this.iconMap.loading
                ) : showPlay ? (
                  <span className="group">
                    <span
                      className="group prev-audio"
                      title={locale.previousTrackText}
                      onClick={this.audioPrevPlay}
                    >
                      {this.iconMap.prev}
                    </span>
                    <span
                      className="group play-btn"
                      onClick={this.onTogglePlay}
                      title={
                        playing
                          ? locale.clickToPauseText
                          : locale.clickToPlayText
                      }
                    >
                      {playing ? (
                        <span>{this.iconMap.pause}</span>
                      ) : (
                        <span>{this.iconMap.play}</span>
                      )}
                    </span>
                    <span
                      className="group next-audio"
                      title={locale.nextTrackText}
                      onClick={this.audioNextPlay}
                    >
                      {this.iconMap.next}
                    </span>
                  </span>
                ) : undefined}

                {ReloadComponent}
                {DownloadComponent}
                {ThemeSwitchComponent}
                {extendsContent || null}

                {/* 音量控制 */}
                <span className="group play-sounds" title={locale.volumeText}>
                  {soundValue === 0 ? (
                    <span className="sounds-icon" onClick={this.onResetVolume}>
                      {this.iconMap.mute}
                    </span>
                  ) : (
                    <span className="sounds-icon" onClick={this.onMute}>
                      {this.iconMap.volume}
                    </span>
                  )}
                  <Slider
                    max={1}
                    value={soundValue}
                    onChange={this.audioSoundChange}
                    className="sound-operation"
                    {...sliderBaseOptions}
                  />
                </span>

                {PlayModeComponent}

                {LyricComponent}

                <span
                  className="group audio-lists-btn"
                  title={locale.playListsText}
                  onClick={this.openAudioListsPanel}
                >
                  <span className="audio-lists-icon">
                    {this.iconMap.playLists}
                  </span>
                  <span className="audio-lists-num">{audioLists.length}</span>
                </span>

                {toggleMode && (
                  <span
                    className="group hide-panel"
                    title={locale.toggleMiniModeText}
                    onClick={this.onHidePanel}
                  >
                    {this.iconMap.toggle}
                  </span>
                )}

                {DestroyComponent}
              </div>
            </section>
          </div>
        )}
        {/* 播放列表面板 */}
        <AudioListsPanel
          playId={playId}
          pause={pause}
          loading={loading}
          visible={audioListsPanelVisible}
          audioLists={audioLists}
          onPlay={this.audioListsPlay}
          onCancel={this.closeAudioListsPanel}
          icon={this.iconMap}
          isMobile={isMobile}
          panelToggleAnimate={panelToggleAnimate}
          glassBg={glassBg}
          cover={cover}
          remove={remove}
          onDelete={this.onDeleteAudioLists}
          removeId={removeId}
          audioListsDragEnd={this.audioListsDragEnd}
          locale={locale}
        />
        {/* 播放模式提示框 */}
        {!isMobile && (
          <PlayModel
            visible={playModelNameVisible}
            value={currentPlayModeName}
          />
        )}
        {/* 歌词 */}
        {audioLyricVisible && (
          <Draggable>
            <div className={cls('music-player-lyric', lyricClassName)}>
              {currentLyric || locale.emptyLyricText}
            </div>
          </Draggable>
        )}
        <audio
          className="music-player-audio"
          title={audioTitle}
          {...preloadState}
          src={musicSrc}
          ref={(node) => {
            this.audio = node
          }}
        />
      </div>,
      container,
    )
  }

  getPlayIndex = (
    playIndex = this.state.playIndex,
    audioLists = this.state.audioLists,
  ) => {
    return Math.max(0, Math.min(audioLists.length - 1, playIndex))
  }

  onCoverClick = (mode = MODE.FULL) => {
    if (this.props.onCoverClick) {
      this.props.onCoverClick(
        mode,
        this.state.audioLists,
        this.getBaseAudioInfo(),
      )
    }
  }

  getAudioTitle = () => {
    // 暂时兼容
    const { audioTitle } = this.locale || {}
    const { name, singer } = this.state
    if (typeof audioTitle === 'function' && this.audio) {
      return audioTitle(this.getBaseAudioInfo())
    }
    return audioTitle || `${name} ${singer ? `- ${singer}` : ''}`
  }

  toggleAudioLyric = () => {
    this.setState({
      audioLyricVisible: !this.state.audioLyricVisible,
    })
  }

  // 播放模式切换
  togglePlayMode = () => {
    let index = this._PLAY_MODE_.findIndex(
      (mode) => mode === this.state.playMode,
    )
    const playMode =
      index === this._PLAY_MODE_LENGTH_ - 1
        ? this._PLAY_MODE_[0]
        : this._PLAY_MODE_[++index]
    this.setState({
      playMode,
      playModelNameVisible: true,
      playModeTipVisible: true,
    })
    this.props.onPlayModeChange && this.props.onPlayModeChange(playMode)

    clearTimeout(this.playModelTimer)
    this.playModelTimer = setTimeout(() => {
      this.setState({ playModelNameVisible: false, playModeTipVisible: false })
    }, this.props.playModeShowTime)
  }

  // 渲染播放模式 对应按钮
  renderPlayModeIcon = (playMode) => {
    const animateProps = {
      className: 'react-jinke-music-player-mode-icon',
    }
    let IconNode = null
    switch (playMode) {
      case PLAY_MODE.order:
        IconNode = cloneElement(this.iconMap.order, animateProps)
        break
      case PLAY_MODE.orderLoop:
        IconNode = cloneElement(this.iconMap.orderLoop, animateProps)
        break
      case PLAY_MODE.singleLoop:
        IconNode = cloneElement(this.iconMap.loop, animateProps)
        break
      case PLAY_MODE.shufflePlay:
        IconNode = cloneElement(this.iconMap.shuffle, animateProps)
        break
      default:
        IconNode = cloneElement(this.iconMap.order, animateProps)
    }
    return IconNode
  }

  /**
   * 音乐列表面板选择歌曲
   * 上一首 下一首
   * 音乐结束
   * 通用方法
   * @tip: ignore 如果 为 true playId相同则不暂停 可是重新播放 适用于 随机播放 重新播放等逻辑
   */
  audioListsPlay = (playId, ignore = false, state = this.state) => {
    const { playId: currentPlayId, pause, playing, audioLists } = state
    if (Array.isArray(audioLists) && audioLists.length === 0) {
      // eslint-disable-next-line no-console
      return console.warn(
        'Warning: Your playlist has no songs. and cannot play !',
      )
    }
    // 如果点击当前项 就暂停 或者播放
    if (playId === currentPlayId && !ignore) {
      this.setState({ pause: !pause, playing: !playing })
      return pause ? this.audio.play() : this.audio.pause()
    }

    const playIndex = audioLists.findIndex((audio) => audio.id === playId)
    const { name, cover, musicSrc, singer, lyric = '' } =
      audioLists[playIndex] || {}

    const loadAudio = (originMusicSrc) => {
      this.setState(
        {
          name,
          cover,
          musicSrc: originMusicSrc,
          singer,
          playId,
          lyric,
          currentTime: 0,
          playing: false,
          loading: true,
          loadedProgress: 0,
          playIndex,
          isAutoPlayWhenUserClicked: true,
        },
        () => {
          this.lyric && this.lyric.stop()
          this.audio.load()
          this.updateMediaSessionMetadata()
          setTimeout(() => {
            this.initLyricParser()
          }, 0)
        },
      )
      this.props.onAudioPlay && this.props.onAudioPlay(this.getBaseAudioInfo())
      this.props.onAudioPlayTrackChange &&
        this.props.onAudioPlayTrackChange(
          playId,
          audioLists,
          this.getBaseAudioInfo(),
        )
      this.props.onPlayIndexChange && this.props.onPlayIndexChange(playIndex)
    }

    switch (typeof musicSrc) {
      case 'function':
        musicSrc().then(loadAudio, this.onAudioError)
        break
      default:
        loadAudio(musicSrc)
    }
  }

  resetAudioStatus = () => {
    this.audio.pause()
    this.lyric && this.lyric.stop()
    this.initPlayInfo([])
    this.setState({
      currentTime: 0,
      loading: false,
      playing: false,
      pause: true,
      lyric: '',
      currentLyric: '',
      playId: this.initPlayId,
    })
  }

  clearAudioLists = () => {
    this.props.onAudioListsChange && this.props.onAudioListsChange('', [], {})
    this.resetAudioStatus()
  }

  onDeleteAudioLists = (audioId) => (e) => {
    e.stopPropagation()
    // 如果不 传 id  删除全部
    const { audioLists, playId } = this.state
    if (audioLists.length < 1) {
      return
    }
    this.lyric && this.lyric.stop()
    if (!audioId) {
      this.clearAudioLists()
      return
    }
    const newAudioLists = [...audioLists].filter(
      (audio) => audio.id !== audioId,
    )
    // 触发删除动画,等动画结束 删除列表
    this.setState({ removeId: audioId })
    setTimeout(() => {
      this.setState(
        {
          audioLists: newAudioLists,
          removeId: -1,
        },
        () => {
          if (!newAudioLists.length) {
            return this.resetAudioStatus()
          }
          // 如果删除的是当前正在播放的 顺延下一首播放
          if (audioId === playId) {
            this.handlePlay(PLAY_MODE.orderLoop)
          }
        },
      )
    }, AUDIO_LIST_REMOVE_ANIMATE_TIME)

    this.props.onAudioListsChange &&
      this.props.onAudioListsChange(
        playId,
        newAudioLists,
        this.getBaseAudioInfo(),
      )
  }

  openAudioListsPanel = () => {
    this.setState(({ audioListsPanelVisible }) => ({
      initAnimate: true,
      audioListsPanelVisible: !audioListsPanelVisible,
    }))
    this.props.onAudioListsPanelChange &&
      this.props.onAudioListsPanelChange(!this.state.audioListsPanelVisible)
  }

  closeAudioListsPanel = (e) => {
    e.stopPropagation()
    this._closeAudioListsPanel()
  }

  _closeAudioListsPanel = () => {
    this.setState({ audioListsPanelVisible: false })
    this.props.onAudioListsPanelChange &&
      this.props.onAudioListsPanelChange(false)
  }

  themeChange = (isLight) => {
    const theme = isLight ? THEME.LIGHT : THEME.DARK
    this.setState({
      theme,
    })
    this.props.onThemeChange && this.props.onThemeChange(theme)
  }

  onAudioDownload = () => {
    const { musicSrc } = this.state
    if (this.state.musicSrc) {
      const { customDownloader } = this.props
      const baseAudioInfo = this.getBaseAudioInfo()
      const onBeforeAudioDownload = this.props.onBeforeAudioDownload(
        baseAudioInfo,
      )
      let transformedDownloadAudioInfo = {}
      if (onBeforeAudioDownload && onBeforeAudioDownload.then) {
        onBeforeAudioDownload.then((info) => {
          const { src, filename, mimeType } = info
          transformedDownloadAudioInfo = info
          if (customDownloader) {
            customDownloader(info)
          } else {
            download(src, filename, mimeType)
          }
        })
      } else {
        customDownloader
          ? customDownloader({ src: musicSrc })
          : download(musicSrc)
      }
      this.props.onAudioDownload &&
        this.props.onAudioDownload(baseAudioInfo, transformedDownloadAudioInfo)
    }
  }

  onControllerDrag = () => {
    this.isDrag = true
  }

  onControllerDragStart = () => {
    this.isDrag = false
  }

  onControllerDragStop = (e, { x, y }) => {
    if (
      this.props.showDestroy &&
      this.destroyBtn &&
      this.destroyBtn.current &&
      this.destroyBtn.current.contains(e.target)
    ) {
      this.onDestroyPlayer()
      return
    }
    if (!this.isDrag) {
      if (this.state.isNeedMobileHack) {
        this.loadAndPlayAudio()
        this.setState({ isNeedMobileHack: false })
      }
      this.openPanel()
      this.onCoverClick(MODE.MINI)
    }
    this.setState({ moveX: x, moveY: y })
  }

  onResetVolume = () => {
    const { currentAudioVolume } = this.state
    this.setAudioVolume(currentAudioVolume || 0.1)
  }

  setAudioVolume = (value) => {
    this.audio.volume = value
    this.setState({
      currentAudioVolume: value,
      soundValue: value,
    })
  }

  stopAll = (target) => {
    target.stopPropagation()
    target.preventDefault()
  }

  getBoundingClientRect = (ele) => {
    const { left, top } = ele.getBoundingClientRect()
    return {
      left,
      top,
    }
  }

  onAudioReload = () => {
    if (this.props.audioLists.length) {
      this.handlePlay(PLAY_MODE.singleLoop)
      this.props.onAudioReload &&
        this.props.onAudioReload(this.getBaseAudioInfo())
    }
  }

  openPanel = () => {
    const { toggleMode, spaceBar } = this.props
    if (toggleMode) {
      this.setState({ toggle: true })
      this.props.onModeChange && this.props.onModeChange(MODE.FULL)
      if (spaceBar && this.player.current) {
        this.player.current.focus({ preventScroll: true })
      }
    }
  }

  onHidePanel = () => {
    this.setState({ toggle: false, audioListsPanelVisible: false })
    this.props.onModeChange && this.props.onModeChange(MODE.MINI)
  }

  onDestroyPlayer = () => {
    if (this.props.onBeforeDestroy) {
      const onBeforeDestroy = Promise.resolve(
        this.props.onBeforeDestroy(
          this.state.playId,
          this.state.audioLists,
          this.getBaseAudioInfo(),
        ),
      )

      if (onBeforeDestroy && onBeforeDestroy.then) {
        onBeforeDestroy
          .then(() => {
            this._onDestroyPlayer()
          })
          // ignore unhandledrejection handler
          .catch(() => {})
      }
      return
    }
    this._onDestroyPlayer()
  }

  _onDestroyPlayer = () => {
    this.unInstallPlayer()
  }

  _onDestroyed = () => {
    this.setState({ isPlayDestroyed: true })
    if (this.props.onDestroyed) {
      this.props.onDestroyed(
        this.state.playId,
        this.state.audioLists,
        this.getBaseAudioInfo(),
      )
    }
  }

  getCurrentPlayIndex = () => {
    return this.state.audioLists.findIndex(
      (audio) => audio.id === this.state.playId,
    )
  }

  // 返回给使用者的 音乐信息
  getBaseAudioInfo() {
    const {
      cover,
      name,
      musicSrc,
      soundValue,
      lyric,
      audioLists,
      currentLyric,
    } = this.state

    const {
      currentTime,
      muted,
      networkState,
      readyState,
      played,
      paused,
      ended,
      startDate,
    } = this.audio || {}

    const currentPlayIndex = this.getCurrentPlayIndex()
    const currentAudioListInfo = audioLists[currentPlayIndex] || {}

    return {
      ...currentAudioListInfo,
      cover,
      name,
      musicSrc,
      volume: soundValue,
      currentTime,
      duration: this.audioDuration,
      muted,
      networkState,
      readyState,
      played,
      paused,
      ended,
      startDate,
      lyric,
      currentLyric,
      playIndex: currentPlayIndex,
    }
  }

  // 播放
  onTogglePlay = () => {
    if (this.state.audioLists.length >= 1) {
      if (this.state.playing) {
        return this.audio.pause()
      }
      this.setState(
        // lgtm [js/react/inconsistent-state-update]
        { isAutoPlayWhenUserClicked: true },
        this.loadAndPlayAudio,
      )
    }
  }

  canPlay = () => {
    this.setState({
      loading: false,
      playing: false,
    })

    if (this.isAudioCanPlay) {
      this.loadAndPlayAudio()
    }
  }

  onAudioPause = () => {
    this.setState({ playing: false, pause: true })
    this.props.onAudioPause && this.props.onAudioPause(this.getBaseAudioInfo())
    if (this.state.lyric && this.lyric) {
      this.lyric.togglePlay()
    }
  }

  onAudioPlay = () => {
    this.setState({ playing: true, loading: false })
    this.props.onAudioPlay && this.props.onAudioPlay(this.getBaseAudioInfo())
    if (this.state.lyric && this.lyric) {
      this.lyric.togglePlay()
    }
  }

  onSetAudioLoadedProgress = () => {
    const { buffered: timeRanges, duration } = this.audio
    if (timeRanges.length && timeRanges.end) {
      const loadedProgress =
        (timeRanges.end(timeRanges.length - 1) / duration) * 100

      this.setState({ loadedProgress })
    }
  }

  // 加载音频
  loadAndPlayAudio = () => {
    const { remember } = this.props
    const { isInitRemember } = this.state
    const { networkState } = this.audio

    this.setState({ loading: true })

    if (networkState !== NETWORK_STATE.NETWORK_NO_SOURCE) {
      const { pause } = this.getLastPlayStatus()
      const isLastPause = remember && !isInitRemember && pause
      this.setState(
        {
          playing: remember ? !isLastPause : this.isAudioCanPlay,
          loading: false,
          pause: remember ? isLastPause : !this.isAudioCanPlay,
        },
        () => {
          if (remember ? !isLastPause : this.isAudioCanPlay) {
            // fuck Safari is need muted :(
            // this.audio.muted = true
            this.audio.play()
          }
          this.setState({
            isInitAutoPlay: true,
            isInitRemember: true,
            isAutoPlayWhenUserClicked: false,
          })
        },
      )
    } else {
      this.onAudioError({
        reason:
          '[loadAndPlayAudio]: Failed to load because no supported source was found.',
      })
    }
  }

  onAudioError = (error) => {
    const { playMode, audioLists, playId, musicSrc } = this.state
    const { loadAudioErrorPlayNext } = this.props
    const isSingleLoop = playMode === PLAY_MODE.singleLoop
    const currentPlayMode = isSingleLoop ? PLAY_MODE.order : playMode

    this.lyric && this.lyric.stop()

    // 如果当前音乐加载出错 尝试播放下一首
    if (loadAudioErrorPlayNext && audioLists.length) {
      const isLastAudio =
        (playMode === PLAY_MODE.order || playMode === PLAY_MODE.orderLoop) &&
        playId === audioLists[audioLists.length - 1].id
      if (!isLastAudio) {
        this.handlePlay(currentPlayMode, true)
      }
    }

    // 如果删除歌曲或其他原因导致列表为空时
    // 这时候会触发 https://developer.mozilla.org/en-US/docs/Web/API/MediaError
    if (musicSrc) {
      this.props.onAudioError &&
        this.props.onAudioError(
          this.audio.error || (error && error.reason) || null,
          playId,
          audioLists,
          this.getBaseAudioInfo(),
        )
    }
  }

  // isNext true 下一首  false
  handlePlay = (playMode, isNext = true) => {
    const { playId, audioLists } = this.state
    const audioListsLen = audioLists.length
    if (!audioListsLen) {
      return
    }
    const currentPlayIndex = this.getCurrentPlayIndex()

    switch (playMode) {
      // 顺序播放
      case PLAY_MODE.order:
        // 拖拽排序后 或者 正常播放 到最后一首歌 就暂停
        if (currentPlayIndex === audioListsLen - 1) {
          this.audio.pause()
          return
        }
        this.audioListsPlay(
          isNext
            ? audioLists[currentPlayIndex + 1].id
            : audioLists[currentPlayIndex - 1].id,
        )
        break

      // 列表循环
      case PLAY_MODE.orderLoop:
        if (isNext) {
          if (currentPlayIndex === audioListsLen - 1) {
            return this.audioListsPlay(audioLists[0].id)
          }
          this.audioListsPlay(audioLists[currentPlayIndex + 1].id)
        } else {
          if (currentPlayIndex === 0) {
            return this.audioListsPlay(audioLists[audioListsLen - 1].id)
          }
          this.audioListsPlay(audioLists[currentPlayIndex - 1].id)
        }
        break

      // 单曲循环
      case PLAY_MODE.singleLoop:
        this.audio.currentTime = 0
        this.audioListsPlay(playId, true)
        break

      // 随机播放
      case PLAY_MODE.shufflePlay:
        {
          let randomIndex = createRandomNum(0, audioListsLen - 1)
          if (randomIndex === this.getCurrentPlayIndex()) {
            randomIndex = this.getPlayIndex(randomIndex + 1)
          }
          const randomPlayId = (audioLists[randomIndex] || {}).id
          this.audioListsPlay(randomPlayId, true)
        }
        break
      default:
        break
    }
  }

  // 音频播放结束
  onAudioEnd = () => {
    this.props.onAudioEnded &&
      this.props.onAudioEnded(
        this.state.playId,
        this.state.audioLists,
        this.getBaseAudioInfo(),
      )
    this.handlePlay(this.state.playMode)
  }

  /**
   * 上一首 下一首 通用方法
   * 除随机播放之外 都以  点击了上一首或者下一首 则以列表循环的方式 顺序放下一首歌
   * 参考常规播放器的逻辑
   */
  audioPrevAndNextBasePlayHandle = (isNext = true) => {
    const { playMode } = this.state
    let _playMode = ''
    switch (playMode) {
      case PLAY_MODE.shufflePlay:
        _playMode = playMode
        break
      default:
        _playMode = PLAY_MODE.orderLoop
        break
    }
    this.handlePlay(_playMode, isNext)
  }

  // 上一首
  audioPrevPlay = () => {
    this.audioPrevAndNextBasePlayHandle(false)
  }

  // 下一首
  audioNextPlay = () => {
    this.audioPrevAndNextBasePlayHandle(true)
  }

  // 播放进度更新
  audioTimeUpdate = () => {
    const { currentTime } = this.audio
    this.setState({ currentTime })
    if (this.props.remember) {
      this.saveLastPlayStatus()
    }
    this.props.onAudioProgress &&
      this.props.onAudioProgress(this.getBaseAudioInfo())
  }

  // 音量改变
  audioSoundChange = (value) => {
    this.setAudioVolume(value)
  }

  onAudioVolumeChange = () => {
    const { volume } = this.audio
    this.setState({
      soundValue: volume,
    })
    this.props.onAudioVolumeChange && this.props.onAudioVolumeChange(volume)
  }

  onProgressChange = (value) => {
    if (this.audio) {
      this.audio.currentTime = value
    }
  }

  // 进度条跳跃
  onAudioSeeked = () => {
    if (this.state.audioLists.length >= 1) {
      this.lyric && this.lyric.seek(this.audio.currentTime * 1000)
      if (this.state.playing && !this.state.pause) {
        this.setState({ playing: true }, () => {
          this.loadAndPlayAudio()
        })
      } else {
        this.lyric && this.lyric.stop()
      }
      this.props.onAudioSeeked &&
        this.props.onAudioSeeked(this.getBaseAudioInfo())
    }
  }

  // 静音
  onMute = () => {
    this.setState(
      {
        soundValue: 0,
        currentAudioVolume: this.audio.volume,
      },
      () => {
        this.audio.volume = 0
      },
    )
  }

  // 加载中断
  onAudioAbort = (e) => {
    const { audioLists, playId } = this.state
    const audioInfo = this.getBaseAudioInfo()
    const mergedAudioInfo = { ...e, ...audioInfo }
    this.props.onAudioAbort &&
      this.props.onAudioAbort(playId, audioLists, mergedAudioInfo)
    if (audioLists.length) {
      this.audio.pause()
      this.state.isInitAutoPlay && this.audio.play()
      this.lyric && this.lyric.stop()
    }
  }

  // 切换播放器模式
  toggleMode = (mode) => {
    if (mode === MODE.FULL) {
      this.setState({ toggle: true })
    }
  }

  toggleTheme = (theme) => {
    this.setState({ theme })
  }

  // 列表拖拽排序
  audioListsDragEnd = (fromIndex, toIndex) => {
    const { playId, audioLists } = this.state
    const _audioLists = [...audioLists]
    const item = _audioLists.splice(fromIndex, 1)[0]
    _audioLists.splice(toIndex, 0, item)

    // 如果拖动正在播放的歌曲 播放Id 等于 拖动后的index
    const _playId = fromIndex === playId ? toIndex : playId

    this.setState({ audioLists: _audioLists, playId: _playId })

    this.props.onAudioListsDragEnd &&
      this.props.onAudioListsDragEnd(fromIndex, toIndex)

    this.props.onAudioListsChange &&
      this.props.onAudioListsChange(
        _playId,
        _audioLists,
        this.getBaseAudioInfo(),
      )
  }

  saveLastPlayStatus = () => {
    const {
      currentTime,
      playId,
      theme,
      soundValue,
      playMode,
      name,
      cover,
      singer,
      musicSrc,
      pause,
    } = this.state
    const lastPlayStatus = JSON.stringify({
      currentTime,
      playId,
      theme,
      playMode,
      soundValue,
      name,
      cover,
      singer,
      musicSrc,
      pause,
    })
    localStorage.setItem('lastPlayStatus', lastPlayStatus)
  }

  getLastPlayStatus = () => {
    const {
      theme,
      defaultPlayMode,
      playMode,
      defaultPlayIndex,
      playIndex,
    } = this.props

    const status = {
      currentTime: 0,
      playMode: playMode || defaultPlayMode || PLAY_MODE.order,
      name: '',
      cover: '',
      singer: '',
      musicSrc: '',
      lyric: '',
      playId: this.getDefaultPlayId(),
      theme,
      pause: false,
      playIndex: playIndex || defaultPlayIndex || 0,
    }
    try {
      return JSON.parse(localStorage.getItem('lastPlayStatus')) || status
    } catch (error) {
      return status
    }
  }

  mockAutoPlayForMobile = () => {
    if (this.props.autoPlay && !this.state.playing && this.state.pause) {
      this.audio.load()
      this.audio.pause()
      this.audio.play()
    }
  }

  bindMobileAutoPlayEvents = () => {
    document.addEventListener(
      'touchstart',
      () => {
        this.mockAutoPlayForMobile()
      },
      { once: true },
    )
    // 监听微信准备就绪事件
    document.addEventListener('WeixinJSBridgeReady', () => {
      this.mockAutoPlayForMobile()
    })
  }

  bindSafariAutoPlayEvents = () => {
    document.addEventListener(
      'click',
      () => {
        this.mockAutoPlayForMobile()
      },
      { once: true },
    )
  }

  unBindEvents = (...options) => {
    this.bindEvents(...options)
  }

  /**
   * 绑定 audio 标签 事件
   */
  bindEvents = (
    target = this.audio,
    eventsNames = {
      waiting: this.loadAndPlayAudio,
      canplay: this.canPlay,
      error: this.onAudioError,
      ended: this.onAudioEnd,
      pause: this.onAudioPause,
      play: this.onAudioPlay,
      timeupdate: this.audioTimeUpdate,
      volumechange: this.onAudioVolumeChange,
      stalled: this.onAudioError, // 当浏览器尝试获取媒体数据，但数据不可用时
      abort: this.onAudioAbort,
      progress: this.onSetAudioLoadedProgress,
    },
    bind = true,
  ) => {
    const { once } = this.props
    for (const name in eventsNames) {
      const _events = eventsNames[name]
      if (target) {
        bind
          ? target.addEventListener(name, _events, {
              once: !!(once && name === 'play'),
            })
          : target.removeEventListener(name, _events)
      }
    }
  }

  getPlayId = (audioLists = this.state.audioLists) => {
    const playIndex = this.getPlayIndex(undefined, audioLists)
    const playId =
      this.state.playId || (audioLists[playIndex] && audioLists[playIndex].id)
    return playId
  }

  _getPlayInfo = (audioLists = []) => {
    const playId = this.getPlayId(audioLists)

    const { name = '', cover = '', singer = '', musicSrc = '', lyric = '' } =
      audioLists.find(({ id }) => id === playId) || {}

    return {
      name,
      cover,
      singer,
      musicSrc,
      lyric,
      audioLists,
      playId,
    }
  }

  getPlayInfo = (audioLists = []) => {
    const newAudioLists = audioLists.filter((audio) => !audio.id)
    const lastAudioLists = audioLists.filter((audio) => audio.id)
    const mergedAudioLists = [
      ...lastAudioLists,
      ...newAudioLists.map((info) => {
        return {
          ...info,
          id: uuId(),
        }
      }),
    ]
    return this._getPlayInfo(mergedAudioLists)
  }

  // I change the name of getPlayInfo to getPlayInfoOfNewList because i didn't want to change the prior changes
  // the only thing this function does is to add id to audiolist elements.
  getPlayInfoOfNewList = (audioLists = []) => {
    const _audioLists = audioLists.map((info) => {
      return {
        ...info,
        id: uuId(),
      }
    })

    return this._getPlayInfo(_audioLists)
  }

  initPlayInfo = (audioLists, cb) => {
    const info = this.getPlayInfo(audioLists)

    switch (typeof info.musicSrc) {
      case 'function':
        info.musicSrc().then((originMusicSrc) => {
          this.setState({ ...info, musicSrc: originMusicSrc }, cb)
        }, this.onAudioError)
        break
      default:
        this.setState(info, cb)
    }
  }

  addMatchMediaListener = (query, handler) => {
    const media = window.matchMedia(query)
    handler(media)
    if ('addEventListener' in media) {
      media.addEventListener('change', handler)
    } else {
      media.addListener(handler)
    }
    return media
  }

  removeMatchMediaListener = (media, handler) => {
    if (media) {
      if ('removeEventListener' in media) {
        media.removeEventListener('change', handler)
      } else {
        media.removeListener(handler)
      }
    }
  }

  addMobileListener = () => {
    this.mobileMedia = this.addMatchMediaListener(
      MEDIA_QUERY.MOBILE,
      this.mobileMediaHandler,
    )
  }

  removeMobileListener = () => {
    this.removeMatchMediaListener(this.mobileMedia, this.mobileMediaHandler)
  }

  addSystemThemeListener = () => {
    this.systemThemeMedia = this.addMatchMediaListener(
      MEDIA_QUERY.DARK_THEME,
      this.systemThemeMediaHandler,
    )
  }

  removeSystemThemeListener = () => {
    this.removeMatchMediaListener(
      this.systemThemeMedia,
      this.systemThemeMediaHandler,
    )
  }

  mobileMediaHandler = ({ matches }) => {
    this.setState({
      isMobile: !!matches,
    })
  }

  systemThemeMediaHandler = ({ matches }) => {
    if (this.props.theme === THEME.AUTO) {
      const theme = matches ? THEME.DARK : THEME.LIGHT
      this.updateTheme(theme)
    }
  }

  setDefaultAudioVolume = () => {
    const { defaultVolume, remember } = this.props
    // 音量 [0-1]
    this.defaultVolume = Math.max(0, Math.min(defaultVolume, 1))
    const { soundValue = this.defaultVolume } = this.getLastPlayStatus()
    this.setAudioVolume(remember ? soundValue : this.defaultVolume)
  }

  getDefaultPlayId = (audioLists = this.props.audioLists) => {
    const playIndex = this.getPlayIndex()
    return audioLists[playIndex] && audioLists[playIndex].id
  }

  initLyricParser = () => {
    this.lyric = new Lyric(this.state.lyric, this.onLyricChange)
    this.setState({
      currentLyric: this.lyric.lines[0] && this.lyric.lines[0].text,
    })
  }

  onLyricChange = ({ lineNum, txt }) => {
    this.setState({
      currentLyric: txt,
    })
    this.props.onAudioLyricChange && this.props.onAudioLyricChange(lineNum, txt)
  }

  updateTheme = (theme) => {
    if (
      theme &&
      theme !== this.props.theme &&
      Object.values(THEME).includes(theme)
    ) {
      this.setState({ theme })
    }
  }

  updateMode = (mode) => {
    if (
      mode &&
      mode !== this.props.mode &&
      Object.values(MODE).includes(mode)
    ) {
      this.setState({ toggle: mode === MODE.FULL })
      if (mode === MODE.MINI) {
        this._closeAudioListsPanel()
      }
    }
  }

  updatePlayMode = (playMode) => {
    if (!Object.values(PLAY_MODE).includes(playMode)) {
      return
    }
    if (playMode !== this.props.playMode) {
      this.setState({ playMode })
    }
  }

  updateAudioLists = (audioLists) => {
    const newAudioLists = [
      ...this.state.audioLists,
      ...audioLists.filter(
        (audio) =>
          this.state.audioLists.findIndex(
            (v) => v.musicSrc === audio.musicSrc,
          ) === -1,
      ),
    ]
    this.initPlayInfo(newAudioLists)
    this.bindEvents(this.audio)
    this.props.onAudioListsChange &&
      this.props.onAudioListsChange(
        this.state.playId,
        audioLists,
        this.getBaseAudioInfo(),
      )
  }

  loadNewAudioLists = ({
    audioLists,
    remember,
    playMode,
    theme,
    autoPlayInitLoadPlayList,
    playIndex,
  }) => {
    if (audioLists.length >= 1) {
      const info = this.getPlayInfoOfNewList(audioLists)
      const lastPlayStatus = remember
        ? this.getLastPlayStatus()
        : {
            playMode: playMode || PLAY_MODE.order,
            theme,
            playIndex: playIndex || 0,
          }

      const audioInfo = {
        ...info,
        ...lastPlayStatus,
        isInitAutoPlay: autoPlayInitLoadPlayList,
      }
      switch (typeof info.musicSrc) {
        case 'function':
          info.musicSrc().then((musicSrc) => {
            this.setState(
              {
                ...audioInfo,
                musicSrc,
              },
              () => {
                this.audio.load()
              },
            )
          }, this.onAudioError)
          break
        default:
          this.setState(audioInfo, () => {
            this.audio.load()
          })
      }
    }
  }

  changeAudioLists = (nextProps) => {
    this.resetAudioStatus()
    this.loadNewAudioLists(nextProps)
    this.props.onAudioListsChange &&
      this.props.onAudioListsChange(
        this.state.playId,
        nextProps.audioLists,
        this.getBaseAudioInfo(),
      )
  }

  updatePlayIndex = (playIndex) => {
    const currentPlayIndex = this.getCurrentPlayIndex()
    if (playIndex !== undefined && currentPlayIndex !== playIndex) {
      const currentPlay = this.state.audioLists[this.getPlayIndex(playIndex)]
      if (currentPlay && currentPlay.id) {
        this.audioListsPlay(currentPlay.id, true)
      }
    }
  }

  playByIndex = (index) => {
    this.updatePlayIndex(index)
  }

  appendAudio = (fromIndex, audioLists = []) => {
    if (!fromIndex && fromIndex !== 0) {
      // eslint-disable-next-line no-console
      console.error('Warning! function appendAudio(){} must have formIndex!')
      return
    }
    const newAudioLists = [...this.state.audioLists]
    const addedAudioLists = audioLists.map((audioInfo) => {
      return {
        id: uuId(),
        ...audioInfo,
      }
    })
    newAudioLists.splice(fromIndex, 0, ...addedAudioLists)
    this.setState({ audioLists: newAudioLists })
    this.props.onAudioListsChange &&
      this.props.onAudioListsChange(
        this.state.playId,
        newAudioLists,
        this.getBaseAudioInfo(),
      )
  }

  getEnhanceAudio = () => {
    const { audio } = this
    ;[
      {
        name: 'destroy',
        value: this.onDestroyPlayer,
      },
      {
        name: 'updatePlayIndex',
        value: this.updatePlayIndex,
      },
      {
        name: 'playByIndex',
        value: this.playByIndex,
      },
      {
        name: 'playNext',
        value: this.audioNextPlay,
      },
      {
        name: 'playPrev',
        value: this.audioPrevPlay,
      },
      {
        name: 'togglePlay',
        value: this.onTogglePlay,
      },
      {
        name: 'clear',
        value: this.clearAudioLists,
      },
      {
        name: 'appendAudio',
        value: this.appendAudio,
      },
    ].forEach(({ name, value }) => {
      Object.defineProperty(audio, name, {
        value,
        writable: false,
      })
    })
    return audio
  }

  onGetAudioInstance = () => {
    if (this.props.getAudioInstance) {
      this.props.getAudioInstance(this.getEnhanceAudio())
    }
  }

  updateMediaSessionMetadata = () => {
    if ('mediaSession' in navigator && this.props.showMediaSession) {
      const { name, cover, singer } = this.state
      const mediaMetaDataConfig = {
        title: name,
        artist: singer,
        album: name,
      }
      if (cover) {
        mediaMetaDataConfig.artwork = [
          '96x96',
          '128x128',
          '192x192',
          '256x256',
          '384x384',
          '512x512',
        ].map((size) => ({
          src: cover,
          sizes: size,
          type: 'image/png',
        }))
      }
      navigator.mediaSession.metadata = new MediaMetadata(mediaMetaDataConfig)
      this.updateMediaSessionPositionState()
    }
  }

  updateMediaSessionPositionState = () => {
    if ('setPositionState' in navigator.mediaSession) {
      try {
        const { audio } = this
        navigator.mediaSession.setPositionState({
          duration: this.audioDuration,
          playbackRate: audio.playbackRate || 1,
          position: audio.currentTime || 0,
        })
      } catch (error) {
        // eslint-disable-next-line no-console
        console.error('Update media session position state failed: ', error)
      }
    }
  }

  onAddMediaSession = () => {
    if ('mediaSession' in navigator && this.props.showMediaSession) {
      const defaultSkipTime = 10
      navigator.mediaSession.setActionHandler('play', this.onTogglePlay)
      navigator.mediaSession.setActionHandler('pause', this.onTogglePlay)
      navigator.mediaSession.setActionHandler('seekbackward', (details) => {
        const skipTime = details.seekOffset || defaultSkipTime
        this.audio.currentTime = Math.max(this.audio.currentTime - skipTime, 0)
        this.props.onAudioSeeked &&
          this.props.onAudioSeeked(this.getBaseAudioInfo())
      })
      navigator.mediaSession.setActionHandler('seekforward', (details) => {
        const skipTime = details.seekOffset || defaultSkipTime
        this.audio.currentTime = Math.min(
          this.audio.currentTime + skipTime,
          this.audioDuration,
        )
        this.props.onAudioSeeked &&
          this.props.onAudioSeeked(this.getBaseAudioInfo())
      })
      navigator.mediaSession.setActionHandler(
        'previoustrack',
        this.audioPrevPlay,
      )
      navigator.mediaSession.setActionHandler('nexttrack', this.audioNextPlay)

      setTimeout(() => {
        this.updateMediaSessionMetadata()
      }, 0)

      try {
        navigator.mediaSession.setActionHandler('seekto', (event) => {
          if (event.fastSeek && 'fastSeek' in this.audio) {
            this.audio.fastSeek(event.seekTime)
            return
          }
          this.audio.currentTime = event.seekTime
          this.updateMediaSessionPositionState()
        })
      } catch (error) {
        // eslint-disable-next-line no-console
        console.warn(
          'Warning! The "seekto" media session action is not supported.',
        )
      }
    }
  }

  bindUnhandledRejection = () => {
    window.addEventListener('unhandledrejection', this.onAudioError)
  }

  unBindUnhandledRejection = () => {
    window.removeEventListener('unhandledrejection', this.onAudioError)
  }

  bindKeyDownEvents = () => {
    if (this.props.spaceBar && this.player.current) {
      this.player.current.addEventListener('keydown', this.onKeyDown, false)
      this.player.current.focus({ preventScroll: true })
    }
  }

  unBindKeyDownEvents = () => {
    if (this.player.current) {
      this.player.current.removeEventListener('keydown', this.onKeyDown, false)
    }
  }

  onKeyDown = (e) => {
    const { spaceBar } = this.props
    if (spaceBar && e.keyCode === SPACE_BAR_KEYCODE) {
      this.onTogglePlay()
    }
  }

  initPlayer = (
    audioLists = this.props.audioLists,
    isBindKeyDownEvents = true,
  ) => {
    if (!Array.isArray(audioLists)) {
      return
    }
    if (audioLists.length) {
      this.setDefaultAudioVolume()
      this.bindUnhandledRejection()
      this.bindEvents(this.audio)
      this.initLyricParser()
      this.onAddMediaSession()
      if (IS_MOBILE) {
        this.bindMobileAutoPlayEvents()
      } else {
        if (isBindKeyDownEvents) {
          this.bindKeyDownEvents()
        }
        if (isSafari()) {
          this.bindSafariAutoPlayEvents()
        }
      }
    }
  }

  removeLyric = () => {
    if (this.lyric) {
      this.lyric.stop()
      this.lyric = undefined
    }
  }

  unInstallPlayer = () => {
    this.unBindEvents(this.audio, undefined, false)
    this.unBindUnhandledRejection()
    this.unBindKeyDownEvents()
    this.removeMobileListener()
    this.removeLyric()
    this._onDestroyed()
  }

  // eslint-disable-next-line camelcase
  UNSAFE_componentWillReceiveProps(nextProps) {
    const {
      audioLists,
      playIndex,
      theme,
      mode,
      playMode,
      clearPriorAudioLists,
    } = nextProps
    if (!arrayEqual(audioLists)(this.props.audioLists)) {
      if (clearPriorAudioLists) {
        this.changeAudioLists(nextProps)
      } else {
        this.updateAudioLists(audioLists)
      }
      this.initPlayer(audioLists, false)
    }
    this.updatePlayIndex(playIndex)
    this.updateTheme(theme)
    this.updateMode(mode)
    this.updatePlayMode(playMode)
  }

  // eslint-disable-next-line camelcase
  UNSAFE_componentWillMount() {
    const { audioLists, remember } = this.props

    if (Array.isArray(audioLists) && audioLists.length >= 1) {
      const playInfo = this.getPlayInfo(audioLists)
      const lastPlayStatus = remember ? this.getLastPlayStatus() : {}

      switch (typeof playInfo.musicSrc) {
        case 'function':
          playInfo.musicSrc().then((val) => {
            this.setState({
              ...playInfo,
              musicSrc: val,
              ...lastPlayStatus,
            })
          }, this.onAudioError)
          break
        default:
          this.setState({
            ...playInfo,
            ...lastPlayStatus,
          })
      }
    }
  }

  componentWillUnmount() {
    this.unInstallPlayer()
  }

  componentDidMount() {
    this.addMobileListener()
    this.addSystemThemeListener()
    this.initPlayer()
    this.onGetAudioInstance()
  }
}
