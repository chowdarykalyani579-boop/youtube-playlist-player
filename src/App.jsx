import { useMemo, useState } from 'react';

const API_KEY = import.meta.env.VITE_YOUTUBE_API_KEY;

function App() {
  const [searchTerm, setSearchTerm] = useState('React tutorials');
  const [playlistUrl, setPlaylistUrl] = useState('');
  const [videos, setVideos] = useState([]);
  const [playlists, setPlaylists] = useState([]);
  const [activeVideo, setActiveVideo] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [searchMode, setSearchMode] = useState('videos');
  const [selectedPlaylist, setSelectedPlaylist] = useState(null);
  const [showSidebar, setShowSidebar] = useState(true);

  const hasApiKey = Boolean(API_KEY);

  const canLoadSearch = useMemo(() => {
    return hasApiKey && searchTerm.trim().length > 0;
  }, [hasApiKey, searchTerm]);

  const buildVideoMap = (items) => {
    return items
      .filter((item) => item?.id?.videoId || item?.snippet?.resourceId?.videoId)
      .map((item) => ({
        id: item.id?.videoId || item.snippet?.resourceId?.videoId,
        title: item.snippet?.title || 'Untitled video',
        description: item.snippet?.description || 'No description available.',
        channelTitle: item.snippet?.channelTitle || 'YouTube',
        thumbnail: item.snippet?.thumbnails?.high?.url || item.snippet?.thumbnails?.medium?.url,
      }));
  };

  const buildPlaylistMap = (items) => {
    return items
      .filter((item) => item?.id?.playlistId)
      .map((item) => ({
        id: item.id.playlistId,
        title: item.snippet?.title || 'Untitled playlist',
        description: item.snippet?.description || 'No description available.',
        channelTitle: item.snippet?.channelTitle || 'YouTube',
        thumbnail: item.snippet?.thumbnails?.high?.url || item.snippet?.thumbnails?.medium?.url,
        videoCount: 'Multiple videos',
      }));
  };

  const handleSearch = async () => {
    if (!canLoadSearch) {
      setError('Please add your YouTube Data API key in the .env file before searching.');
      return;
    }

    setLoading(true);
    setError('');
    setSearchMode('videos');
    setSelectedPlaylist(null);

    try {
      const videoResponse = await fetch(
        `https://www.googleapis.com/youtube/v3/search?part=snippet&maxResults=15&type=video&q=${encodeURIComponent(
          searchTerm
        )}&key=${API_KEY}`
      );

      if (!videoResponse.ok) {
        throw new Error('Failed to fetch videos from YouTube.');
      }

      const videoData = await videoResponse.json();
      const videoResults = buildVideoMap(videoData.items || []);

      if (videoResults.length > 0) {
        setVideos(videoResults);
        setActiveVideo(videoResults[0]);
        setError('');
      } else {
        await searchForPlaylists();
      }
    } catch (err) {
      try {
        await searchForPlaylists();
      } catch (playlistErr) {
        setError('Unable to find videos or playlists for this topic. Try another search.');
      }
    } finally {
      setLoading(false);
    }
  };

  const searchForPlaylists = async () => {
    try {
      const playlistResponse = await fetch(
        `https://www.googleapis.com/youtube/v3/search?part=snippet&maxResults=12&type=playlist&q=${encodeURIComponent(
          searchTerm
        )}&key=${API_KEY}`
      );

      if (!playlistResponse.ok) {
        throw new Error('Failed to fetch playlists from YouTube.');
      }

      const playlistData = await playlistResponse.json();
      const playlistResults = buildPlaylistMap(playlistData.items || []);

      if (playlistResults.length > 0) {
        setPlaylists(playlistResults);
        setVideos([]);
        setActiveVideo(null);
        setSearchMode('playlists');
        setError(
          `No videos found. Found ${playlistResults.length} playlists for "${searchTerm}". Click one to load it!`
        );
      } else {
        setError(`No videos or playlists found for "${searchTerm}". Try a different search term.`);
      }
    } catch (err) {
      throw err;
    }
  };

  const handlePlaylistSelect = async (playlist) => {
    setSelectedPlaylist(playlist);
    setLoading(true);
    setError('');

    try {
      const response = await fetch(
        `https://www.googleapis.com/youtube/v3/playlistItems?part=snippet&maxResults=25&playlistId=${playlist.id}&key=${API_KEY}`
      );

      if (!response.ok) {
        throw new Error('Unable to load this playlist. Try another one.');
      }

      const data = await response.json();
      const playlistVideos = (data.items || []).map((item) => ({
        id: item.snippet?.resourceId?.videoId || item.snippet?.thumbnails?.default?.url,
        title: item.snippet?.title || 'Untitled video',
        description: item.snippet?.description || 'No description available.',
        channelTitle: item.snippet?.channelTitle || 'YouTube',
        thumbnail: item.snippet?.thumbnails?.high?.url || item.snippet?.thumbnails?.medium?.url,
      }));

      const validVideos = playlistVideos.filter(
        (video) => video.id && video.title !== 'Private video'
      );

      setVideos(validVideos);
      setSearchMode('videos');

      if (validVideos.length > 0) {
        setActiveVideo(validVideos[0]);
        setError('');
      } else {
        setActiveVideo(null);
        setError('This playlist does not contain any playable videos.');
      }
    } catch (err) {
      setError(err.message || 'Something went wrong while loading the playlist.');
    } finally {
      setLoading(false);
    }
  };

  const handlePlaylistLoad = async () => {
    if (!hasApiKey) {
      setError('Please add your YouTube Data API key in the .env file before loading a playlist.');
      return;
    }

    const playlistId = extractPlaylistId(playlistUrl);

    if (!playlistId) {
      setError('Please enter a valid YouTube playlist URL or ID.');
      return;
    }

    setLoading(true);
    setError('');
    setSearchMode('videos');
    setSelectedPlaylist(null);

    try {
      const response = await fetch(
        `https://www.googleapis.com/youtube/v3/playlistItems?part=snippet&maxResults=25&playlistId=${playlistId}&key=${API_KEY}`
      );

      if (!response.ok) {
        throw new Error('Unable to load this playlist. Check the link and try again.');
      }

      const data = await response.json();
      const playlistVideos = (data.items || []).map((item) => ({
        id: item.snippet?.resourceId?.videoId || item.snippet?.thumbnails?.default?.url,
        title: item.snippet?.title || 'Untitled video',
        description: item.snippet?.description || 'No description available.',
        channelTitle: item.snippet?.channelTitle || 'YouTube',
        thumbnail: item.snippet?.thumbnails?.high?.url || item.snippet?.thumbnails?.medium?.url,
      }));

      setVideos(playlistVideos.filter((video) => video.id && video.id !== 'Private video'));

      if (playlistVideos.length > 0) {
        setActiveVideo(playlistVideos[0]);
      } else {
        setActiveVideo(null);
        setError('This playlist does not contain any playable videos.');
      }
    } catch (err) {
      setError(err.message || 'Something went wrong while loading the playlist.');
    } finally {
      setLoading(false);
    }
  };

  const handleKeyPress = (event) => {
    if (event.key === 'Enter') {
      handleSearch();
    }
  };

  return (
    <div className="app-dashboard">
      {/* Header */}
      <header className="dashboard-header">
        <div className="header-content">
          <div className="header-brand">
            <h1>▶ PlayTube</h1>
            <p>Ad-Free YouTube Playlist Player</p>
          </div>
          <button 
            className="sidebar-toggle"
            onClick={() => setShowSidebar(!showSidebar)}
          >
            ☰
          </button>
        </div>
      </header>

      <div className="dashboard-container">
        {/* Main Content */}
        <main className="main-content">
          {/* Search & Load Section */}
          <div className="search-section card">
            <h2>🔍 Search Videos or Load Playlists</h2>
            
            <div className="search-group">
              <div className="input-wrapper">
                <label htmlFor="search-input">Search by Topic</label>
                <input
                  id="search-input"
                  type="text"
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  onKeyDown={handleKeyPress}
                  placeholder="e.g., JavaScript, Python, Music, Cooking..."
                />
              </div>
              <button 
                className="btn-primary" 
                onClick={handleSearch} 
                disabled={loading || !canLoadSearch}
              >
                {loading ? '⏳ Searching...' : '🔍 Search'}
              </button>
            </div>

            <div className="divider">OR</div>

            <div className="search-group">
              <div className="input-wrapper">
                <label htmlFor="playlist-input">Paste Playlist Link</label>
                <input
                  id="playlist-input"
                  type="text"
                  value={playlistUrl}
                  onChange={(e) => setPlaylistUrl(e.target.value)}
                  placeholder="https://youtube.com/playlist?list=PLxxxx..."
                />
              </div>
              <button 
                className="btn-secondary" 
                onClick={handlePlaylistLoad} 
                disabled={loading || !hasApiKey}
              >
                {loading ? '⏳ Loading...' : '📋 Load'}
              </button>
            </div>

            {!hasApiKey && (
              <div className="alert alert-info">
                ⚠️ <strong>Setup Required:</strong> Add your YouTube API key to <code>.env</code> file to enable search.
              </div>
            )}

            {error && (
              <div className="alert alert-success">
                ℹ️ {error}
              </div>
            )}
          </div>

          {/* Video Player Section */}
          <div className="player-section card">
            {activeVideo ? (
              <>
                <div className="video-container">
                  <iframe
                    src={`https://www.youtube.com/embed/${activeVideo.id}?modestbranding=1&rel=0`}
                    title={activeVideo.title}
                    allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                    allowFullScreen
                  />
                </div>
                <div className="video-info">
                  <h2>{activeVideo.title}</h2>
                  <p className="channel-name">📺 {activeVideo.channelTitle}</p>
                  <p className="description">{activeVideo.description}</p>
                </div>
              </>
            ) : (
              <div className="empty-player">
                <div className="empty-icon">🎬</div>
                <h3>No Video Selected</h3>
                <p>Search for a topic or load a playlist to get started!</p>
              </div>
            )}
          </div>
        </main>

        {/* Sidebar - Playlist */}
        <aside className={`sidebar ${showSidebar ? 'open' : 'closed'}`}>
          <div className="playlist-section card">
            <div className="playlist-header">
              <h3>📋 Playlist</h3>
              <span className="count-badge">
                {searchMode === 'videos' ? videos.length : playlists.length}
              </span>
            </div>

            <div className="playlist-scroll">
              {searchMode === 'videos' ? (
                <>
                  {videos.length > 0 ? (
                    videos.map((video, index) => (
                      <button
                        key={`${video.id}-${index}`}
                        className={`playlist-card ${
                          activeVideo?.id === video.id ? 'active' : ''
                        }`}
                        onClick={() => setActiveVideo(video)}
                      >
                        <img src={video.thumbnail} alt={video.title} />
                        <div className="card-info">
                          <strong>{video.title}</strong>
                          <span>{video.channelTitle}</span>
                        </div>
                      </button>
                    ))
                  ) : (
                    <div className="empty-playlist">No videos yet</div>
                  )}
                </>
              ) : (
                <>
                  {playlists.length > 0 ? (
                    playlists.map((playlist, index) => (
                      <button
                        key={`${playlist.id}-${index}`}
                        className={`playlist-card ${
                          selectedPlaylist?.id === playlist.id ? 'active' : ''
                        }`}
                        onClick={() => handlePlaylistSelect(playlist)}
                      >
                        <img src={playlist.thumbnail} alt={playlist.title} />
                        <div className="card-info">
                          <strong>{playlist.title}</strong>
                          <span className="playlist-tag">📂 Playlist</span>
                          <span>{playlist.channelTitle}</span>
                        </div>
                      </button>
                    ))
                  ) : (
                    <div className="empty-playlist">No playlists found</div>
                  )}
                </>
              )}
            </div>
          </div>
        </aside>
      </div>

      {/* Footer */}
      <footer className="dashboard-footer">
        <p>🎵 Ad-Free YouTube Playlist Player | Open Source</p>
      </footer>
    </div>
  );
}

function extractPlaylistId(value) {
  if (!value) return '';

  const trimmed = value.trim();

  if (trimmed.includes('list=')) {
    const match = trimmed.match(/[?&]list=([^&]+)/);
    return match ? match[1] : '';
  }

  if (/^[A-Za-z0-9_-]{10,}$/.test(trimmed)) {
    return trimmed;
  }

  return '';
}

export default App;
