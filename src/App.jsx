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
  const [searchMode, setSearchMode] = useState('videos'); // 'videos' or 'playlists'
  const [selectedPlaylist, setSelectedPlaylist] = useState(null);

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
        videoCount: Math.floor(Math.random() * 100) + 5, // Placeholder count
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
      // First, search for videos
      const videoResponse = await fetch(
        `https://www.googleapis.com/youtube/v3/search?part=snippet&maxResults=12&type=video&q=${encodeURIComponent(
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
        setSearchMode('videos');
        setError('');
      } else {
        // If no videos found, search for playlists instead
        await searchForPlaylists();
      }
    } catch (err) {
      setError(err.message || 'Something went wrong while searching videos.');
      // Try to search for playlists as fallback
      try {
        await searchForPlaylists();
      } catch (playlistErr) {
        setError(err.message || 'Unable to find videos or playlists for this topic.');
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
          `No single videos found for "${searchTerm}". Found ${playlistResults.length} playlists instead. Click one to load it.`
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
        `https://www.googleapis.com/youtube/v3/playlistItems?part=snippet&maxResults=20&playlistId=${playlist.id}&key=${API_KEY}`
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
        `https://www.googleapis.com/youtube/v3/playlistItems?part=snippet&maxResults=20&playlistId=${playlistId}&key=${API_KEY}`
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
    <div className="app-shell">
      <div className="topbar">
        <div>
          <p className="eyebrow">Entertainment</p>
          <h1>YouTube Playlist Player</h1>
        </div>
      </div>

      <div className="controls-panel card">
        <div className="search-row">
          <div className="input-wrap wide">
            <label htmlFor="search-topic">Search topic</label>
            <input
              id="search-topic"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              onKeyDown={handleKeyPress}
              placeholder="Search for videos or a topic"
            />
          </div>

          <button className="primary-button" onClick={handleSearch} disabled={loading || !canLoadSearch}>
            {loading ? 'Searching...' : 'Search'}
          </button>
        </div>

        <div className="playlist-row">
          <div className="input-wrap wide">
            <label htmlFor="playlist-url">YouTube playlist link</label>
            <input
              id="playlist-url"
              value={playlistUrl}
              onChange={(e) => setPlaylistUrl(e.target.value)}
              placeholder="Paste a YouTube playlist URL"
            />
          </div>

          <button className="secondary-button" onClick={handlePlaylistLoad} disabled={loading || !hasApiKey}>
            Load Playlist
          </button>
        </div>

        {!hasApiKey && (
          <div className="notice-box">
            Add your <code>VITE_YOUTUBE_API_KEY</code> in the <code>.env</code> file to enable live search and playlist loading.
          </div>
        )}

        {error && <div className="error-box">{error}</div>}
      </div>

      <div className="content-grid">
        <section className="video-panel card">
          {activeVideo ? (
            <>
              <div className="video-wrapper">
                <iframe
                  src={`https://www.youtube.com/embed/${activeVideo.id}?autoplay=1`}
                  title={activeVideo.title}
                  allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                  allowFullScreen
                />
              </div>

              <div className="video-meta">
                <h2>{activeVideo.title}</h2>
                <p>{activeVideo.channelTitle}</p>
                <p>{activeVideo.description}</p>
              </div>
            </>
          ) : (
            <div className="empty-state">
              <h2>Pick a topic or playlist</h2>
              <p>Your selected video will appear here.</p>
            </div>
          )}
        </section>

        <aside className="playlist-panel card">
          {searchMode === 'videos' ? (
            <>
              <div className="playlist-header">
                <h3>Videos</h3>
                <span>{videos.length} items</span>
              </div>

              <div className="playlist-list">
                {videos.length > 0 ? (
                  videos.map((video, index) => (
                    <button
                      key={`${video.id}-${index}`}
                      className={`playlist-item ${activeVideo?.id === video.id ? 'active' : ''}`}
                      onClick={() => setActiveVideo(video)}
                    >
                      <img src={video.thumbnail} alt={video.title} />
                      <div className="playlist-item-copy">
                        <strong>{video.title}</strong>
                        <span>{video.channelTitle}</span>
                      </div>
                    </button>
                  ))
                ) : (
                  <div className="empty-playlist">No videos loaded yet.</div>
                )}
              </div>
            </>
          ) : (
            <>
              <div className="playlist-header">
                <h3>Playlists</h3>
                <span>{playlists.length} found</span>
              </div>

              <div className="playlist-list">
                {playlists.length > 0 ? (
                  playlists.map((playlist, index) => (
                    <button
                      key={`${playlist.id}-${index}`}
                      className={`playlist-item ${selectedPlaylist?.id === playlist.id ? 'active' : ''}`}
                      onClick={() => handlePlaylistSelect(playlist)}
                    >
                      <img src={playlist.thumbnail} alt={playlist.title} />
                      <div className="playlist-item-copy">
                        <strong>{playlist.title}</strong>
                        <span className="playlist-count">📋 Playlist</span>
                        <span>{playlist.channelTitle}</span>
                      </div>
                    </button>
                  ))
                ) : (
                  <div className="empty-playlist">No playlists found.</div>
                )}
              </div>
            </>
          )}
        </aside>
      </div>
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
